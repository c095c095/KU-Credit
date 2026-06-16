import type { Progress } from "./types";

export const SCHEMA_VERSION = 1;

export function emptyProgress(): Progress {
  return {
    schemaVersion: SCHEMA_VERSION,
    curriculumId: "cs-2565",
    attempts: [],
    customCourses: [],
    assignments: [],
    flags: { kuExitePassed: false },
  };
}

/**
 * Coerce arbitrary parsed JSON into a valid current-version Progress — defensive against
 * corrupt or older localStorage payloads. Add forward migrations here as SCHEMA_VERSION grows.
 */
export function migrate(raw: unknown): Progress {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const p = raw as Partial<Progress>;
  // Future: while ((p.schemaVersion ?? 0) < SCHEMA_VERSION) { ...upgrade step... }
  return {
    schemaVersion: SCHEMA_VERSION,
    curriculumId: typeof p.curriculumId === "string" ? p.curriculumId : "cs-2565",
    attempts: Array.isArray(p.attempts) ? p.attempts : [],
    customCourses: Array.isArray(p.customCourses) ? p.customCourses : [],
    assignments: Array.isArray(p.assignments) ? p.assignments : [],
    flags: { kuExitePassed: Boolean(p.flags?.kuExitePassed) },
  };
}
