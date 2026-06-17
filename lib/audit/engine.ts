import type { Curriculum, Requirement } from "../curriculum/types";
import type { Attempt, Progress } from "../storage/types";
import type {
  AuditResult,
  GraduationVerdict,
  PrereqWarning,
  RequirementStatus,
} from "./types";
import type { Regulation } from "./regulation";
import { GRADE_POINTS, isGpaxGrade, isPassing } from "./grades";

/**
 * The core: a PURE function of (curriculum, progress, regulation) → audit.
 * No I/O, no framework. Everything the dashboard shows is derived from here.
 */
export function computeAudit(
  curriculum: Curriculum,
  progress: Progress,
  regulation: Regulation,
): AuditResult {
  const creditsOf = (code: string): number =>
    curriculum.courses[code]?.credits ??
    progress.customCourses.find((c) => c.code === code)?.credits ??
    0;

  // Attempts grouped per Course, sorted by term ascending ("YYYY/S" sorts chronologically).
  const attemptsByCourse = new Map<string, Attempt[]>();
  for (const a of progress.attempts) {
    const list = attemptsByCourse.get(a.courseCode) ?? [];
    list.push(a);
    attemptsByCourse.set(a.courseCode, list);
  }
  for (const list of attemptsByCourse.values()) {
    list.sort((x, y) => x.term.localeCompare(y.term));
  }

  // A Course is completed if at least one Attempt passed.
  const completed = new Set<string>();
  for (const [code, list] of attemptsByCourse) {
    if (list.some((a) => isPassing(a.grade))) completed.add(code);
  }

  const assignmentOf = new Map<string, string>();
  for (const asg of progress.assignments) assignmentOf.set(asg.courseCode, asg.requirementId);

  // Courses that auto-home to a fixed Requirement; they never count via assignment elsewhere.
  const fixedMembers = new Set<string>();
  const eachReq = (rs: Requirement[], fn: (r: Requirement) => void) =>
    rs.forEach((r) => {
      fn(r);
      if (r.children) eachReq(r.children, fn);
    });
  eachReq(curriculum.requirements, (r) => {
    if (r.rule.kind === "fixed") r.rule.courses.forEach((c) => fixedMembers.add(c));
  });

  // ---- GPAX: §14.4.1 + §22.2 — all registered credit-course attempts, both pass and fail ----
  let gpSum = 0;
  let crSum = 0;
  for (const [code, list] of attemptsByCourse) {
    const counted = regulation.gpaxCountsAllAttempts ? list : list.slice(-1);
    for (const a of counted) {
      if (isGpaxGrade(a.grade)) {
        const cr = creditsOf(code);
        gpSum += GRADE_POINTS[a.grade] * cr;
        crSum += cr;
      }
    }
  }
  const gpax = crSum > 0 ? Math.round((gpSum / crSum) * 100) / 100 : 0;

  // ---- per-Requirement evaluation ----
  const countedCodes = new Set<string>(); // each completed Course counts toward the total once

  const appliedTo = (req: Requirement): string[] => {
    if (req.rule.kind === "fixed") {
      return req.rule.courses.filter((code) => completed.has(code)); // auto-home
    }
    const out: string[] = [];
    for (const code of completed) {
      if (fixedMembers.has(code)) continue; // fixed Courses only count in their fixed Requirement
      if (assignmentOf.get(code) === req.id) out.push(code);
    }
    return out;
  };

  const evalReq = (req: Requirement): RequirementStatus => {
    if (req.children && req.children.length) {
      const children = req.children.map(evalReq);
      const have = children.reduce((s, c) => s + c.haveCredits, 0);
      return {
        id: req.id,
        nameEn: req.nameEn,
        haveCredits: have,
        needCredits: req.minCredits,
        remainingCredits: Math.max(0, req.minCredits - have),
        satisfied: have >= req.minCredits && children.every((c) => c.satisfied),
        missingMandatory: children.flatMap((c) => c.missingMandatory),
        appliedCourses: children.flatMap((c) => c.appliedCourses),
        children,
      };
    }

    const applied = appliedTo(req);
    for (const code of applied) countedCodes.add(code);
    const have = applied.reduce((s, code) => s + creditsOf(code), 0);

    const missingMandatory: string[] = [];
    if (req.rule.kind === "fixed") {
      for (const code of req.rule.courses) if (!completed.has(code)) missingMandatory.push(code);
    }
    for (const code of req.mandatoryCourses ?? []) {
      if (!applied.includes(code)) missingMandatory.push(code);
    }
    if (req.mandatoryPattern) {
      const re = new RegExp(req.mandatoryPattern.pattern);
      const matched = applied
        .filter((code) => re.test(code))
        .reduce((s, code) => s + creditsOf(code), 0);
      if (matched < req.mandatoryPattern.minCredits) missingMandatory.push(req.mandatoryPattern.label);
    }

    return {
      id: req.id,
      nameEn: req.nameEn,
      haveCredits: have,
      needCredits: req.minCredits,
      remainingCredits: Math.max(0, req.minCredits - have),
      satisfied: have >= req.minCredits && missingMandatory.length === 0,
      missingMandatory,
      appliedCourses: applied,
    };
  };

  const requirements = curriculum.requirements.map(evalReq);

  // ---- credits: earned (progress to 124) is distinct from the GPAX denominator ----
  const need = curriculum.totalCreditsMin;
  const gpaxCredits = crSum; // §22.2: all A–F attempts incl. F and retakes

  const afPassedCodes = new Set<string>(); // courses passed with an A–D grade
  for (const [code, list] of attemptsByCourse) {
    if (list.some((a) => isPassing(a.grade) && a.grade !== "P")) afPassedCodes.add(code);
  }
  let earnedCreditsAF = 0;
  for (const code of afPassedCodes) earnedCreditsAF += creditsOf(code);
  let passOnlyCredits = 0; // courses passed only via P
  for (const code of completed) if (!afPassedCodes.has(code)) passOnlyCredits += creditsOf(code);
  const earnedCredits = earnedCreditsAF + (regulation.countPassCoursesToward124 ? passOnlyCredits : 0);

  const unassignedCompleted = [...completed].filter((code) => !countedCodes.has(code));

  // ---- readiness blockers ----
  const failingRequired: string[] = []; // core/required courses not passed, sitting at F
  for (const code of fixedMembers) {
    if (!completed.has(code) && (attemptsByCourse.get(code) ?? []).some((a) => a.grade === "F")) {
      failingRequired.push(code);
    }
  }
  const stuckIncomplete: string[] = []; // courses with an unresolved I grade
  for (const [code, list] of attemptsByCourse) {
    if (!completed.has(code) && list.some((a) => a.grade === "I")) stuckIncomplete.push(code);
  }

  // ---- invalid assignments ----
  const reqById = new Map<string, Requirement>();
  eachReq(curriculum.requirements, (r) => reqById.set(r.id, r));
  const invalidAssignments = progress.assignments.filter((asg) => {
    const r = reqById.get(asg.requirementId);
    if (!r) return true;
    if (fixedMembers.has(asg.courseCode) && r.rule.kind !== "fixed") return true;
    if (r.rule.kind === "fixed") return !r.rule.courses.includes(asg.courseCode);
    if (r.rule.kind === "pattern") return !new RegExp(r.rule.pattern).test(asg.courseCode);
    return false; // tagged / any
  });

  // ---- prereq warnings (soft) ----
  const warnings: PrereqWarning[] = [];
  const passedTerms = (code: string) =>
    (attemptsByCourse.get(code) ?? []).filter((a) => isPassing(a.grade)).map((a) => a.term);
  for (const code of completed) {
    const course = curriculum.courses[code];
    if (!course) continue;
    const firstTerm = attemptsByCourse.get(code)![0].term;
    const unmet: string[] = [];
    for (const clause of course.prerequisites) {
      const ok = clause.anyOf.some((pc) =>
        passedTerms(pc).some((tp) => (clause.concurrentAllowed ? tp <= firstTerm : tp < firstTerm)),
      );
      if (!ok) unmet.push(clause.anyOf.join(" or "));
    }
    if (unmet.length) warnings.push({ courseCode: code, unmet });
  }

  // ---- verdict ----
  const regularSemesters = new Set(
    progress.attempts.map((a) => a.term).filter((t) => {
      const s = t.split("/")[1];
      return s === "1" || s === "2";
    }),
  ).size;
  const academicComplete = requirements.every((r) => r.satisfied) && earnedCredits >= need;
  const gpaxOk = gpax >= regulation.minGpax;
  const meetsMinDuration = regularSemesters >= regulation.minRegularSemesters;
  const withinTimeLimit = regularSemesters <= regulation.maxYears * 2;
  const kuExitePassed = progress.flags.kuExitePassed;

  // Honors (§29): never an F/NP, never retaken to adjust GPAX, plus the GPAX thresholds.
  const hasFnp = progress.attempts.some((a) => a.grade === "F" || a.grade === "NP");
  const hasRetake = [...attemptsByCourse.values()].some(
    (list) => list.filter((a) => isGpaxGrade(a.grade)).length > 1,
  );
  let honors: "first" | "second" | null = null;
  if (academicComplete && !hasFnp && !hasRetake) {
    if (gpax >= regulation.honors.first) honors = "first";
    else if (gpax >= regulation.honors.second) honors = "second";
  }

  const overallDone =
    academicComplete &&
    gpaxOk &&
    kuExitePassed &&
    meetsMinDuration &&
    withinTimeLimit &&
    failingRequired.length === 0 &&
    stuckIncomplete.length === 0;

  const verdict: GraduationVerdict = {
    academicComplete,
    gpaxOk,
    kuExitePassed,
    meetsMinDuration,
    withinTimeLimit,
    regularSemesters,
    overallDone,
    honors,
    failingRequired,
    stuckIncomplete,
  };

  return {
    requirements,
    totalCredits: { have: earnedCredits, need, remaining: Math.max(0, need - earnedCredits) },
    gpax,
    gpaxCredits,
    earnedCredits,
    earnedCreditsAF,
    verdict,
    warnings,
    invalidAssignments,
    unassignedCompleted,
  };
}
