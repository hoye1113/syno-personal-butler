import { randomUUID } from "node:crypto";
import path from "node:path";

import { isImageMime } from "./image-mime.mjs";

const DEFAULT_MAX_ENTRIES = 32;

function visionError(code, message, { retryable = false } = {}) {
  return Object.assign(new Error(message), { code, retryable });
}

function insideRoot(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolved);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

class IsolatedImageStore {
  constructor({ quarantineRoots = [], maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
    this.quarantineRoots = (quarantineRoots.length ? quarantineRoots : []).map((root) => path.resolve(root));
    this.maxEntries = Math.max(1, Number(maxEntries) || DEFAULT_MAX_ENTRIES);
    this.byId = new Map();
  }

  register(artifact) {
    if (!artifact || artifact.rejected === true || artifact.isolated !== true || artifact.autoRead !== false) {
      throw visionError("VISION_INVALID_IMAGE", artifact?.reason || "图片没有通过隔离校验");
    }
    if (!isImageMime(artifact.mime)) {
      throw visionError("VISION_INVALID_IMAGE", `不是可识图片：${artifact.mime || "未知"}`);
    }
    const file = this.#resolve(artifact.path);
    const artifactId = String(artifact.artifactId || `img-${randomUUID().replaceAll("-", "").slice(0, 16)}`);
    const record = {
      artifactId,
      path: file,
      mime: String(artifact.mime).toLowerCase(),
      size: Number.isFinite(Number(artifact.size)) ? Number(artifact.size) : null,
    };
    if (this.byId.has(artifactId)) this.byId.delete(artifactId);
    this.byId.set(artifactId, record);
    this.#evict();
    return record;
  }

  get(artifactId) {
    const record = this.byId.get(String(artifactId || ""));
    if (!record) throw visionError("VISION_UNKNOWN_ARTIFACT", "图片不在隔离区或会话已过期");
    return record;
  }

  #evict() {
    while (this.byId.size > this.maxEntries) {
      const oldest = this.byId.keys().next().value;
      this.byId.delete(oldest);
    }
  }

  #resolve(candidate) {
    const resolved = path.resolve(candidate);
    if (!this.quarantineRoots.length) {
      throw visionError("PATH_OUTSIDE_ROOT", "识图隔离根未配置");
    }
    if (!this.quarantineRoots.some((root) => insideRoot(root, resolved))) {
      throw visionError("PATH_OUTSIDE_ROOT", "图片路径超出隔离区");
    }
    return resolved;
  }
}

export { DEFAULT_MAX_ENTRIES, IsolatedImageStore };
