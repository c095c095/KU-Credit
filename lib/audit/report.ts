import type { AuditResult, RequirementStatus } from "./types";

const bar = (have: number, need: number, width = 14): string => {
  const ratio = need > 0 ? Math.min(1, have / need) : 1;
  const filled = Math.round(ratio * width);
  return "#".repeat(filled) + "-".repeat(width - filled);
};

const lines = (s: RequirementStatus, depth = 0): string[] => {
  const indent = "  ".repeat(depth);
  const mark = s.satisfied ? "[x]" : "[ ]";
  const miss = s.missingMandatory.length ? `  missing: ${s.missingMandatory.join(", ")}` : "";
  const label = `${indent}${mark} ${s.nameEn}`.padEnd(40);
  const credits = `${s.haveCredits}/${s.needCredits}`.padStart(7);
  const rows = [`${label}${credits}  ${bar(s.haveCredits, s.needCredits)}${miss}`];
  for (const child of s.children ?? []) rows.push(...lines(child, depth + 1));
  return rows;
};

const yn = (b: boolean) => (b ? "yes" : "NO");

/** Human-readable audit report for CLI / eyeballing. */
export function formatAuditReport(audit: AuditResult, title = "Degree Audit"): string {
  const v = audit.verdict;
  const out: string[] = [`== ${title} ==`, ""];
  for (const r of audit.requirements) out.push(...lines(r));
  out.push(
    "",
    `Total: ${audit.totalCredits.have}/${audit.totalCredits.need} credits (remaining ${audit.totalCredits.remaining})`,
    `GPAX:  ${audit.gpax.toFixed(2)}`,
    "",
    `Verdict: ${v.overallDone ? "DONE 🎓" : "not yet"}`,
    `  academic: ${yn(v.academicComplete)}   GPAX>=2.00: ${yn(v.gpaxOk)}   KU-EXITE: ${yn(v.kuExitePassed)}`,
    `  >=6 sem: ${yn(v.meetsMinDuration)} (${v.regularSemesters})   within 8yr: ${yn(v.withinTimeLimit)}   honors: ${v.honors ?? "-"}`,
  );
  if (audit.warnings.length) {
    out.push("", "Prereq warnings:");
    for (const w of audit.warnings) out.push(`  ${w.courseCode} needs ${w.unmet.join("; ")}`);
  }
  if (audit.invalidAssignments.length) {
    out.push("", `Invalid assignments: ${audit.invalidAssignments.map((a) => `${a.courseCode}->${a.requirementId}`).join(", ")}`);
  }
  if (audit.unassignedCompleted.length) {
    out.push("", `Unassigned completed: ${audit.unassignedCompleted.join(", ")}`);
  }
  return out.join("\n");
}
