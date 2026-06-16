// Static, read-only curriculum model (see docs/implementation-plan.md §2.1).

/** A prerequisite clause: satisfied if ANY listed code is completed. A Course's
 *  prerequisites[] must ALL be satisfied (AND of these OR-clauses). */
export type Prerequisite = {
  anyOf: string[];
  concurrentAllowed?: boolean; // may be taken in the same term (e.g. 01418112 ← 01418111)
};

export type Course = {
  code: string;
  nameTh: string;
  nameEn: string;
  credits: number;
  prerequisites: Prerequisite[];
};

export type RequirementRule =
  | { kind: "fixed"; courses: string[] } // Core / Major-Required: these exact Courses, all required
  | { kind: "pattern"; pattern: string } // Major-Elective: code matches this regex (e.g. "^014182")
  | { kind: "tagged"; tag: string } // Gen-Ed group: Courses the student manually assigns here
  | { kind: "any" }; // Free-Elective: any KU Course assigned here

export type Requirement = {
  id: string; // "major.required", "gened.language.foreign"
  nameTh: string;
  nameEn: string;
  minCredits: number;
  rule: RequirementRule;
  /** Specific Courses that must be completed AND applied here (e.g. 01999111 in citizen). */
  mandatoryCourses?: string[];
  /** A sub-minimum of credits whose codes match a pattern (e.g. ≥1 PE credit from ^01175 in wellness). */
  mandatoryPattern?: { pattern: string; minCredits: number; label: string };
  children?: Requirement[];
};

export type Curriculum = {
  id: string;
  totalCreditsMin: number;
  appliesToAdmitYears: number[];
  courses: Record<string, Course>;
  requirements: Requirement[];
};
