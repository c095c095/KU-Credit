/// <reference types="node" />
// Zero-dependency CLI verifier: runs every fixture transcript through the audit engine
// and checks it against the fixture's expectations. `--report` also prints each audit.
//   Run:  npx tsx scripts/verify-engine.ts          (once tsx/vitest are installed)
//   or:   the npm "verify" script (see package.json)

import { CS_2565 } from "../lib/curriculum/cs-2565";
import { KU_2566 } from "../lib/audit/regulation";
import { computeAudit } from "../lib/audit/engine";
import { formatAuditReport } from "../lib/audit/report";
import { checkExpected, fixtures } from "../lib/audit/fixtures";

const indent = (s: string): string =>
  s
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");

const verbose = process.argv.includes("--report");
let failures = 0;

for (const f of fixtures) {
  const audit = computeAudit(CS_2565, f.progress, KU_2566);
  const errs = checkExpected(audit, f.expect);
  if (errs.length) {
    failures++;
    console.log(`\n[FAIL] ${f.name} — ${f.description}`);
    for (const e of errs) console.log(`    ${e}`);
    console.log(indent(formatAuditReport(audit, f.name)));
  } else {
    console.log(`[ok]   ${f.name}`);
    if (verbose) console.log(indent(formatAuditReport(audit, f.name)));
  }
}

console.log(`\n${fixtures.length - failures}/${fixtures.length} fixtures passed.`);
process.exit(failures ? 1 : 0);
