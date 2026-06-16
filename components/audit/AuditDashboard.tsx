"use client";

import { useMemo } from "react";
import { CS_2565 } from "@/lib/curriculum/cs-2565";
import { computeAudit } from "@/lib/audit/engine";
import { KU_2566 } from "@/lib/audit/regulation";
import { useProgress } from "@/hooks/useProgress";
import { SummaryHeader } from "./SummaryHeader";
import { RequirementCard } from "./RequirementCard";

export function AuditDashboard() {
  const api = useProgress();
  const audit = useMemo(() => computeAudit(CS_2565, api.progress, KU_2566), [api.progress]);
  const warnings = useMemo(
    () => new Map(audit.warnings.map((w) => [w.courseCode, w.unmet] as [string, string[]])),
    [audit],
  );

  return (
    <div className="flex flex-col gap-6">
      <SummaryHeader audit={audit} api={api} />
      <div className="flex flex-col gap-4">
        {CS_2565.requirements.map((req) => {
          const status = audit.requirements.find((r) => r.id === req.id);
          return status ? (
            <RequirementCard key={req.id} requirement={req} status={status} api={api} warnings={warnings} />
          ) : null;
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Local-only · your progress is saved in this browser · curriculum {CS_2565.id}
      </p>
    </div>
  );
}
