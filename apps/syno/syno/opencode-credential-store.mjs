import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

class OpenCodeCredentialStore {
  constructor({ root = PATHS.credentialsRoot, protect = (value) => runDpapi("protect", value), unprotect = (value) => runDpapi("unprotect", value), clock = () => new Date() } = {}) {
    this.metadataFile = path.join(root, "opencode.json");
    this.tokenFile = path.join(root, "opencode-token.dpapi");
    this.protect = protect;
    this.unprotect = unprotect;
    this.clock = clock;
  }

  async save(token) {
    const normalized = String(token || "").trim();
    if (!normalized) throw new Error("OpenCode Zen Token 不能为空");
    await atomicWrite(this.tokenFile, await this.protect(normalized));
    await atomicWrite(this.metadataFile, JSON.stringify({ version: 1, provider: "opencode", updatedAt: this.clock().toISOString() }, null, 2));
    return this.status();
  }

  async loadToken() {
    return this.unprotect(await fs.readFile(this.tokenFile, "utf8"));
  }

  async status() {
    try {
      const metadata = JSON.parse(await fs.readFile(this.metadataFile, "utf8"));
      await fs.access(this.tokenFile);
      return { configured: true, provider: "opencode", updatedAt: metadata.updatedAt };
    } catch {
      return { configured: false, provider: "opencode" };
    }
  }
}

export { OpenCodeCredentialStore };
