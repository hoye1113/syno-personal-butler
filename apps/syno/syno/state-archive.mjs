import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ARCHIVE_VERSION = 1;

function assertDistinct(source, target) {
  const relative = path.relative(path.resolve(source), path.resolve(target));
  if (!relative || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error("备份目标不能位于状态源目录内");
  }
}

async function filesUnder(root, directory = root) {
  const result = [];
  let entries = [];
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return result; throw error; }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(root, absolute));
    else if (entry.isFile()) result.push(path.relative(root, absolute).replace(/\\/g, "/"));
  }
  return result.sort();
}

async function digest(file) {
  return createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function backupState({ sourceRoot, archiveRoot, clock = () => new Date() }) {
  assertDistinct(sourceRoot, archiveRoot);
  const entries = [];
  for (const relative of await filesUnder(sourceRoot)) {
    const source = path.join(sourceRoot, relative);
    const target = path.join(archiveRoot, "state", relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
    entries.push({ path: relative, sha256: await digest(source), bytes: (await fs.stat(source)).size });
  }
  const manifest = {
    format: "syno-state-archive", version: ARCHIVE_VERSION,
    createdAt: clock().toISOString(), credentialsIncluded: false, entries,
  };
  await fs.mkdir(archiveRoot, { recursive: true });
  await fs.writeFile(path.join(archiveRoot, "manifest.json"), JSON.stringify(manifest, null, 2), { encoding: "utf8", flag: "wx" });
  return manifest;
}

async function verifyArchive(archiveRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(archiveRoot, "manifest.json"), "utf8"));
  if (manifest.format !== "syno-state-archive" || manifest.version !== ARCHIVE_VERSION || manifest.credentialsIncluded !== false) {
    throw new Error("不支持或不安全的状态归档");
  }
  for (const entry of manifest.entries || []) {
    const file = path.resolve(archiveRoot, "state", entry.path);
    const stateRoot = path.resolve(archiveRoot, "state");
    const relative = path.relative(stateRoot, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("归档包含越界路径");
    if (await digest(file) !== entry.sha256) throw new Error(`状态归档校验失败：${entry.path}`);
  }
  return manifest;
}

async function restoreState({ archiveRoot, targetRoot }) {
  assertDistinct(archiveRoot, targetRoot);
  const manifest = await verifyArchive(archiveRoot);
  const existing = await filesUnder(targetRoot);
  if (existing.length) throw new Error("恢复目标必须为空，避免覆盖现有 Syno 状态");
  for (const entry of manifest.entries) {
    const source = path.join(archiveRoot, "state", entry.path);
    const target = path.join(targetRoot, entry.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
  }
  return { restored: manifest.entries.length, version: manifest.version };
}

export { ARCHIVE_VERSION, backupState, restoreState, verifyArchive };
