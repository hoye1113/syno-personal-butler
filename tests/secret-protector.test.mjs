import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { SECRET_CIPHER_PREFIX, createKeychainProtector, createSecretProtector, keychainServiceFor } from "../packages/syno-core/secret-protector.mjs";

function keyOf(args) {
  return `${args[args.indexOf("-s") + 1]}/${args[args.indexOf("-a") + 1]}`;
}

// 进程内假钥匙串：复刻 security(1) 的 find/add 行为，含 44（条目不存在）与两行确认 stdin 契约。
function fakeSecurity({ initial = null } = {}) {
  const items = new Map();
  const calls = [];
  if (initial) items.set(initial.key, initial.value);
  const runSecurity = async (args, stdin = "") => {
    calls.push({ args: [...args], stdin });
    const key = keyOf(args);
    if (args[0] === "find-generic-password") {
      if (!items.has(key)) return { code: 44, stdout: "", stderr: "The specified item could not be found in the keychain." };
      return { code: 0, stdout: `${items.get(key)}\n`, stderr: "" };
    }
    if (args[0] === "add-generic-password") {
      const lines = stdin.split("\n");
      if (!lines[0] || lines[0] !== lines[1]) return { code: 1, stdout: "", stderr: "passwords don't match" };
      items.set(key, lines[0]);
      return { code: 0, stdout: "", stderr: "password data for new item: retype password for new item: " };
    }
    return { code: 2, stdout: "", stderr: `unexpected command ${args[0]}` };
  };
  return { items, calls, runSecurity };
}

test("macOS 钥匙串：首次加密生成主密钥、密文自包含可解密，主密钥不进 argv", async () => {
  const { items, calls, runSecurity } = fakeSecurity();
  const protector = createKeychainProtector({ service: "syno.test.unit", account: "master-key", runSecurity });
  const ciphertext = await protector.protect("中文秘密 🔐 payload");
  assert.ok(ciphertext.startsWith(SECRET_CIPHER_PREFIX));
  assert.doesNotMatch(ciphertext, /中文秘密|payload/);
  assert.equal(await protector.unprotect(ciphertext), "中文秘密 🔐 payload");
  assert.equal(items.size, 1);
  const adds = calls.filter((call) => call.args[0] === "add-generic-password");
  assert.equal(adds.length, 1);
  const [first, second] = adds[0].stdin.split("\n");
  assert.equal(first, second);
  assert.notEqual(first, "");
  assert.ok(adds[0].args.every((arg) => !arg.includes(first)), "主密钥不得出现在 argv");
  const finds = calls.filter((call) => call.args[0] === "find-generic-password");
  assert.equal(finds.length, 2, "首次 find 未命中 → add → 回读一次");
  await protector.protect("again");
  assert.equal(calls.filter((call) => call.args[0] === "add-generic-password").length, 1, "主密钥只在首用时写入");
});

test("macOS 钥匙串：密文篡改与外来格式显式拒绝", async () => {
  const { runSecurity } = fakeSecurity();
  const protector = createKeychainProtector({ service: "syno.test.tamper", account: "master-key", runSecurity });
  const ciphertext = await protector.protect("payload");
  const raw = Buffer.from(ciphertext.slice(SECRET_CIPHER_PREFIX.length), "base64");
  raw[raw.length - 1] ^= 0xff;
  await assert.rejects(protector.unprotect(SECRET_CIPHER_PREFIX + raw.toString("base64")), { code: "SECRET_CIPHERTEXT_TAMPERED" });
  await assert.rejects(protector.unprotect("plain-base64-ciphertext"), { code: "SECRET_CIPHERTEXT_FORMAT_INVALID" });
  await assert.rejects(protector.unprotect(`${SECRET_CIPHER_PREFIX}AAAA`), { code: "SECRET_CIPHERTEXT_FORMAT_INVALID" });
  await assert.rejects(protector.protect(42), { code: "SECRET_PLAINTEXT_INVALID" });
});

