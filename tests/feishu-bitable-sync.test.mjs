import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  FeishuBitableSyncEngine,
  sanitizeFilename,
  extractUrl,
  extractTags,
  isWeChatUrl,
  extractWeChatMetadata,
  determineCategoryInfo,
} from "../packages/syno-core/feishu-bitable-sync.mjs";

test("sanitizeFilename, extractUrl, and extractTags format values correctly", () => {
  assert.equal(sanitizeFilename("Hello: World! 2026?"), "Hello-World-2026");
  assert.equal(sanitizeFilename(""), "note");

  assert.equal(extractUrl("https://example.com"), "https://example.com");
  assert.equal(extractUrl({ link: "https://example.com/a" }), "https://example.com/a");
  assert.equal(extractUrl({ text: "https://example.com/b" }), "https://example.com/b");
  assert.equal(extractUrl(null), "");

  assert.deepEqual(extractTags(["AI", "Agent"]), ["AI", "Agent"]);
  assert.deepEqual(extractTags("SingleTag"), ["SingleTag"]);
  assert.deepEqual(extractTags(null), []);
});

test("isWeChatUrl, extractWeChatMetadata, and determineCategoryInfo classify accurately", () => {
  assert.equal(isWeChatUrl("https://mp.weixin.qq.com/s/abc123xyz"), true);
  assert.equal(isWeChatUrl("http://mp.weixin.qq.com/s?__biz=123"), true);
  assert.equal(isWeChatUrl("https://example.com/article"), false);
  assert.equal(isWeChatUrl(""), false);

  const sampleHtml = `
    <html>
      <head>
        <meta property="og:title" content="大模型与 Agent 深度架构" />
        <meta property="og:article:author" content="前沿思考者" />
      </head>
      <body></body>
    </html>
  `;
  const meta = extractWeChatMetadata(sampleHtml);
  assert.equal(meta.title, "大模型与 Agent 深度架构");
  assert.equal(meta.author, "前沿思考者");

  assert.equal(determineCategoryInfo("Harness Engineering 深度实践", []).wikiCatKey, "05_harness");
  assert.equal(determineCategoryInfo("Super Agent 实战课笔记", []).wikiCatKey, "02_super_agent");
  assert.equal(determineCategoryInfo("AI 原生组织与个人杠杆", []).wikiCatKey, "06_organization");
  assert.equal(determineCategoryInfo("人何以自处：哲学与心智", []).wikiCatKey, "10_philosophy");
  assert.equal(determineCategoryInfo("自进化 Agent 设计模式", []).wikiCatKey, "04_design_patterns");
  assert.equal(determineCategoryInfo("普通理论探讨", []).wikiCatKey, "01_theory");
});

test("FeishuBitableSyncEngine throws if credentials are not configured", async () => {
  const engine = new FeishuBitableSyncEngine({
    credentials: {
      load: async () => null,
    },
  });
  await assert.rejects(
    () => engine.syncIntakeOnce(),
    /飞书未配置有效凭据/
  );
});

test("FeishuBitableSyncEngine handles empty pending list", async (t) => {
  const tempInbox = await fs.mkdtemp(path.join(tmpdir(), "syno-inbox-test-"));
  t.after(() => fs.rm(tempInbox, { recursive: true, force: true }));

  const fakeLarkClient = {
    bitable: {
      appTableRecord: {
        list: async () => ({
          data: {
            items: [
              {
                record_id: "rec_1",
                fields: { "收录状态": "已入库", "标题": "Old" },
              },
            ],
          },
        }),
      },
    },
  };

  const engine = new FeishuBitableSyncEngine({
    vaultInboxRoot: tempInbox,
    credentials: {
      load: async () => ({ appId: "cli_mock", appSecret: "mock_secret" }),
    },
    sdkLoader: async () => ({
      Client: class {
        constructor() {
          return fakeLarkClient;
        }
      },
    }),
  });

  const res = await engine.syncIntakeOnce();
  assert.equal(res.processed, 0);
  assert.deepEqual(res.items, []);
});

