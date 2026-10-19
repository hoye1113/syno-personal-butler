// Read-only application metadata discovery; credentials stay in the existing Host store.
import { promises as fs } from "node:fs";
import path from "node:path";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { FeishuPublisher } from "../packages/syno-core/feishu-bitable-sync.mjs";
import { KnowledgePublisher } from "../packages/syno-core/knowledge-publisher.mjs";
const config = JSON.parse(await fs.readFile(path.join(PATHS.repoRoot, "config/knowledge-publishing.json"), "utf8"));
const publisher = new KnowledgePublisher({ config, root: PATHS.knowledgeRoot, adapter: new FeishuPublisher({ root: PATHS.knowledgeRoot }) });
console.log(JSON.stringify(await publisher.check("local-user"), null, 2));
