"use client";

import { useSyncExternalStore } from "react";
import { LocalStorageProgressStore } from "@/lib/storage/local-store";
import { emptyProgress } from "@/lib/storage/migrations";
import type { Attempt, CustomCourse, Grade, Progress } from "@/lib/storage/types";

// One store per tab. Constructed lazily-safe (SSR returns empty; client reads localStorage).
const store = new LocalStorageProgressStore();
const SERVER_SNAPSHOT = emptyProgress();

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `a-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Reactive access to the student's Progress + mutation helpers. Each helper produces a new
 * Progress and persists it; the dashboard re-renders via useSyncExternalStore.
 */
export function useProgress() {
  const progress = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.getSnapshot(),
    () => SERVER_SNAPSHOT,
  );

  const save = (next: Progress) => void store.save(next);

  return {
    progress,

    addAttempt: (attempt: Omit<Attempt, "id">) =>
      save({ ...progress, attempts: [...progress.attempts, { ...attempt, id: newId() }] }),

    updateAttempt: (id: string, patch: Partial<Omit<Attempt, "id">>) =>
      save({
        ...progress,
        attempts: progress.attempts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }),

    removeAttempt: (id: string) =>
      save({ ...progress, attempts: progress.attempts.filter((a) => a.id !== id) }),

    setAssignment: (courseCode: string, requirementId: string) =>
      save({
        ...progress,
        assignments: [
          ...progress.assignments.filter((x) => x.courseCode !== courseCode),
          { courseCode, requirementId },
        ],
      }),

    removeAssignment: (courseCode: string) =>
      save({ ...progress, assignments: progress.assignments.filter((x) => x.courseCode !== courseCode) }),

    upsertCustomCourse: (course: CustomCourse) =>
      save({
        ...progress,
        customCourses: [...progress.customCourses.filter((x) => x.code !== course.code), course],
      }),

    removeCustomCourse: (code: string) =>
      save({ ...progress, customCourses: progress.customCourses.filter((x) => x.code !== code) }),

    /** Add a Course in one write: custom metadata (if not seeded) + first Attempt + Requirement assignment. */
    addCourse: (input: {
      code: string;
      nameEn?: string;
      credits: number;
      seeded: boolean;
      requirementId: string;
      term: string;
      grade: Grade;
    }) =>
      save({
        ...progress,
        customCourses: input.seeded
          ? progress.customCourses
          : [
              ...progress.customCourses.filter((c) => c.code !== input.code),
              { code: input.code, nameEn: input.nameEn, credits: input.credits },
            ],
        attempts: [...progress.attempts, { id: newId(), courseCode: input.code, term: input.term, grade: input.grade }],
        assignments: [
          ...progress.assignments.filter((a) => a.courseCode !== input.code),
          { courseCode: input.code, requirementId: input.requirementId },
        ],
      }),

    /** Remove a Course entirely — all Attempts, its assignment, and any custom metadata. */
    removeCourse: (code: string) =>
      save({
        ...progress,
        attempts: progress.attempts.filter((a) => a.courseCode !== code),
        assignments: progress.assignments.filter((a) => a.courseCode !== code),
        customCourses: progress.customCourses.filter((c) => c.code !== code),
      }),

    setKuExite: (passed: boolean) =>
      save({ ...progress, flags: { ...progress.flags, kuExitePassed: passed } }),

    reset: () => save(emptyProgress()),
    exportJson: () => store.exportJson(),
    importJson: (json: string) => store.importJson(json),
  };
}
