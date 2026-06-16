import type { ChangeEvent } from "react";
import type { AuditResult } from "@/lib/audit/types";
import type { useProgress } from "@/hooks/useProgress";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Bar } from "./Bar";

type Api = ReturnType<typeof useProgress>;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border-2 border-black p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-head text-lg">{value}</div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span aria-hidden className={ok ? "text-primary" : "text-muted-foreground"}>{ok ? "✓" : "○"}</span>
      {label}
    </li>
  );
}

export function SummaryHeader({ audit, api }: { audit: AuditResult; api: Api }) {
  const v = audit.verdict;

  const onExport = () => {
    const blob = new Blob([api.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ku-credit.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void file.text().then((text) => api.importJson(text));
    e.target.value = "";
  };

  return (
    <Card className="block w-full">
      <Card.Content className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text as="h1">KU-Credit</Text>
          <span
            className={`rounded border-2 border-black px-3 py-1 font-head text-sm ${
              v.overallDone ? "bg-primary" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {v.overallDone ? "🎓 Ready to graduate" : "In progress"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>Total credits</span>
            <span>
              {audit.totalCredits.have} / {audit.totalCredits.need}
              {audit.totalCredits.remaining > 0 ? ` · ${audit.totalCredits.remaining} left` : ""}
            </span>
          </div>
          <Bar have={audit.totalCredits.have} need={audit.totalCredits.need} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="GPAX" value={audit.gpax.toFixed(2)} />
          <Stat label="Honors" value={v.honors ?? "—"} />
          <Stat label="Reg. semesters" value={String(v.regularSemesters)} />
          <Stat label="Remaining" value={String(audit.totalCredits.remaining)} />
        </div>

        <ul className="flex flex-col gap-1">
          <Check ok={v.academicComplete} label="All requirements met (≥124 credits)" />
          <Check ok={v.gpaxOk} label="GPAX ≥ 2.00" />
          <Check ok={v.meetsMinDuration} label="≥ 6 regular semesters" />
          <Check ok={v.withinTimeLimit} label="Within the 8-year limit" />
          <li className="flex items-center gap-2 text-sm">
            <input
              id="kuexite"
              type="checkbox"
              className="size-4"
              checked={api.progress.flags.kuExitePassed}
              onChange={(e) => api.setKuExite(e.target.checked)}
            />
            <label htmlFor="kuexite">KU-EXITE passed</label>
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onExport}>Export</Button>
          <label className="cursor-pointer rounded border-2 border-black px-3 py-1.5 font-head text-sm shadow-md transition hover:translate-y-0.5 hover:shadow-sm">
            Import
            <input type="file" accept="application/json" hidden onChange={onImport} />
          </label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("Reset all progress?")) api.reset();
            }}
          >
            Reset
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
