import path from "node:path";

function isMocPath(value) {
  const normalized = String(value || "").replace(/\\/g, "/");
  return /^MOC\s*-/i.test(path.posix.basename(normalized, ".md"));
}

export { isMocPath };
