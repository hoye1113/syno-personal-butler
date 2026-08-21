import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const DEFAULT_DSH_WEB_PORT = 3088;
const SYNO_PROFILE_NAME = "syno";
const SYNO_LAB_PROFILE_NAME = "syno-lab";
const SYNO_AGENT_PRESET_NAME = "syno";
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

const PROFILE_DEPENDENCY_SECTIONS = Object.freeze([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
]);

function withoutSynoPlugin(dependencies) {
  const result = { ...(dependencies || {}) };
  delete result["@syno/dsh-plugin"];
  return result;
}

function uniqueBundles(bundles) {
  return [...new Set((bundles || []).filter((bundle) => bundle && bundle !== "@syno/dsh-plugin"))];
}

function labProfileManifest({ existingManifest = null } = {}) {
  const existing = existingManifest && typeof existingManifest === "object" ? existingManifest : {};
  const existingDsh = existing.dsh && typeof existing.dsh === "object" ? existing.dsh : {};
  const existingProfile = existingDsh.profile && typeof existingDsh.profile === "object" ? existingDsh.profile : {};
  const dependencies = Object.fromEntries(PROFILE_DEPENDENCY_SECTIONS.map((section) => [
    section,
    withoutSynoPlugin(existing[section]),
  ]));
  return {
    ...existing,
    name: "syno-lab-dsh-profile",
    private: true,
    dsh: {
      ...existingDsh,
      profile: {
        ...existingProfile,
        bundles: uniqueBundles([...LAB_BUNDLES, ...(Array.isArray(existingProfile.bundles) ? existingProfile.bundles : [])]),
        allowMarketplaceAdd: true,
      },
    },
    ...dependencies,
  };
}

const PRODUCTION_PATCH = `# Host-generated production overlay.
# Do not run \`dsh plugin add\` against this profile. Marketplace memory/search
# plugins are forbidden. Vault writes stay on syno_* → Policy → GitGuard.
- id: agent-presets
  config:
    default: syno
    includeUserRoot: true

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

async function writeSynoAgentPreset(homeRoot, repoRoot) {
  const presetDir = path.join(homeRoot, ".agent-presets", SYNO_AGENT_PRESET_NAME);
  const source = path.join(repoRoot, "config", "deepseek-harness", "syno-agent-preset.cordis.yml");
  await fs.mkdir(presetDir, { recursive: true });
  await fs.copyFile(source, path.join(presetDir, "agent.cordis.yml"));
  await fs.writeFile(path.join(presetDir, "preset.yml"), [
    "name: Syno production",
    "description: Syno domain agent with the controlled production tool surface.",
    "order: 0",
    "",
  ].join("\n"), "utf8");
  return { presetDir, presetPath: path.join(presetDir, "agent.cordis.yml") };
}

async function readExistingManifest(directory) {
  try {
    return JSON.parse(await fs.readFile(path.join(directory, "package.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
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
  const agentPreset = await writeSynoAgentPreset(homeRoot, repoRoot);
  await writeProfile(synoDir, productionProfileManifest({ pluginDir }), PRODUCTION_PATCH);
  await linkPackage(synoDir, "@syno/dsh-plugin", pluginDir);
  const existingLabManifest = await readExistingManifest(labDir);
  await writeProfile(labDir, labProfileManifest({ existingManifest: existingLabManifest }), LAB_PATCH);
  return { synoDir, labDir, profilesRoot, agentPreset };
}

function resolveProfilePackage(profileDir, packageName) {
  return createRequire(path.join(profileDir, "package.json")).resolve(packageName);
}

export {
  DEFAULT_DSH_WEB_PORT,
  LAB_BUNDLES,
  PRODUCTION_BUNDLES,
  SYNO_AGENT_PRESET_NAME,
  SYNO_LAB_PROFILE_NAME,
  SYNO_PROFILE_NAME,
  ensureSynoDshProfiles,
  labProfileManifest,
  productionProfileManifest,
  resolveProfilePackage,
};
