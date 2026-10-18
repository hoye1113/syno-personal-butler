// Resume registered publishing only. Capture still enters through capture.submit.
const origin = process.env.SYNO_HOST_ORIGIN || "http://127.0.0.1:8888";
const url = new URL(origin);
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) throw new Error("只允许本机受控 Host");
if (process.argv.includes("--watch")) throw new Error("不再支持独立轮询；恢复由 Host 的发布队列负责");
const response = await fetch(new URL("/api/syno/knowledge/sync/recover", url), { method: "POST", headers: { "Content-Type": "application/json", Origin: url.origin }, body: "{}" });
if (!response.ok) throw new Error(`受控恢复失败：HTTP ${response.status}`);
console.log(JSON.stringify(await response.json(), null, 2));
