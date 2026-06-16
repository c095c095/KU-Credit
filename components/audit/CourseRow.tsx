import type { Attempt, Grade } from "@/lib/storage/types";
import { DEFAULT_TERM, GRADE_OPTIONS } from "./options";

const PASSING = new Set<Grade>(["A", "B+", "B", "C+", "C", "D+", "D", "P"]);
const ctrl = "rounded border-2 border-black bg-background px-2 py-1 text-sm";

type Props = {
  code: string;
  name: string;
  credits: number;
  attempts: Attempt[];
  warning?: string[];
  onAddAttempt: (term: string, grade: Grade) => void;
  onUpdateAttempt: (id: string, patch: Partial<Pick<Attempt, "term" | "grade">>) => void;
  onRemoveAttempt: (id: string) => void;
  onRemoveCourse?: () => void;
};

export function CourseRow(props: Props) {
  const { code, name, credits, attempts, warning } = props;
  const passed = attempts.some((a) => PASSING.has(a.grade));

  return (
    <div className="border-b border-black/15 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span aria-hidden className={passed ? "text-primary" : "text-muted-foreground"}>{passed ? "✓" : "○"}</span>
        <span className="font-mono text-xs text-muted-foreground">{code}</span>
        <span className="flex-1 text-sm">{name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{credits} cr</span>
        <button
          type="button"
          onClick={() => props.onAddAttempt(DEFAULT_TERM, "B")}
          className="shrink-0 rounded border-2 border-black px-2 text-xs"
        >
          + attempt
        </button>
        {props.onRemoveCourse && (
          <button type="button" onClick={props.onRemoveCourse} className="shrink-0 px-1 text-destructive" title="Remove course">
            ✕
          </button>
        )}
      </div>

      {warning?.length ? <p className="pl-6 pt-1 text-xs text-destructive">⚠ prereq: {warning.join("; ")}</p> : null}

      {attempts.map((a) => (
        <div key={a.id} className="flex items-center gap-2 pl-6 pt-1">
          <input
            value={a.term}
            onChange={(e) => props.onUpdateAttempt(a.id, { term: e.target.value })}
            className={`${ctrl} w-20`}
            aria-label={`${code} term`}
          />
          <select
            value={a.grade}
            onChange={(e) => props.onUpdateAttempt(a.id, { grade: e.target.value as Grade })}
            className={ctrl}
            aria-label={`${code} grade`}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button type="button" onClick={() => props.onRemoveAttempt(a.id)} className="px-1 text-destructive" title="Remove attempt">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
