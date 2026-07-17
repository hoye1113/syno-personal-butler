import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  createDefaultPlannerSettings,
  getVaultProfile,
  normalizePlannerSettings,
  resolvePlannerPaths,
} from "../topic-planner-config.mjs";

const ROOT = path.resolve("test-fixtures", "syno-root");
const OTHER_ROOT = path.resolve("test-fixtures", "other-root");

test("defaults point at the built-in Syno repository layout", () => {
  const settings = createDefaultPlannerSettings(path.resolve("apps", "syno"));
  assert.equal(settings.topicDir, "ops/content/ideas");
  assert.equal(settings.inboxDir, "vault/00-Inbox");
  assert.equal(settings.archiveDir, "ops/content/archive");
  assert.equal(settings.wikiDir, "vault");
  assert.equal(settings.wikiIndexPath, "vault/MOC - 知识库导航.md");
  assert.equal(settings.wikiLogPath, "ops/events/wiki-log.md");
  assert.equal(settings.calendarProvider, "none");
  assert.equal(settings.larkCalendarId, "");
  assert.equal(settings.dailyCapacity, 2);
  assert.equal(settings.vaultRoot, path.resolve("."));
});

test("normalization is platform independent and only accepts Lark", () => {
  const normalized = normalizePlannerSettings({
    vaultRoot: `${ROOT}${path.sep}`,
    topicDir: " /内容/选题库/ ",
    inboxDir: " /收件箱/ ",
    archiveDir: " /归档/选题/ ",
    calendarProvider: "unsupported",
    larkCalendarId: " cal_custom ",
    larkCalendarName: " 内容排期 ",
    wikiMode: "agent",
    wikiDir: " /研究/内容Wiki/ ",
    dailyCapacity: "4",
    scheduleTimeSlots: [
      { label: " 晨间发布 ", start: "08:30", end: "09:00" },
      { label: "bad", start: "11:00", end: "10:00" },
    ],
  });
  assert.equal(normalized.vaultRoot, ROOT);
  assert.equal(normalized.topicDir, "内容/选题库");
  assert.equal(normalized.inboxDir, "收件箱");
  assert.equal(normalized.archiveDir, "归档/选题");
  assert.equal(normalized.calendarProvider, "none");
  assert.equal(normalized.larkCalendarId, "cal_custom");
  assert.equal(normalized.larkCalendarName, "内容排期");
  assert.equal(normalized.wikiMode, "agent");
  assert.equal(normalized.dailyCapacity, 4);
  assert.deepEqual(normalized.scheduleTimeSlots, [{ label: "晨间发布", start: "08:30", end: "09:00" }]);
});

test("relative directories cannot escape the repository", () => {
  const normalized = normalizePlannerSettings({
    topicDir: "../escape",
    inboxDir: "safe/inbox",
    archiveDir: "../../archive",
    wikiDir: "../wiki",
  });
  assert.equal(normalized.topicDir, "ops/content/ideas");
  assert.equal(normalized.inboxDir, "safe/inbox");
  assert.equal(normalized.archiveDir, "ops/content/archive");
  assert.equal(normalized.wikiDir, "vault");
});

test("saved repository profile is restored", () => {
  const profile = getVaultProfile({
    vaultProfiles: {
      [ROOT]: {
        topicDir: "ops/content/ideas",
        inboxDir: "vault/00-Inbox",
        archiveDir: "ops/content/archive",
        wikiDir: "vault",
        wikiIndexPath: "vault/MOC - 知识库导航.md",
        wikiLogPath: "ops/events/wiki-log.md",
      },
      relative: { topicDir: "x", inboxDir: "y", archiveDir: "z" },
    },
  }, ROOT);
  assert.equal(profile.topicDir, "ops/content/ideas");
  assert.equal(getVaultProfile({ workspaceMode: "obsidian", vaultRoot: ROOT }, OTHER_ROOT), null);
});

test("planner paths join the repository root on every platform", () => {
  const resolved = resolvePlannerPaths({
    vaultRoot: ROOT,
    topicDir: "ops/content/ideas",
    inboxDir: "vault/00-Inbox",
    archiveDir: "ops/content/archive",
  });
  assert.equal(resolved.topicDir, path.join(ROOT, "ops/content/ideas"));
  assert.equal(resolved.inboxDir, path.join(ROOT, "vault/00-Inbox"));
  assert.equal(resolved.archiveRoot, path.join(ROOT, "ops/content/archive"));
  assert.equal(resolved.wikiRoot, path.join(ROOT, "vault"));
});

test("standalone mode keeps absolute directories", () => {
  const topicDir = path.join(ROOT, "topics");
  const resolved = resolvePlannerPaths({
    workspaceMode: "standalone",
    topicDir,
    inboxDir: path.join(ROOT, "inbox"),
    archiveDir: path.join(ROOT, "archive"),
  });
  assert.equal(resolved.topicDir, topicDir);
  assert.equal(resolved.vaultRoot, path.parse(topicDir).root);
});
