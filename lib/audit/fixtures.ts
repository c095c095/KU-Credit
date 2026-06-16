// Realistic student transcripts for verifying the audit engine.
// Each fixture carries hand-computed expectations; checkExpected() compares them to computeAudit().

import type { Assignment, Attempt, CustomCourse, Grade, Progress } from "../storage/types";
import type { AuditResult, RequirementStatus } from "./types";
import { CORE_CODES, REQUIRED_CODES } from "../curriculum/cs-2565";

const TERMS = ["2567/1", "2567/2", "2568/1", "2568/2", "2569/1", "2569/2", "2570/1", "2570/2"];

// 6 elective options summing to 18 credits (all 3-credit, all match ^014182).
const ELECTIVE_PICKS = ["01418212", "01418223", "01418322", "01418352", "01418362", "01418421"];

// Gen-Ed plan: custom Courses + their target Requirement. (01999111 added separately.)
const GENED_PLAN: { code: string; cr: number; req: string }[] = [
  { code: "01175131", cr: 1, req: "gened.wellness" }, // PE activity (matches ^01175)
  { code: "01999033", cr: 2, req: "gened.wellness" },
  { code: "01179101", cr: 3, req: "gened.entrepreneurship" },
  { code: "01200101", cr: 3, req: "gened.entrepreneurship" }, // extra credits to reach total ≥30
  { code: "01999021", cr: 3, req: "gened.language.thai" },
  { code: "01355112", cr: 3, req: "gened.language.foreign" },
  { code: "01355113", cr: 3, req: "gened.language.foreign" },
  { code: "01355221", cr: 3, req: "gened.language.foreign" },
  { code: "01999023", cr: 3, req: "gened.language.it" },
  { code: "01999013", cr: 1, req: "gened.citizen" }, // + 01999111 (seeded, 2cr)
  { code: "01999034", cr: 3, req: "gened.aesthetics" },
];
const FREE_PLAN = [
  { code: "01101111", cr: 3 },
  { code: "01371111", cr: 3 },
];

type PlanOpts = { kuExite?: boolean; electiveCount?: number; misassignAesthetics?: boolean };

/** A full graduating plan (124 credits) with every Attempt at `grade`. Options carve out variants. */
function makePlan(grade: Grade, opts: PlanOpts = {}): Progress {
  const { kuExite = true, electiveCount = 6, misassignAesthetics = false } = opts;
  let t = 0;
  let aid = 0;
  const attempts: Attempt[] = [];
  const assignments: Assignment[] = [];
  const customCourses: CustomCourse[] = [];
  const add = (code: string) => attempts.push({ id: `a${++aid}`, courseCode: code, term: TERMS[t++ % TERMS.length], grade });

  for (const code of CORE_CODES) add(code); // auto-home to major.core
  for (const code of REQUIRED_CODES) add(code); // auto-home to major.required

  for (const code of ELECTIVE_PICKS.slice(0, electiveCount)) {
    add(code);
    assignments.push({ courseCode: code, requirementId: "major.elective" });
  }

  add("01999111"); // seeded mandatory
  assignments.push({ courseCode: "01999111", requirementId: "gened.citizen" });

  for (const g of GENED_PLAN) {
    customCourses.push({ code: g.code, credits: g.cr, nameEn: g.code });
    add(g.code);
    const req = misassignAesthetics && g.req === "gened.aesthetics" ? "gened.entrepreneurship" : g.req;
    assignments.push({ courseCode: g.code, requirementId: req });
  }

  for (const f of FREE_PLAN) {
    customCourses.push({ code: f.code, credits: f.cr, nameEn: f.code });
    add(f.code);
    assignments.push({ courseCode: f.code, requirementId: "free" });
  }

  return { schemaVersion: 1, curriculumId: "cs-2565", attempts, customCourses, assignments, flags: { kuExitePassed: kuExite } };
}

const at = (id: string, courseCode: string, term: string, grade: Grade): Attempt => ({ id, courseCode, term, grade });

export type Expected = {
  totalHave?: number;
  gpax?: number;
  academicComplete?: boolean;
  gpaxOk?: boolean;
  overallDone?: boolean;
  honors?: "first" | "second" | null;
  reqRemaining?: Record<string, number>;
  reqSatisfied?: Record<string, boolean>;
  warningsInclude?: string[];
  warningsExclude?: string[];
};

export type Fixture = { name: string; description: string; progress: Progress; expect: Expected };

