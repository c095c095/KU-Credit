// Progress = the only mutable, persisted state (see docs/implementation-plan.md §2.2).
// Kept separate from the static curriculum so a cloud store can replace localStorage later.

export type Grade =
  | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F" // graded credit courses (count in GPAX)
  | "P" | "NP" // pass / not-pass (no GPAX): transfer credits, non-credit internship, 01355111
  | "I" | "S" | "U" | "N"; // incomplete / audit satisfactory-unsatisfactory / not reported

/** One enrollment of a Course in a term. A Course may have several Attempts (retakes). */
export type Attempt = {
  id: string;
  courseCode: string;
  term: string; // "YYYY/S" e.g. "2567/1"; semester 1|2 regular, 3 summer. Sorts chronologically.
  grade: Grade;
};

/** Metadata for a Course NOT in the curriculum seed (free-electives, most Gen-Ed). */
export type CustomCourse = {
  code: string;
  nameTh?: string;
  nameEn?: string;
  credits: number;
};

/** Manual: which Requirement a Course counts toward. Fixed Core/Required auto-home (no entry needed). */
export type Assignment = {
  courseCode: string;
  requirementId: string;
};

export type Progress = {
  schemaVersion: number;
  curriculumId: string;
  attempts: Attempt[];
  customCourses: CustomCourse[];
  assignments: Assignment[];
  flags: { kuExitePassed: boolean };
};
