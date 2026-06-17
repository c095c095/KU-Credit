"use client";

import { useState } from "react";
import type { Requirement } from "@/lib/curriculum/types";
import type { RequirementStatus } from "@/lib/audit/types";
import type { Attempt, Grade } from "@/lib/storage/types";
import { CS_2565 } from "@/lib/curriculum/cs-2565";
import type { useProgress } from "@/hooks/useProgress";
import { Text } from "@/components/retroui/Text";
import { Bar } from "./Bar";
import { CourseRow } from "./CourseRow";
import { AddCourseDialog } from "./AddCourseDialog";

type Api = ReturnType<typeof useProgress>;

export function RequirementRow({
  requirement,
  status,
  api,
  warnings,
  open,
  onToggle,
  nested = false,
}: {
  requirement: Requirement;
  status: RequirementStatus;
  api: Api;
  warnings: Map<string, string[]>;
  open: boolean;
  onToggle: () => void;
  nested?: boolean;
}) {
  const children = requirement.children ?? [];
  const [openChild, setOpenChild] = useState<string | null>(null);

  const nameOf = (code: string) =>
    CS_2565.courses[code]?.nameTh ?? api.progress.customCourses.find((c) => c.code === code)?.nameEn ?? code;
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

  const icon = status.satisfied ? "✓" : status.haveCredits > 0 ? "⚠" : "○";

  return (
    <div className={`rounded border-2 ${status.satisfied ? "border-black/25" : "border-black"} ${nested ? "" : "bg-card"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left">
        <span aria-hidden className={status.satisfied ? "text-primary" : "text-foreground"}>{icon}</span>
        <Text as={nested ? "p" : "h6"} className="min-w-0 max-w-[45%] shrink truncate">{requirement.nameTh}</Text>
        <div className="hidden min-w-16 flex-1 sm:block">
          <Bar have={status.haveCredits} need={status.needCredits} />
        </div>
        <span className="ms-auto shrink-0 text-xs text-muted-foreground sm:ms-0">
          {status.haveCredits}/{status.needCredits}
          {status.remainingCredits > 0 ? ` · ขาด ${status.remainingCredits}` : ""}
        </span>
        <span aria-hidden className="shrink-0 text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>

      <div className="px-3 pb-1 sm:hidden">
        <Bar have={status.haveCredits} need={status.needCredits} />
      </div>

      {!open && status.missingMandatory.length > 0 && status.missingMandatory.length <= 3 && (
        <p className="px-3 pb-2 text-xs text-destructive break-words">ยังไม่มี: {status.missingMandatory.join(", ")}</p>
      )}

      {open && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {children.length > 0 ? (
            children.map((child) => {
              const childStatus = status.children?.find((c) => c.id === child.id);
              return childStatus ? (
                <RequirementRow
                  key={child.id}
                  requirement={child}
                  status={childStatus}
                  api={api}
                  warnings={warnings}
                  nested
                  open={openChild === child.id}
                  onToggle={() => setOpenChild((cur) => (cur === child.id ? null : child.id))}
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
                  requirementName={requirement.nameTh}
                  api={api}
                  electiveSuggestions={requirement.rule.kind === "pattern"}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
