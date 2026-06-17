import type { AuditResult, RequirementStatus } from "@/lib/audit/types";

export type GapItem = { label: string; detail: string };

function collectUnsatisfiedLeaves(reqs: RequirementStatus[], out: RequirementStatus[]) {
  for (const r of reqs) {
    if (r.children?.length) collectUnsatisfiedLeaves(r.children, out);
    else if (!r.satisfied) out.push(r);
  }
}

/** Build the "what's missing" list (Thai) from an audit — only the unmet items, with the gap. */
export function deriveGaps(
  audit: AuditResult,
  nameTh: (id: string) => string,
  courseName: (code: string) => string = (c) => c,
): GapItem[] {
  const gaps: GapItem[] = [];

  const leaves: RequirementStatus[] = [];
  collectUnsatisfiedLeaves(audit.requirements, leaves);
  for (const leaf of leaves) {
    const name = nameTh(leaf.id);
    if (leaf.remainingCredits > 0) {
      gaps.push({ label: name, detail: `ขาด ${leaf.remainingCredits} นก.` });
    } else if (leaf.missingMandatory.length) {
      // keep it short — the specific courses live in the requirement row, not the summary
      gaps.push({ label: name, detail: `ยังไม่มี ${leaf.missingMandatory.slice(0, 2).join(", ")}` });
    } else {
      gaps.push({ label: name, detail: "ยังไม่ครบ" });
    }
  }

  const v = audit.verdict;
  for (const code of v.failingRequired)
    gaps.push({ label: courseName(code), detail: "ยังติด F — ต้องเรียนซ้ำให้ผ่าน" });
  for (const code of v.stuckIncomplete)
    gaps.push({ label: courseName(code), detail: "เกรด I ค้าง — ต้องแก้ก่อนจบ" });
  if (!v.gpaxOk) gaps.push({ label: "GPAX", detail: "ต่ำกว่า 2.00" });
  if (!v.meetsMinDuration) gaps.push({ label: "ระยะเวลาเรียน", detail: "ยังไม่ครบ 6 ภาคปกติ" });
  if (!v.withinTimeLimit) gaps.push({ label: "ระยะเวลาเรียน", detail: "เกิน 8 ปี" });
  if (!v.kuExitePassed) gaps.push({ label: "KU-EXITE", detail: "ยังไม่สอบผ่าน" });

  return gaps;
}