test("macOS 钥匙串：读取/写入失败不静默降级", async () => {
  const locked = createKeychainProtector({
    service: "syno.test.locked", account: "master-key",
    runSecurity: async () => ({ code: 51, stdout: "", stderr: "User interaction is not allowed." }),
  });
  await assert.rejects(locked.protect("value"), { code: "SECRET_KEYCHAIN_UNAVAILABLE" });
  const denied = createKeychainProtector({
    service: "syno.test.denied", account: "master-key",
    runSecurity: async (args, stdin) => (args[0] === "find-generic-password"
      ? { code: 44, stdout: "", stderr: "" }
      : { code: 1, stdout: "", stderr: stdin.length > 0 ? "keychain locked" : "" }),
  });
  await assert.rejects(denied.protect("value"), { code: "SECRET_KEYCHAIN_UNAVAILABLE" });
});

test("macOS 钥匙串：主密钥长度非法时拒绝", async () => {
  const broken = fakeSecurity({ initial: { key: "syno.test.broken/master-key", value: Buffer.from("short-key").toString("base64") } });
  const protector = createKeychainProtector({ service: "syno.test.broken", account: "master-key", runSecurity: broken.runSecurity });
  await assert.rejects(protector.protect("value"), { code: "SECRET_MASTER_KEY_INVALID" });
});

test("Windows 平台委托 DPAPI，行为与既有 runDpapi 契约一致", async () => {
  const calls = [];
  const protector = createSecretProtector({
    platform: "win32",
    dpapi: async (mode, value) => { calls.push([mode, value]); return mode === "protect" ? "ciphertext" : "plaintext"; },
  });
  assert.equal(await protector.protect("plaintext"), "ciphertext");
  assert.equal(await protector.unprotect("ciphertext"), "plaintext");
  assert.deepEqual(calls, [["protect", "plaintext"], ["unprotect", "ciphertext"]]);
});

test("createSecretProtector 在 darwin 平台接入钥匙串实现", async () => {
  const { runSecurity } = fakeSecurity();
  const protector = createSecretProtector({ platform: "darwin", service: "syno.test.darwin", account: "master-key", runSecurity });
  const ciphertext = await protector.protect("darwin-path");
  assert.equal(await protector.unprotect(ciphertext), "darwin-path");
});

test("其它平台明确拒绝凭据保护，不做静默降级", async () => {
  const protector = createSecretProtector({ platform: "linux" });
  await assert.rejects(protector.protect("value"), { code: "SECRET_PLATFORM_UNSUPPORTED" });
  await assert.rejects(protector.unprotect("value"), { code: "SECRET_PLATFORM_UNSUPPORTED" });
});

test("钥匙串服务名按本地数据根稳定派生", () => {
  assert.match(keychainServiceFor("/data/a"), /^syno\.butler\.credentials\.[0-9a-f]{16}$/);
  assert.equal(keychainServiceFor("/data/a"), keychainServiceFor("/data/a"));
  assert.notEqual(keychainServiceFor("/data/a"), keychainServiceFor("/data/b"));
});

test("macOS 真实钥匙串：加密解密往返并在结束后删除条目", { skip: process.platform !== "darwin", timeout: 30_000 }, async (t) => {
  const service = `syno.butler.test.${randomUUID()}`;
  const account = "roundtrip";
  const protector = createKeychainProtector({ service, account });
  t.after(async () => {
    await new Promise((resolve) => execFile("security", ["delete-generic-password", "-s", service, "-a", account], () => resolve()));
  });
  let ciphertext;
  try {
    ciphertext = await protector.protect("真实钥匙串 中文秘密 🔒 e2e");
  } catch (error) {
    if (error.code === "SECRET_KEYCHAIN_UNAVAILABLE" && /interaction|denied|locked/i.test(error.message)) {
      t.skip(`钥匙串不可用：${error.message}`);
      return;
    }
    throw error;
  }
  assert.ok(ciphertext.startsWith(SECRET_CIPHER_PREFIX));
  assert.equal(await protector.unprotect(ciphertext), "真实钥匙串 中文秘密 🔒 e2e");
});
