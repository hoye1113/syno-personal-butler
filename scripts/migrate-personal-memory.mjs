import { promises as fs } from "node:fs";
import path from "node:path";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { migrationManifest } from "../packages/syno-core/memory-migration.mjs";
// Production application is deliberately not a CLI flag: reviewed manifests go
// through a development migration and exact-path Git review, never model tools.
const report=await migrationManifest(PATHS.knowledgeRoot);
const file=path.join(PATHS.runtimeRoot,"migrations","memory-v02-dry-run.json");
await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({report:file,records:report.entries.length,requiresReview:report.entries.filter(e=>e.status==="requires_review").length,digest:report.digest}));
