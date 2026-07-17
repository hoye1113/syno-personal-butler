import path from "node:path";

import { PATHS } from "../apps/syno/syno/paths.mjs";
import { backupState, restoreState, verifyArchive } from "../apps/syno/syno/state-archive.mjs";

const [command, rawPath] = process.argv.slice(2);
if (!command || !rawPath || !["backup", "verify", "restore"].includes(command)) {
  console.error("用法：node scripts/state-archive.mjs <backup|verify|restore> <绝对归档目录>");
  process.exit(2);
}
const archiveRoot = path.resolve(rawPath);
if (!path.isAbsolute(rawPath)) throw new Error("归档目录必须是绝对路径");

if (command === "backup") console.log(JSON.stringify(await backupState({ sourceRoot: PATHS.stateRoot, archiveRoot }), null, 2));
if (command === "verify") console.log(JSON.stringify(await verifyArchive(archiveRoot), null, 2));
if (command === "restore") console.log(JSON.stringify(await restoreState({ archiveRoot, targetRoot: PATHS.stateRoot }), null, 2));
