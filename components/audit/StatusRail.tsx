import type { ChangeEvent } from "react";
import type { AuditResult } from "@/lib/audit/types";
import type { useProgress } from "@/hooks/useProgress";
import { Card } from "@/components/retroui/Card";
import { Text } from "@/components/retroui/Text";
import { Button } from "@/components/retroui/Button";
import { Bar } from "./Bar";
import type { GapItem } from "./gaps";

type Api = ReturnType<typeof useProgress>;

const gate = (ok: boolean, label: string) => `${ok ? "✓" : "✗"}${label}`;

export function StatusRail({ audit, gaps, api }: { audit: AuditResult; gaps: GapItem[]; api: Api }) {
  const v = audit.verdict;
  const tc = audit.totalCredits;

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
    <Card className="block h-fit w-full min-w-0 md:sticky md:top-4">
      <Card.Content className="flex flex-col gap-4">
        <Text as="h1" className={`break-words ${v.overallDone ? "text-primary" : ""}`}>
          {v.overallDone ? "🎓 พร้อมจบแล้ว" : "ยังไม่พร้อมจบ"}
        </Text>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">หน่วยกิตรวม</span>
            <span className="shrink-0">{tc.have}/{tc.need} นก.</span>
          </div>
          <Bar have={tc.have} need={tc.need} />
          <div className="flex justify-between gap-2 text-sm">
            <span className={`min-w-0 truncate ${tc.remaining > 0 ? "text-destructive" : "text-primary"}`}>
              {tc.remaining > 0 ? `ขาดอีก ${tc.remaining} นก.` : "ครบหน่วยกิตแล้ว"}
            </span>
            <span className="shrink-0">GPAX {audit.gpax.toFixed(2)} {v.gpaxOk ? "✓" : "✗"}</span>
          </div>
        </div>

        <div className="rounded border-2 border-black p-3">
          <Text as="h5" className="mb-2">⚑ สิ่งที่ยังขาด</Text>
          {gaps.length === 0 ? (
            <p className="text-sm text-primary">ไม่มีสิ่งที่ขาด — พร้อมจบ 🎓</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {gaps.map((g, i) => (
                <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 [overflow-wrap:anywhere]">{g.label}</span>
                  <span className="shrink-0 whitespace-nowrap text-muted-foreground">{g.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          เงื่อนไขสำเร็จการศึกษา:{" "}
          {gate(v.academicComplete, "124นก.")} {gate(v.gpaxOk, "GPAX")} {gate(v.meetsMinDuration, "6ภาค")}{" "}
          {gate(v.withinTimeLimit, "8ปี")} {gate(v.kuExitePassed, "EXITE")}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 cursor-pointer accent-primary"
            checked={api.progress.flags.kuExitePassed}
            onChange={(e) => api.setKuExite(e.target.checked)}
          />
          สอบผ่าน KU-EXITE
        </label>

        <div className="flex flex-col gap-2 border-t-2 border-black pt-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={onExport}>ส่งออก</Button>
            <label className="cursor-pointer rounded border-2 border-black px-3 py-1.5 font-head text-sm shadow-md transition hover:translate-y-0.5 hover:shadow-sm">
              นำเข้า
              <input type="file" accept="application/json" hidden onChange={onImport} />
            </label>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("ล้างข้อมูลความก้าวหน้าทั้งหมด?")) api.reset();
            }}
          >
            ล้างข้อมูล
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
