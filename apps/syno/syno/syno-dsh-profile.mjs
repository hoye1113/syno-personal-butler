import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const DEFAULT_DSH_WEB_PORT = 3088;
const SYNO_PROFILE_NAME = "syno";
const SYNO_LAB_PROFILE_NAME = "syno-lab";
const PRODUCTION_BUNDLES = Object.freeze([
  "@deepseek-ai/dsh-base",
  "@deepseek-ai/dsh-web-app",
  "@syno/dsh-plugin",
]);
const LAB_BUNDLES = Object.freeze([
  "@deepseek-ai/dsh-base",
  "@deepseek-ai/dsh-web-app",
]);

function fileDependency(directory) {
  return `file:${path.resolve(directory).replaceAll("\\", "/")}`;
}

function productionProfileManifest({ pluginDir }) {
  return {
    name: "syno-dsh-profile",
    private: true,
    dsh: {
      profile: {
        bundles: [...PRODUCTION_BUNDLES],
        allowMarketplaceAdd: false,
      },
    },
    dependencies: {
      "@syno/dsh-plugin": fileDependency(pluginDir),
    },
  };
}

function labProfileManifest() {
  return {
    name: "syno-lab-dsh-profile",
    private: true,
    dsh: {
      profile: {
        bundles: [...LAB_BUNDLES],
        allowMarketplaceAdd: true,
      },
    },
  };
}

const PRODUCTION_PATCH = `# Host-generated production overlay.
# Do not run \`dsh plugin add\` against this profile. Marketplace memory/search
# plugins are forbidden. Vault writes stay on syno_* → Policy → GitGuard.
- id: system-prompt
  config:
    persona: !!js process.env.DSH_SYSTEM_PROMPT ?? 'You are Syno.'
`;

const LAB_PATCH = `# Experimental DSH Web profile. No Syno Tool Bridge, no vault write, no WeChat.
# Marketplace UI plugins may be added here; they cannot reach production Host.
- id: system-prompt
  config:
    persona: You are an experimental DSH Web session with no Syno production tools.
`;

async function linkPackage(profileDir, packageName, targetDir) {
  const scoped = packageName.startsWith("@") ? packageName.split("/") : [packageName];
  const destRoot = path.join(profileDir, "node_modules", ...scoped.slice(0, -1));
  const dest = path.join(destRoot, scoped.at(-1));
  await fs.mkdir(destRoot, { recursive: true });
  await fs.rm(dest, { recursive: true, force: true });
  const type = process.platform === "win32" ? "junction" : "dir";
  await fs.symlink(path.resolve(targetDir), dest, type);
}

async function writeProfile(directory, manifest, patch) {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(directory, "cordis.patch.yml"), patch, "utf8");
}

async function ensureSynoDshProfiles({
  homeRoot,
  repoRoot,
  pluginDir = path.join(repoRoot, "packages", "syno-dsh-plugin"),
} = {}) {
  if (!homeRoot || !repoRoot) throw new Error("ensureSynoDshProfiles 需要 homeRoot 与 repoRoot");
  const profilesRoot = path.join(homeRoot, "profiles");
  const synoDir = path.join(profilesRoot, SYNO_PROFILE_NAME);
  const labDir = path.join(profilesRoot, SYNO_LAB_PROFILE_NAME);
  await writeProfile(synoDir, productionProfileManifest({ pluginDir }), PRODUCTION_PATCH);
  await linkPackage(synoDir, "@syno/dsh-plugin", pluginDir);
  await writeProfile(labDir, labProfileManifest(), LAB_PATCH);
  return { synoDir, labDir, profilesRoot };
}

function resolveProfilePackage(profileDir, packageName) {
  return createRequire(path.join(profileDir, "package.json")).resolve(packageName);
}

export {
  DEFAULT_DSH_WEB_PORT,
  LAB_BUNDLES,
  PRODUCTION_BUNDLES,
  SYNO_LAB_PROFILE_NAME,
  SYNO_PROFILE_NAME,
  ensureSynoDshProfiles,
  labProfileManifest,
  productionProfileManifest,
  resolveProfilePackage,
};
