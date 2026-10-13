import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedSynoApiPath } from "../apps/syno/syno/server-api-allowlist.mjs";

test("Syno Host exposes Harness status without exposing its restart route", () => {
  assert.equal(isAllowedSynoApiPath("/api/syno/harness"), true);
  assert.equal(isAllowedSynoApiPath("/api/syno/harness/restart"), false);
  assert.equal(isAllowedSynoApiPath("/api/syno/private/unknown"), false);
});

test("proactive status is the sole public diagnostic path", () => {
  assert.equal(isAllowedSynoApiPath("/api/syno/proactive/status"), true);
  assert.equal(isAllowedSynoApiPath("/api/syno/proactive/preview"), false);
  assert.equal(isAllowedSynoApiPath("/api/syno/proactive/unknown"), false);
});
