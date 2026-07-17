import { promises as fs } from "node:fs";
import path from "node:path";

async function walkRecords(root, extension = ".md") {
  const files = [];
  async function walk(directory) {
    let entries = [];
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith(extension)) files.push(file);
    }
  }
  await walk(root);
  return files.sort();
}

export { walkRecords };
