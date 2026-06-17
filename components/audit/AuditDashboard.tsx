"use client";

import { useMemo, useState } from "react";
import { CS_2565 } from "@/lib/curriculum/cs-2565";
import { computeAudit } from "@/lib/audit/engine";
import { KU_2566 } from "@/lib/audit/regulation";
import type { Requirement } from "@/lib/curriculum/types";
import type { RequirementStatus } from "@/lib/audit/types";
import { useProgress } from "@/hooks/useProgress";
import { Text } from "@/components/retroui/Text";
import { StatusRail } from "./StatusRail";
import { RequirementRow } from "./RequirementRow";
import { deriveGaps } from "./gaps";

// id → Thai name, indexed once from the curriculum tree (for the gap list).
const NAME_TH = new Map<string, string>();
(function index(reqs: Requirement[]) {
  for (const r of reqs) {
    NAME_TH.set(r.id, r.nameTh);
    if (r.children) index(r.children);
  }
})(CS_2565.requirements);
const nameThById = (id: string) => NAME_TH.get(id) ?? id;

export function AuditDashboard() {
  const api = useProgress();
  const audit = useMemo(() => computeAudit(CS_2565, api.progress, KU_2566), [api.progress]);
  const gaps = useMemo(() => deriveGaps(audit, nameThById), [audit]);
  const warnings = useMemo(
    () => new Map(audit.warnings.map((w) => [w.courseCode, w.unmet] as [string, string[]])),
    [audit],
  );
  const [openId, setOpenId] = useState<string | null>(null);

  // Unmet requirements first, otherwise curriculum order (stable sort).
  const rows = useMemo(() => {
    const list: { req: Requirement; status: RequirementStatus }[] = [];
    for (const req of CS_2565.requirements) {
      const status = audit.requirements.find((r) => r.id === req.id);
      if (status) list.push({ req, status });
    }
    return list.sort((a, b) => Number(a.status.satisfied) - Number(b.status.satisfied));
  }, [audit]);

  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[340px_minmax(0,1fr)]">
      <StatusRail audit={audit} gaps={gaps} api={api} />
      <section className="flex min-w-0 flex-col gap-3">
        <Text as="h4">หมวดการเรียน</Text>
        {rows.map(({ req, status }) => (
          <RequirementRow
            key={req.id}
            requirement={req}
            status={status}
            api={api}
            warnings={warnings}
            open={openId === req.id}
            onToggle={() => setOpenId((cur) => (cur === req.id ? null : req.id))}
          />
        ))}
        <p className="text-center text-xs text-muted-foreground">
          เก็บข้อมูลในเบราว์เซอร์นี้ · หลักสูตร {CS_2565.id}
        </p>
      </section>
    </div>
  );
}
