import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { PATHS } from "../packages/syno-core/paths.mjs";

async function walk(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const file of list) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      if (file.name === "99-System" || file.name === ".git" || file.name === "node_modules" || file.name.startsWith(".")) continue;
      results = results.concat(await walk(res));
    } else if (file.name.endsWith(".md")) {
      results.push(res);
    }
  }
  return results;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const vaultRoot = PATHS.vaultRoot;
  const files = await walk(vaultRoot);
  const noteNames = new Set(files.map((f) => path.basename(f, ".md")));

  console.log(`=== 正在对 Vault ${files.length} 篇笔记执行链接健康诊断 ===`);

  let aliasFixedCount = 0;
  let syntaxFixedCount = 0;
  let mocPrunedRowCount = 0;

  for (const f of files) {
    const originalText = await fs.readFile(f, "utf8");
    let text = originalText;
    const isMoc = path.basename(f).startsWith("MOC");

    // 1. 修复 Sitor AI 别名
    if (text.includes("[[Sitor AI]]") || text.includes("[[Sitor AI|")) {
      text = text.replace(/\[\[Sitor AI\]\]/g, "[[Sitor AI - 解决人的信息幻觉 - 三元同学|Sitor AI]]");
      text = text.replace(/\[\[Sitor AI\|([^\]]+)\]\]/g, "[[Sitor AI - 解决人的信息幻觉 - 三元同学|$1]]");
      aliasFixedCount++;
    }

    // 2. 修复多余转义反斜杠与别名管道转义
    if (text.includes("\\]]")) {
      text = text.replace(/\\\]\]/g, "]]");
      syntaxFixedCount++;
    }
    if (text.includes("\\|")) {
      text = text.replace(/\[\[([^\]]+)\\\|/g, "[[$1|");
      syntaxFixedCount++;
    }

    // 3. 修复标题逗号缺失
    if (text.includes("[[用AI的这三年想跟你分享这9条心得")) {
      text = text.replace(/\[\[用AI的这三年想跟你分享这9条心得/g, "[[用AI的这三年，想跟你分享这9条心得");
      aliasFixedCount++;
    }

    // 4. 重定向已裁撤旧 MOC 到有效核心 MOC
    if (text.includes("[[MOC - Prompt 工程]]")) {
      text = text.replace(/\[\[MOC - Prompt 工程\]\]/g, "[[MOC - Harness Engineering|MOC - Prompt / Harness 工程]]");
      aliasFixedCount++;
    }
    if (text.includes("[[MOC - Loock AI 全栈课程]]")) {
      text = text.replace(/\[\[MOC - Loock AI 全栈课程\]\]/g, "[[MOC - AI Agent Development|MOC - AI Agent 架构开发]]");
      aliasFixedCount++;
    }

    // 3. 针对 MOC 文件，清理已裁撤的 B站视频、Loock AI、Prompts 行
    if (isMoc) {
      const lines = text.split(/\r?\n/);
      const newLines = [];
      for (const line of lines) {
        // 检查表格行或列表行是否包含指向不存在笔记的链接
        const match = line.match(/\[\[([^\]\|#]+)(?:[#\|][^\]]*)?\]\]/);
        if (match) {
          const target = match[1].trim();
          if (!noteNames.has(target) && !target.endsWith(".md")) {
            // 如果该行标记了 B站视频、Loock、Prompts 或为死链行，剔除该行
            if (line.includes("B站") || line.includes("bilibili") || line.includes("Loock") || line.includes("Prompt") || line.startsWith("| [[")) {
              mocPrunedRowCount++;
              continue;
            }
          }
        }
        newLines.push(line);
      }
      text = newLines.join("\n");
    }

    if (text !== originalText) {
      if (!isDryRun) {
        await fs.writeFile(f, text, "utf8");
      }
    }
  }

  console.log(`\n修复统计:`);
  console.log(`- 修正 Sitor AI 别名引用: ${aliasFixedCount} 处`);
  console.log(`- 修正转义斜杠语法错误: ${syntaxFixedCount} 处`);
  console.log(`- 清理 MOC 中已裁撤死链行: ${mocPrunedRowCount} 行`);
  console.log(isDryRun ? "（当前为 Dry-Run 模式，未实际写盘）" : "✅ 全部修复已写盘完成！");

  // 再次扫描健康度
  const afterFiles = await walk(vaultRoot);
  const afterNoteNames = new Set(afterFiles.map((f) => path.basename(f, ".md")));
  let remainingBroken = 0;
  const remainingTargets = new Map();

  for (const f of afterFiles) {
    const content = await fs.readFile(f, "utf8");
    const matches = content.matchAll(/\[\[([^\]\|#]+)(?:[#\|][^\]]*)?\]\]/g);
    for (const m of matches) {
      const target = m[1].trim();
      if (!afterNoteNames.has(target) && !target.endsWith(".md")) {
        remainingBroken++;
        remainingTargets.set(target, (remainingTargets.get(target) || 0) + 1);
      }
    }
  }

  console.log(`\n最终死链余量: ${remainingBroken} 处`);
  if (remainingBroken > 0) {
    const topRemaining = Array.from(remainingTargets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log("剩余高频前瞻引用 (Forward Stubs):", topRemaining);
  }
}

main().catch(console.error);
