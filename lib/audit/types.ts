import type { Assignment } from "../storage/types";

export type RequirementStatus = {
  id: string;
  nameEn: string;
  haveCredits: number;
  needCredits: number;
  remainingCredits: number;
  satisfied: boolean;
  missingMandatory: string[]; // mandatory Course codes / labels not yet satisfied
  appliedCourses: string[]; // Course codes counted toward this Requirement
  children?: RequirementStatus[];
};

export type PrereqWarning = {
  courseCode: string;
  unmet: string[]; // human-readable unmet clauses, e.g. "01418113 or 01418212"
};

export type GraduationVerdict = {
  academicComplete: boolean; // every Requirement satisfied AND total ≥ 124
  gpaxOk: boolean; // gpax ≥ minGpax
  kuExitePassed: boolean;
  meetsMinDuration: boolean; // regular semesters ≥ minRegularSemesters
  withinTimeLimit: boolean; // regular semesters ≤ maxYears × 2
  regularSemesters: number;
  overallDone: boolean;
  honors: "first" | "second" | null;
};

export type AuditResult = {
  requirements: RequirementStatus[];
  totalCredits: { have: number; need: number; remaining: number };
  gpax: number;
  verdict: GraduationVerdict;
  warnings: PrereqWarning[];
  invalidAssignments: Assignment[]; // a Course assigned to a Requirement its rule forbids
  unassignedCompleted: string[]; // completed Courses not counted toward any Requirement
};
