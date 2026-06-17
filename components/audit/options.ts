import type { Grade } from "@/lib/storage/types";

export const GRADE_OPTIONS: Grade[] = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "W", "P", "NP", "I", "S", "U", "N"];

export const DEFAULT_TERM = "2567/1";

// Term dropdown options: years 2567–2571 × semesters 1 / 2 / summer.
// Summer is stored as "/3" so the engine treats it as a NON-regular semester
// (regular-semester count uses /1 and /2 only — see lib/audit/engine.ts).
function buildTermOptions(): { value: string; label: string }[] {
  const semesters: [string, string][] = [
    ["1", "1"],
    ["2", "2"],
    ["3", "ฤดูร้อน"],
  ];
  const out: { value: string; label: string }[] = [];
  for (let year = 2567; year <= 2571; year++) {
    for (const [sem, label] of semesters) out.push({ value: `${year}/${sem}`, label: `${year}/${label}` });
  }
  return out;
}

export const TERM_OPTIONS = buildTermOptions();
