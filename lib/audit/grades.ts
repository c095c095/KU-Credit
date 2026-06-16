import type { Grade } from "../storage/types";

/** KU grade points — ข้อบังคับฯ 2566 §14.1 (verified). */
export const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  "D+": 1.5,
  D: 1.0,
  F: 0.0,
};

/** A graded credit course — counts in GPAX (§14.4.1: "all registered credit courses, both pass and fail"). */
export function isGpaxGrade(g: Grade): boolean {
  return g in GRADE_POINTS;
}

const PASSING = new Set<Grade>(["A", "B+", "B", "C+", "C", "D+", "D", "P"]);

/** Earns credit toward a Requirement (lowest passing grade is D; P passes; F/NP do not). */
export function isPassing(g: Grade): boolean {
  return PASSING.has(g);
}