export const fixtures: Fixture[] = [
  {
    name: "graduate_B",
    description: "Everything done, all grades B → graduates, no honors (GPAX 3.00 < 3.25).",
    progress: makePlan("B"),
    expect: { totalHave: 124, gpax: 3, academicComplete: true, gpaxOk: true, overallDone: true, honors: null },
  },
  {
    name: "graduate_first_class",
    description: "Everything done, straight A, no F/NP, no retake → first-class honors.",
    progress: makePlan("A"),
    expect: { totalHave: 124, gpax: 4, academicComplete: true, overallDone: true, honors: "first" },
  },
  {
    name: "graduate_low_gpax",
    description: "All courses passed with D → academically complete but GPAX 1.00 < 2.00 (eligible for diploma, not degree).",
    progress: makePlan("D"),
    expect: { totalHave: 124, gpax: 1, academicComplete: true, gpaxOk: false, overallDone: false, honors: null },
  },
  {
    name: "graduate_no_kuexite",
    description: "Academics + GPAX fine but KU-EXITE not passed → not done yet.",
    progress: makePlan("B", { kuExite: false }),
    expect: { academicComplete: true, gpaxOk: true, overallDone: false },
  },
  {
    name: "elective_shortfall",
    description: "Only 5 of 6 electives (15/18 credits) → Major-Elective short by 3, not done.",
    progress: makePlan("B", { electiveCount: 5 }),
    expect: {
      totalHave: 121,
      academicComplete: false,
      overallDone: false,
      reqRemaining: { "major.elective": 3 },
      reqSatisfied: { "major.elective": false },
    },
  },
  {
    name: "missing_aesthetics_group",
    description: "30 Gen-Ed credits total, but the Aesthetics group is empty → Gen-Ed not satisfied despite the total.",
    progress: makePlan("B", { misassignAesthetics: true }),
    expect: {
      totalHave: 124,
      academicComplete: false,
      overallDone: false,
      reqSatisfied: { gened: false, "gened.aesthetics": false },
      reqRemaining: { "gened.aesthetics": 3 },
    },
  },
  {
    name: "retake_counts_both",
    description: "01418113 failed (F) then retaken (C+); §22.2 — both grades count. GPAX = (4·2 + 0·3 + 2.5·3)/8 = 1.94.",
    progress: {
      schemaVersion: 1,
      curriculumId: "cs-2565",
      attempts: [
        at("r1", "01418111", "2567/1", "A"),
        at("r2", "01418113", "2567/1", "F"),
        at("r3", "01418113", "2567/2", "C+"),
      ],
      customCourses: [],
      assignments: [],
      flags: { kuExitePassed: false },
    },
    expect: { totalHave: 5, gpax: 1.94, academicComplete: false, honors: null },
  },
  {
    name: "prereq_out_of_order",
    description: "01418232 (needs 01418231) taken a term before 01418231 → soft warning on 232, none on 231.",
    progress: {
      schemaVersion: 1,
      curriculumId: "cs-2565",
      attempts: [
        at("p1", "01418113", "2566/1", "B"),
        at("p2", "01418232", "2567/1", "B"),
        at("p3", "01418231", "2567/2", "B"),
      ],
      customCourses: [],
      assignments: [],
      flags: { kuExitePassed: false },
    },
    expect: { warningsInclude: ["01418232"], warningsExclude: ["01418231", "01418113"] },
  },
  {
    name: "in_progress_year2",
    description: "A realistic mid-program transcript (3 semesters). Far from done.",
    progress: {
      schemaVersion: 1,
      curriculumId: "cs-2565",
      attempts: [
        at("i1", "01418111", "2567/1", "A"),
        at("i2", "01418112", "2567/1", "B+"),
        at("i3", "01417111", "2567/1", "B"),
        at("i4", "01999111", "2567/1", "B"),
        at("i5", "01418113", "2567/2", "A"),
        at("i6", "01418131", "2567/2", "B"),
        at("i7", "01355112", "2567/2", "B"),
        at("i8", "01418231", "2568/1", "B+"),
        at("i9", "01418221", "2568/1", "B"),
        at("i10", "01418233", "2568/1", "C+"),
      ],
      customCourses: [{ code: "01355112", credits: 3, nameEn: "English II" }],
      assignments: [
        { courseCode: "01999111", requirementId: "gened.citizen" },
        { courseCode: "01355112", requirementId: "gened.language.foreign" },
      ],
      flags: { kuExitePassed: false },
    },
    expect: { totalHave: 28, academicComplete: false, overallDone: false },
  },
];

export function findReq(reqs: RequirementStatus[], id: string): RequirementStatus | undefined {
  for (const r of reqs) {
    if (r.id === id) return r;
    if (r.children) {
      const found = findReq(r.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Returns a list of mismatch messages (empty = fixture passed). */
export function checkExpected(audit: AuditResult, e: Expected): string[] {
  const errs: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (got !== want) errs.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  };
  if (e.totalHave !== undefined) eq("totalHave", audit.totalCredits.have, e.totalHave);
  if (e.gpax !== undefined) eq("gpax", audit.gpax, e.gpax);
  if (e.academicComplete !== undefined) eq("academicComplete", audit.verdict.academicComplete, e.academicComplete);
  if (e.gpaxOk !== undefined) eq("gpaxOk", audit.verdict.gpaxOk, e.gpaxOk);
  if (e.overallDone !== undefined) eq("overallDone", audit.verdict.overallDone, e.overallDone);
  if (e.honors !== undefined) eq("honors", audit.verdict.honors, e.honors);
  for (const [id, rem] of Object.entries(e.reqRemaining ?? {})) {
    eq(`req[${id}].remaining`, findReq(audit.requirements, id)?.remainingCredits, rem);
  }
  for (const [id, sat] of Object.entries(e.reqSatisfied ?? {})) {
    eq(`req[${id}].satisfied`, findReq(audit.requirements, id)?.satisfied, sat);
  }
  for (const code of e.warningsInclude ?? []) {
    if (!audit.warnings.some((w) => w.courseCode === code)) errs.push(`expected prereq warning for ${code}`);
  }
  for (const code of e.warningsExclude ?? []) {
    if (audit.warnings.some((w) => w.courseCode === code)) errs.push(`unexpected prereq warning for ${code}`);
  }
  return errs;
}
