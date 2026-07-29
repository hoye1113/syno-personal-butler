import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";

const CHUNK_ALGORITHM_VERSION = "paragraph-v1";
const ANALYSIS_CONTRACT_VERSION = "capture-analysis-v1";
const PROMPT_VERSION = "capture-prompt-v1";
const ANALYSIS_POLICY_VERSION = "capture-policy-v1";
const CHUNK_STATES = Object.freeze(["pending", "running", "completed", "failed_retryable", "failed_terminal", "invalidated"]);

function digest(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function stableEncode(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableEncode).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableEncode(value[key])}`).join(",")}}`;
}

function safeWorkflowId(value) {
  const id = String(value || "");
  if (!/^workflow-[a-zA-Z0-9-]+$/.test(id)) throw Object.assign(new Error("Workflow ID 无效"), { code: "INGEST_WORKFLOW_ID_INVALID" });
  return id;
}

function chunkIdentity({ sourceHash, chunkHash, index, total, chunkAlgorithmVersion = CHUNK_ALGORITHM_VERSION, analysisContractVersion = ANALYSIS_CONTRACT_VERSION, promptVersion = PROMPT_VERSION, canonicalRulesDigest = "", analysisPolicyVersion = ANALYSIS_POLICY_VERSION } = {}) {
  return digest(stableEncode({
    sourceHash,
    chunkHash,
    index,
    total,
    chunkAlgorithmVersion,
    analysisContractVersion,
    promptVersion,
    canonicalRulesDigest,
    analysisPolicyVersion,
  }));
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
}

class CaptureChunkStore {
  constructor({ root = path.join(PATHS.stateRoot, "capture-chunks"), clock = () => new Date(), processLock } = {}) {
    this.root = root;
    this.clock = clock;
    this.processLock = processLock || new ProcessFileLock({ file: `${root}.lock`, timeoutMs: 120_000 });
    this.tails = new Map();
  }

