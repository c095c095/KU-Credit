"use client";

import { useState } from "react";
import { Dialog } from "@/components/retroui/Dialog";
import { Button } from "@/components/retroui/Button";
import { Input } from "@/components/retroui/Input";
import { Text } from "@/components/retroui/Text";
import { CS_2565, ELECTIVE_CODES } from "@/lib/curriculum/cs-2565";
import type { Grade } from "@/lib/storage/types";
import type { useProgress } from "@/hooks/useProgress";
import { DEFAULT_TERM, GRADE_OPTIONS } from "./options";

type Api = ReturnType<typeof useProgress>;

export function AddCourseDialog({
  requirementId,
  requirementName,
  api,
  electiveSuggestions,
}: {
  requirementId: string;
  requirementName: string;
  api: Api;
  electiveSuggestions?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("3");
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [grade, setGrade] = useState<Grade>("B");

  const seeded = CS_2565.courses[code.trim()];

  const reset = () => {
    setCode("");
    setName("");
    setCredits("3");
    setTerm(DEFAULT_TERM);
    setGrade("B");
  };

  const submit = () => {
    const c = code.trim();
    if (!c) return;
    api.addCourse({
      code: c,
      nameEn: name.trim() || undefined,
      credits: seeded ? seeded.credits : Number(credits) || 0,
      seeded: Boolean(seeded),
      requirementId,
      term: term.trim() || DEFAULT_TERM,
      grade,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<Button size="sm" variant="outline">+ เพิ่มวิชา</Button>} />
      <Dialog.Content size="sm">
        <Dialog.Header>
          <Text as="h5">เพิ่มวิชาเข้า{requirementName}</Text>
        </Dialog.Header>

        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-sm">
            รหัสวิชา
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="เช่น 01418362"
              list={electiveSuggestions ? "ku-elective-codes" : undefined}
            />
          </label>
          {electiveSuggestions && (
            <datalist id="ku-elective-codes">
              {ELECTIVE_CODES.map((c) => (
                <option key={c} value={c}>{CS_2565.courses[c]?.nameTh}</option>
              ))}
            </datalist>
          )}

          {seeded ? (
            <Text as="p" className="text-sm text-muted-foreground">{seeded.nameTh} · {seeded.credits} นก.</Text>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                ชื่อวิชา
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อวิชา" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                หน่วยกิต
                <Input type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} />
              </label>
            </>
          )}

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              ภาคเรียน
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="2567/1" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              เกรด
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
                className="rounded border-2 border-black bg-background px-2 py-2 text-sm"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <Dialog.Footer>
          <Dialog.Close render={<Button size="sm" variant="outline">ยกเลิก</Button>} />
          <Button size="sm" onClick={submit}>เพิ่ม</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