test("FeishuBitableSyncEngine processes pending intake item end-to-end", async (t) => {
  const tempInbox = await fs.mkdtemp(path.join(tmpdir(), "syno-inbox-test-"));
  t.after(() => fs.rm(tempInbox, { recursive: true, force: true }));

  const updatedRecords = [];
  const createdCatalogRecords = [];

  const fakeLarkClient = {
    bitable: {
      appTableRecord: {
        list: async () => ({
          data: {
            items: [
              {
                record_id: "rec_pending_1",
                fields: {
                  "标题": "测试文章标题",
                  "正文/想法": "这是测试文章的正文摘要与观点内容。",
                  "链接": { link: "https://example.com/article/1" },
                  "分类标签": ["AI架构", "知识管理"],
                  "收录状态": "待收录",
                },
              },
            ],
          },
        }),
        update: async ({ path: p, data }) => {
          updatedRecords.push({ path: p, data });
          return { data: {} };
        },
        create: async ({ path: p, data }) => {
          createdCatalogRecords.push({ path: p, data });
          return { data: {} };
        },
      },
    },
  };

  const fixedClock = () => new Date("2026-10-09T18:00:00Z");

  const engine = new FeishuBitableSyncEngine({
    vaultInboxRoot: tempInbox,
    credentials: {
      load: async () => ({ appId: "cli_mock", appSecret: "mock_secret" }),
    },
    sdkLoader: async () => ({
      Client: class {
        constructor() {
          return fakeLarkClient;
        }
      },
    }),
    clock: fixedClock,
  });

  const res = await engine.syncIntakeOnce();
  assert.equal(res.processed, 1);
  assert.equal(res.items[0].title, "测试文章标题");

  // Check generated file in tempInbox
  const files = await fs.readdir(tempInbox);
  assert.equal(files.length, 1);
  const content = await fs.readFile(path.join(tempInbox, files[0]), "utf8");
  assert.match(content, /title: "测试文章标题"/);
  assert.match(content, /source_url: "https:\/\/example\.com\/article\/1"/);
  assert.match(content, /- AI架构/);
  assert.match(content, /这是测试文章的正文摘要与观点内容。/);

  // Check status update in Table 1
  assert.equal(updatedRecords.length, 1);
  assert.equal(updatedRecords[0].path.record_id, "rec_pending_1");
  assert.equal(updatedRecords[0].data.fields["收录状态"], "已入库");
  assert.match(updatedRecords[0].data.fields["本地笔记路径"], /^vault\/00-Inbox\//);

  // Check incremental insert in Table 2
  assert.equal(createdCatalogRecords.length, 1);
  assert.equal(createdCatalogRecords[0].data.fields["笔记名称"], "测试文章标题");
  assert.equal(createdCatalogRecords[0].data.fields["知识领域"], "06-其他与思考");
  assert.equal(createdCatalogRecords[0].data.fields["完整正文"], "这是测试文章的正文摘要与观点内容。");
  assert.deepEqual(createdCatalogRecords[0].data.fields["标签"], ["AI架构", "知识管理"]);
});

test("FeishuBitableSyncEngine processes WeChat article with V4 aesthetic typesetting end-to-end", async (t) => {
  const tempVault = await fs.mkdtemp(path.join(tmpdir(), "syno-vault-test-"));
  const tempInbox = path.join(tempVault, "00-Inbox");
  t.after(() => fs.rm(tempVault, { recursive: true, force: true }));

  const updatedRecords = [];
  const createdCatalogRecords = [];
  const createdDocxBlocks = [];

  const fakeLarkClient = {
    bitable: {
      appTableRecord: {
        list: async () => ({
          data: {
            items: [
              {
                record_id: "rec_wechat_1",
                fields: {
                  "标题": "",
                  "正文/想法": "重点关注自进化机制",
                  "链接": { link: "https://mp.weixin.qq.com/s/sample-wechat-agent" },
                  "分类标签": ["自进化Agent", "设计模式"],
                  "收录状态": "待收录",
                },
              },
            ],
          },
        }),
        update: async ({ path: p, data }) => {
          updatedRecords.push({ path: p, data });
          return { data: {} };
        },
        create: async ({ path: p, data }) => {
          createdCatalogRecords.push({ path: p, data });
          return { data: {} };
        },
      },
    },
    wiki: {
      v2: {
        spaceNode: {
          list: async () => ({
            data: {
              items: [
                { title: "04 - Agent 设计模式与生产实践", node_token: "token_cat_04" },
              ],
            },
          }),
          create: async () => ({
            data: {
              node: {
                obj_token: "doc_mock_123",
                url: "https://example.feishu.cn/wiki/token_wechat_doc",
              },
            },
          }),
        },
      },
    },
    docx: {
      v1: {
        documentBlockChildren: {
          create: async ({ data }) => {
            createdDocxBlocks.push(...data.children);
            return {
              data: {
                children: data.children.map((c, idx) => ({ block_id: `blk_${idx}`, block_type: c.block_type })),
              },
            };
          },
        },
        documentBlock: {
          patch: async () => ({ data: {} }),
        },
      },
    },
    drive: {
      v1: {
        media: {
          uploadAll: async () => ({ file_token: "box_img_token_xyz" }),
        },
      },
    },
  };

  const fakeHtml = `
    <html>
      <head>
        <meta property="og:title" content="自进化 Agent 核心架构与实战" />
        <meta property="og:article:author" content="架构前沿" />
      </head>
      <body>
        <h2>一、核心演进机制</h2>
        <p>这是正文第一段，阐述智能体自进化的第一性原理。</p>
        <p>▼ 阶段流程：感知 ──► 规划 ──► 执行 ──► 反思</p>
        <img data-src="https://mmbiz.qpic.cn/test_image?wx_fmt=png" />
      </body>
    </html>
  `;

  const fakeFetcher = async (url) => {
    if (url.includes("mp.weixin.qq.com")) {
      return {
        ok: true,
        status: 200,
        text: async () => fakeHtml,
      };
    }
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => Buffer.from("fake-png-bytes"),
    };
  };

  const fixedClock = () => new Date("2026-10-10T10:00:00Z");

  const engine = new FeishuBitableSyncEngine({
    vaultRoot: tempVault,
    vaultInboxRoot: tempInbox,
    credentials: {
      load: async () => ({ appId: "cli_mock", appSecret: "mock_secret" }),
    },
    sdkLoader: async () => ({
      Client: class {
        constructor() {
          return fakeLarkClient;
        }
      },
    }),
    clock: fixedClock,
    fetcher: fakeFetcher,
  });

  const res = await engine.syncIntakeOnce();
  assert.equal(res.processed, 1);
  assert.equal(res.items[0].title, "自进化 Agent 核心架构与实战");

  // Check generated file in tempInbox
  const files = await fs.readdir(tempInbox);
  assert.equal(files.length, 1);
  const content = await fs.readFile(path.join(tempInbox, files[0]), "utf8");

  // Assertions for V4 Aesthetic Typesetting
  assert.match(content, /title: "自进化 Agent 核心架构与实战"/);
  assert.match(content, /author: "架构前沿"/);
  assert.match(content, /source: wechat_article/);
  // Breathing space: 3 blank lines after quote
  assert.match(content, /> 录入时间：[^\n]+\n\n\n\n/);
  // H1 elevation with divider
  assert.match(content, /---\s+# 一、核心演进机制/);
  // Flowchart wrapped into code block
  assert.match(content, /```\n▼ 阶段流程：感知 ──► 规划 ──► 执行 ──► 反思\n```/);
  // Image markdown referencing local attachment
  assert.match(content, /!\[配图 1\]\(\.\.\/\.\.\/99-System\/Attachments\/WeChat Articles\//);

  // Check image file was downloaded to disk
  const attachmentDir = path.join(tempVault, "99-System/Attachments/WeChat Articles");
  const subDirs = await fs.readdir(attachmentDir);
  assert.equal(subDirs.length, 1);
  const imgFiles = await fs.readdir(path.join(attachmentDir, subDirs[0]));
  assert.equal(imgFiles.length, 1);
  assert.equal(imgFiles[0], "fig-01.png");

  // Check Table 1 status update
  assert.equal(updatedRecords.length, 1);
  assert.equal(updatedRecords[0].data.fields["收录状态"], "已入库");
  assert.match(updatedRecords[0].data.fields["管家摘要"], /V4 美感排版/);
  assert.match(updatedRecords[0].data.fields["管家摘要"], /token_wechat_doc/);

  // Check Table 2 catalog record
  assert.equal(createdCatalogRecords.length, 1);
  assert.equal(createdCatalogRecords[0].data.fields["笔记名称"], "自进化 Agent 核心架构与实战");
  assert.equal(createdCatalogRecords[0].data.fields["知识领域"], "01-基础与方法论");
  assert.equal(createdCatalogRecords[0].data.fields["核心专题"], "Agent Design & Patterns");
});