  #file(manifestId) {
    return path.join(this.root, `${manifestId}.json`);
  }

  async #read(manifestId) {
    try {
      return JSON.parse(await fs.readFile(this.#file(manifestId), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async list({ workflowId } = {}) {
    const prefix = `${safeWorkflowId(workflowId)}-`;
    let entries;
    try {
      entries = await fs.readdir(this.root, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
    const result = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.startsWith(prefix) || !entry.name.endsWith(".json")) continue;
      const value = await this.#read(entry.name.slice(0, -5));
      if (value) result.push(value);
    }
    return result.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
  }

  async ensure({ workflowId, sourceHash, chunks, canonicalRulesDigest = "", analysisContractVersion = ANALYSIS_CONTRACT_VERSION, promptVersion = PROMPT_VERSION, chunkAlgorithmVersion = CHUNK_ALGORITHM_VERSION, analysisPolicyVersion = ANALYSIS_POLICY_VERSION, priority = "background" } = {}) {
    const id = safeWorkflowId(workflowId);
    if (!Array.isArray(chunks) || !chunks.length) throw Object.assign(new Error("Capture Chunk 不能为空"), { code: "CAPTURE_CHUNKS_EMPTY" });
    const records = chunks.map((text, index) => {
      const chunkHash = digest(text);
      const identity = chunkIdentity({ sourceHash, chunkHash, index: index + 1, total: chunks.length, chunkAlgorithmVersion, analysisContractVersion, promptVersion, canonicalRulesDigest, analysisPolicyVersion });
      return {
        chunkId: `chunk-${identity.slice(0, 24)}`,
        index: index + 1,
        total: chunks.length,
        chunkHash,
        textLength: String(text).length,
        identity,
        status: "pending",
        attempts: 0,
        nextAttemptAt: null,
        claim: null,
        createdAt: this.clock().toISOString(),
        updatedAt: this.clock().toISOString(),
      };
    });
    const manifestDigest = digest(stableEncode({ id, sourceHash, records: records.map(({ chunkId, identity }) => ({ chunkId, identity })), canonicalRulesDigest, analysisContractVersion, promptVersion, chunkAlgorithmVersion, analysisPolicyVersion }));
    const manifestId = `${id}-${manifestDigest.slice(0, 24)}`;
    return this.#serialized(manifestId, () => this.processLock.run(async () => {
      const existing = await this.#read(manifestId);
      if (existing) return existing;
      const prior = await this.list({ workflowId: id });
      for (const old of prior) {
        if (old.manifestId === manifestId) continue;
        if (old.chunks.some((chunk) => ["completed", "running", "failed_retryable"].includes(chunk.status))) {
          old.chunks = old.chunks.map((chunk) => ({ ...chunk, status: chunk.status === "completed" ? "invalidated" : chunk.status, updatedAt: this.clock().toISOString() }));
          old.status = "invalidated";
          old.updatedAt = this.clock().toISOString();
          await atomicJson(this.#file(old.manifestId), old);
        }
      }
      const now = this.clock().toISOString();
      const manifest = {
        version: 1,
        manifestId,
        workflowId: id,
        sourceHash,
        chunkAlgorithmVersion,
        analysisContractVersion,
        promptVersion,
        canonicalRulesDigest,
        analysisPolicyVersion,
        priority,
        status: "pending",
        chunks: records,
        createdAt: now,
        updatedAt: now,
      };
      await atomicJson(this.#file(manifestId), manifest);
      return manifest;
    }));
  }

  async get(manifestId) {
    return this.#read(String(manifestId || ""));
  }

  async recoverRunning() {
    const manifests = [];
    let entries;
    try { entries = await fs.readdir(this.root, { withFileTypes: true }); } catch (error) { if (error.code === "ENOENT") return { recovered: 0 }; throw error; }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const manifest = await this.#read(entry.name.slice(0, -5));
      if (manifest) manifests.push(manifest);
    }
    let recovered = 0;
    for (const manifest of manifests) {
      const changed = manifest.chunks.some((chunk) => chunk.status === "running");
      if (!changed) continue;
      manifest.chunks = manifest.chunks.map((chunk) => chunk.status === "running" ? { ...chunk, status: "pending", claim: null, updatedAt: this.clock().toISOString() } : chunk);
      manifest.status = "pending";
      manifest.updatedAt = this.clock().toISOString();
      await atomicJson(this.#file(manifest.manifestId), manifest);
      recovered += 1;
    }
    return { recovered };
  }

  async claim(manifestId, chunkId, { leaseMs = 5 * 60_000 } = {}) {
    return this.#serialized(manifestId, () => this.processLock.run(async () => {
      const manifest = await this.#read(manifestId);
      if (!manifest) return null;
      const chunk = manifest.chunks.find((item) => item.chunkId === chunkId);
      if (!chunk || !["pending", "failed_retryable"].includes(chunk.status)) return null;
      const now = this.clock();
      chunk.status = "running";
      chunk.attempts += 1;
      chunk.claim = { owner: `${process.pid}`, expiresAt: new Date(now.getTime() + leaseMs).toISOString() };
      chunk.updatedAt = now.toISOString();
      manifest.status = "running";
      manifest.updatedAt = now.toISOString();
      await atomicJson(this.#file(manifestId), manifest);
      return { manifest, chunk };
    }));
  }

  async complete(manifestId, chunkId, analysis) {
    return this.#updateChunk(manifestId, chunkId, (chunk) => ({
      ...chunk,
      status: "completed",
      claim: null,
      analysis,
      nextAttemptAt: null,
      updatedAt: this.clock().toISOString(),
    }));
  }

  async fail(manifestId, chunkId, error, { terminal = false } = {}) {
    return this.#updateChunk(manifestId, chunkId, (chunk) => ({
      ...chunk,
      status: terminal ? "failed_terminal" : "failed_retryable",
      claim: null,
      lastError: { code: String(error?.code || "CAPTURE_CHUNK_FAILED"), message: String(error?.message || "分析失败").slice(0, 300) },
      nextAttemptAt: terminal ? null : new Date(this.clock().getTime() + 60_000).toISOString(),
      updatedAt: this.clock().toISOString(),
    }));
  }

  async #updateChunk(manifestId, chunkId, updater) {
    return this.#serialized(manifestId, () => this.processLock.run(async () => {
      const manifest = await this.#read(manifestId);
      if (!manifest) throw Object.assign(new Error("Capture Chunk Manifest 不存在"), { code: "CAPTURE_MANIFEST_MISSING" });
      const index = manifest.chunks.findIndex((item) => item.chunkId === chunkId);
      if (index < 0) throw Object.assign(new Error("Capture Chunk 不存在"), { code: "CAPTURE_CHUNK_MISSING" });
      manifest.chunks[index] = updater(manifest.chunks[index], manifest);
      const complete = manifest.chunks.every((chunk) => chunk.status === "completed");
      manifest.status = complete ? "completed" : manifest.chunks.some((chunk) => chunk.status === "failed_terminal") ? "failed_terminal" : "pending";
      manifest.updatedAt = this.clock().toISOString();
      await atomicJson(this.#file(manifestId), manifest);
      return manifest;
    }));
  }

  coverage(manifest) {
    const chunks = Array.isArray(manifest?.chunks) ? manifest.chunks : [];
    const completed = chunks.filter((chunk) => chunk.status === "completed").length;
    return { completed, total: chunks.length, ratio: chunks.length ? completed / chunks.length : 0, complete: chunks.length > 0 && completed === chunks.length, incomplete: completed > 0 && completed < chunks.length };
  }

  async #serialized(key, operation) {
    const current = this.tails.get(key) || Promise.resolve();
    const next = current.catch(() => {}).then(operation);
    this.tails.set(key, next);
    try { return await next; } finally { if (this.tails.get(key) === next) this.tails.delete(key); }
  }
}

export {
  ANALYSIS_CONTRACT_VERSION,
  ANALYSIS_POLICY_VERSION,
  CHUNK_ALGORITHM_VERSION,
  CHUNK_STATES,
  PROMPT_VERSION,
  CaptureChunkStore,
  chunkIdentity,
};
