"use client";

import { useState } from "react";
import type { Requirement } from "@/lib/curriculum/types";
import type { RequirementStatus } from "@/lib/audit/types";
import type { Attempt, Grade } from "@/lib/storage/types";
import { CS_2565 } from "@/lib/curriculum/cs-2565";
import type { useProgress } from "@/hooks/useProgress";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Bar } from "./Bar";
import { CourseRow } from "./CourseRow";
import { AddCourseDialog } from "./AddCourseDialog";

type Api = ReturnType<typeof useProgress>;

export function RequirementCard({
  requirement,
  status,
  api,
  warnings,
  nested = false,
}: {
  requirement: Requirement;
  status: RequirementStatus;
  api: Api;
  warnings: Map<string, string[]>;
  nested?: boolean;
}) {
  const [open, setOpen] = useState(nested);
  const children = requirement.children ?? [];

  const nameOf = (code: string) =>
    CS_2565.courses[code]?.nameEn ?? api.progress.customCourses.find((c) => c.code === code)?.nameEn ?? code;
  const creditsOf = (code: string) =>
    CS_2565.courses[code]?.credits ?? api.progress.customCourses.find((c) => c.code === code)?.credits ?? 0;
  const attemptsFor = (code: string) => api.progress.attempts.filter((a) => a.courseCode === code);

  const rowProps = (code: string, removable: boolean) => ({
    code,
    name: nameOf(code),
    credits: creditsOf(code),
    attempts: attemptsFor(code),
    warning: warnings.get(code),
    onAddAttempt: (term: string, grade: Grade) => api.addAttempt({ courseCode: code, term, grade }),
    onUpdateAttempt: (id: string, patch: Partial<Pick<Attempt, "term" | "grade">>) => api.updateAttempt(id, patch),
    onRemoveAttempt: (id: string) => api.removeAttempt(id),
    onRemoveCourse: removable ? () => api.removeCourse(code) : undefined,
  });

  const fixedCourses = requirement.rule.kind === "fixed" ? requirement.rule.courses : [];
  const assignedCourses = api.progress.assignments
    .filter((a) => a.requirementId === requirement.id)
    .map((a) => a.courseCode);
  const canAdd = requirement.rule.kind !== "fixed" && children.length === 0;

  return (
    <Card className={`block w-full ${nested ? "border shadow-none" : ""} ${status.satisfied ? "border-primary" : ""}`}>
      <Card.Content className="flex flex-col gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 text-left">
          <span aria-hidden className={status.satisfied ? "text-primary" : "text-muted-foreground"}>
            {status.satisfied ? "✓" : open ? "▾" : "▸"}
          </span>
          <Text as={nested ? "h6" : "h4"} className="flex-1">{requirement.nameEn}</Text>
          <span className="shrink-0 text-sm text-muted-foreground">
            {status.haveCredits}/{status.needCredits} cr{status.remainingCredits > 0 ? ` · ${status.remainingCredits} left` : ""}
          </span>
        </button>

        <Bar have={status.haveCredits} need={status.needCredits} />

        {status.missingMandatory.length > 0 && (
          <p className="text-xs text-destructive">Missing: {status.missingMandatory.join(", ")}</p>
        )}

        {open && (
          <div className="mt-1 flex flex-col gap-2">
            {children.length > 0 ? (
              children.map((child) => {
                const childStatus = status.children?.find((c) => c.id === child.id);
                return childStatus ? (
                  <RequirementCard
                    key={child.id}
                    requirement={child}
                    status={childStatus}
                    api={api}
                    warnings={warnings}
                    nested
                  />
                ) : null;
              })
            ) : (
              <>
                {fixedCourses.map((code) => (
                  <CourseRow key={code} {...rowProps(code, false)} />
                ))}
                {assignedCourses.map((code) => (
                  <CourseRow key={code} {...rowProps(code, true)} />
                ))}
                {canAdd && (
                  <AddCourseDialog
                    requirementId={requirement.id}
                    requirementName={requirement.nameEn}
                    api={api}
                    electiveSuggestions={requirement.rule.kind === "pattern"}
                  />
                )}
              </>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
