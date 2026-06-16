# KU-Credit — Implementation Plan (v1)

Companion to [`CONTEXT.md`](../CONTEXT.md) (glossary), [`docs/adr/0001-local-first-single-user-mvp.md`](./adr/0001-local-first-single-user-mvp.md), and the verified curriculum analysis doc. This plan defines the **data model, audit engine, storage schema, and dashboard structure** before any feature code is written. Architecture is **local-first** but seam-ed so accounts/cloud-sync can be added later without rewriting the engine or UI.

Decisions encoded here come from the grilling session — see `CONTEXT.md` for terms. Type sketches below are illustrative (the model), not final code.

---

## 1. Architecture at a glance

Four layers, each depending only on the one(s) above it:

```
┌─────────────────────────────────────────────────────────────┐
│ Curriculum (static, read-only)   lib/curriculum/cs-2565.ts    │  ← seeded from มคอ.2, never mutated
│   Courses, Requirements (tree), Prerequisites                 │
├─────────────────────────────────────────────────────────────┤
│ Progress (user data, persisted)  lib/storage/                 │  ← the only mutable state
│   Attempts, CustomCourses, Assignments, AdminFlags            │
│   behind a ProgressStore interface  ← THE SEAM for cloud later│
├─────────────────────────────────────────────────────────────┤
│ Audit engine (PURE, no I/O)      lib/audit/engine.ts          │  ← (curriculum, progress, regulation) → AuditResult
│   credit sums per Requirement, GPAX, prereq warnings, verdict │     framework-free, fully unit-testable
├─────────────────────────────────────────────────────────────┤
│ UI (client)                      components/audit/, hooks/     │  ← reads progress via hook, runs engine in useMemo
│   AuditDashboard → SummaryHeader + RequirementCard[]          │
└─────────────────────────────────────────────────────────────┘
```

**Why this shape:** the engine is a pure function of (curriculum, progress) → result, so it needs no backend and is trivially testable. Curriculum is static data; progress is the only thing that persists. Swapping browser storage for a cloud API later means writing one new `ProgressStore` implementation — the engine and UI don't change. (See [ADR 0001](./adr/0001-local-first-single-user-mvp.md).)

---

## 2. Data model

### 2.1 Curriculum — static, read-only (`lib/curriculum/types.ts`)

```ts
type Prerequisite = {
  anyOf: string[];           // satisfied if ANY listed code is completed (single course = 1-element array)
  concurrentAllowed?: boolean; // may be taken the same term (e.g. 01418112 ← 01418111)
};                           // a Course's prerequisites[] are ALL required (AND of these OR-clauses)

type Course = {
  code: string;              // "01418231"
  nameTh: string;
  nameEn: string;
  credits: number;           // 3
  prerequisites: Prerequisite[];
};

type RequirementRule =
  | { kind: "fixed";   courses: string[] }   // Core / Major-Required: these exact Courses, all required
  | { kind: "pattern"; regex: string }       // Major-Elective: code matches /^014182/ or higher
  | { kind: "tagged";  tag: string }         // Gen-Ed group: Courses the student tags to this group
  | { kind: "any" };                         // Free-Elective: any KU Course

type Requirement = {
  id: string;                // "major.required", "gened.language.foreign"
  nameTh: string; nameEn: string;
  minCredits: number;        // 58, 13, 9, 6 …
  rule: RequirementRule;
  mandatoryCourses?: string[]; // specific Courses that MUST appear (01999111 in citizen; a 01175xxx PE in wellness)
  children?: Requirement[];  // gened.language → [thai(3), foreign(9), it(1)]; gened → 5 groups
};

type Curriculum = {
  id: "cs-2565";
  totalCreditsMin: 124;
  appliesToAdmitYears: number[]; // [2565, 2566, 2567, 2568]
  courses: Record<string, Course>;
  requirements: Requirement[];   // top level: gened, major.core, major.required, major.elective, free
};
```

The **requirement tree** (with minimums) is the spine of the audit:

```
gened (≥30)
 ├ wellness (≥3, mandatory: one 01175xxx)
 ├ entrepreneurship (≥3)
 ├ language (≥13)
 │  ├ thai (3) ├ foreign (9) └ it (≥1)
 ├ citizen (≥3, mandatory: 01999111)
 └ aesthetics (≥3)
major.core (12, fixed: 01417111, 01417322, 01418131, 01418132)
major.required (58, fixed: the 20 Courses)
major.elective (≥18, pattern: /^014182/)
free (≥6, any)
```

### 2.2 Progress — user data, persisted (`lib/storage/types.ts`)

```ts
type Grade = "A"|"B+"|"B"|"C+"|"C"|"D+"|"D"|"F"|"P"|"NP"|"I"|"S"|"U"|"N";

type Attempt = {
  id: string;
  courseCode: string;        // seeded code, or a CustomCourse code
  term: string;              // "2567/1" — sortable; defines "latest"
  grade: Grade;
};

type CustomCourse = {        // metadata for Courses NOT in the curriculum seed (free-electives, most gen-ed)
  code: string;
  nameTh?: string; nameEn?: string;
  credits: number;
};

type Assignment = {          // MANUAL: which Requirement a Course counts toward
  courseCode: string;
  requirementId: string;
};

type Progress = {
  schemaVersion: number;     // for migrations
  curriculumId: "cs-2565";
  attempts: Attempt[];
  customCourses: CustomCourse[];
  assignments: Assignment[];
  flags: { kuExitePassed: boolean };
};
```

Note: a Course has **one Assignment** but **many Attempts** (retakes). Seeded Core/Required Courses are auto-assigned to their only legal Requirement; everything else the student assigns.

### 2.3 Audit result — computed, ephemeral (`lib/audit/types.ts`)

```ts
type RequirementStatus = {
  id: string;
  haveCredits: number; needCredits: number; remainingCredits: number;
  satisfied: boolean;
  missingMandatory: string[];      // mandatory Courses not yet completed
  appliedCourses: string[];        // Courses counted here
  children?: RequirementStatus[];
};

type PrereqWarning = { courseCode: string; unmet: Prerequisite[] };

type GraduationVerdict = {
  academicComplete: boolean;       // every Requirement satisfied AND total ≥ 124
  gpaxOk: boolean;                 // gpax ≥ regulation.minGpax
  kuExitePassed: boolean;          // manual flag
  regularSemesters: number; withinTimeLimit: boolean; // derived from Attempt terms
  overallDone: boolean;            // all of the above
  honors?: "first" | "second" | null;
};

type AuditResult = {
  requirements: RequirementStatus[];
  totalCredits: { have: number; need: number; remaining: number };
  gpax: number;
  verdict: GraduationVerdict;
  warnings: PrereqWarning[];
  invalidAssignments: Assignment[]; // Course assigned to a Requirement its rule forbids
};
```

---

## 3. Audit engine — pure (`lib/audit/engine.ts`)

Single entry point, no I/O, no React:

```ts
function computeAudit(curriculum: Curriculum, progress: Progress, regulation: Regulation): AuditResult
```

**Grade tables (`lib/audit/grades.ts`):**

```ts
const GRADE_POINTS = { A:4.0, "B+":3.5, B:3.0, "C+":2.5, C:2.0, "D+":1.5, D:1.0, F:0.0 };
const GPAX_GRADES   = Object.keys(GRADE_POINTS);            // only these affect GPAX
const PASSING       = ["A","B+","B","C+","C","D+","D","P"]; // these earn credit toward Requirements
```

**Algorithm:**
1. **Per Course:** `completed` = at least one Attempt has a passing grade (∈ `PASSING`); credit toward a Requirement counts the Course **once** (retaking earns no extra credit). Note GPAX is computed from *all* Attempts (step 6), not just one.
2. **Validate assignments** against each Requirement's `rule` (e.g. a non-`014182xx` Course assigned to `major.elective` → `invalidAssignments`).
3. **Per leaf Requirement:** sum credits of completed Courses assigned to it → `haveCredits`; `satisfied` = `have ≥ min` AND all `fixed`/`mandatoryCourses` completed.
4. **Roll up parents** (gen-ed, language): satisfied = own total-min met AND all children satisfied.
5. **Total credits** = Σ credits of completed Courses that are assigned (each Course counts once, via its single Assignment); `need = 124`. Unassigned completed Courses are surfaced (not silently counted).
6. **GPAX** = Σ(gradePoint × credits) / Σ(credits) over **every** Attempt whose grade ∈ `GPAX_GRADES` — *all registered credit courses, both pass and fail, including both grades of a retake* (reg. **14.4.1 + 22.2**). A `D` retaken to `A` puts the Course's credits into the average **twice**, once at each grade.
7. **Prereq warnings** (soft): for each completed Course, each `Prerequisite` clause must be satisfied by another completed Course with an earlier term (or same term if `concurrentAllowed`). Otherwise → `warnings`.
8. **Verdict:** `academicComplete` (all satisfied + total ≥124) + `gpaxOk` + `kuExitePassed` + `withinTimeLimit` → `overallDone`. `honors` from GPAX thresholds.

**Regulation constants (`lib/audit/regulation.ts`) — VERIFIED against ข้อบังคับฯ 2566 (Task 2 complete):**

```ts
type Regulation = {
  ref: "KU-2566";
  minGpax: 2.0;              // §28.2 ✓ "cumulative GPA of 2.00 or over"
  minRegularSemesters: 6;    // §28.2 ✓ (4-year program; waived for transfer students)
  maxYears: 8;               // §26.3.7 / §19.3 / §18.3 ✓ (2× program years)
  gpaxCountsAllAttempts: true; // §22.2 + §14.4.1 ✓ BOTH/all attempts count — NOT the latest grade
  honors: { first: 3.5; second: 3.25 }; // §29.1.4 ✓ first-class 3.50, second-class 3.25
  requiresKuExite: true;     // separate KU-EXITE announcement (manual flag)
};
```

All values are verified against the official regulation with clause refs inline. The engine reads them as parameters, so any future amendment is a one-line edit.

---

## 4. Storage schema (`lib/storage/`)

**localStorage** — one versioned key, progress kept entirely separate from the static curriculum:

```
key:   "ku-credit:progress"
value: JSON of Progress { schemaVersion, curriculumId, attempts, customCourses, assignments, flags }
```

**The seam (`ProgressStore` interface):** async-friendly from day one so a remote/cloud implementation drops in later without touching callers.

```ts
interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
  exportJson(): Promise<string>;        // backup
  importJson(json: string): Promise<void>;
  subscribe(cb: () => void): () => void; // for useSyncExternalStore
}

class LocalStorageProgressStore implements ProgressStore { /* sync under the hood, Promise-wrapped */ }
// later: class RemoteProgressStore implements ProgressStore { /* fetch() to an API */ }
```

- **Migrations (`migrations.ts`):** on load, if `schemaVersion` < current, run forward migrations. Keeps old saved data working as the model evolves.
- **Backup:** `exportJson`/`importJson` mitigate the "data lives in one browser" trade-off (ADR 0001) — download/upload a `.json`.
- **React binding (`hooks/useProgress.ts`, `'use client'`):** `useSyncExternalStore` over the store (built into React 19 — ideal for an external mutable store), exposing actions (`addAttempt`, `setAssignment`, `addCustomCourse`, `setFlag`, `export`, `import`).

---

## 5. Dashboard component structure (`components/audit/`)

```
app/page.tsx                 (Server Component) ──renders──▶ <AuditDashboard/>
└ AuditDashboard.tsx         'use client'
    progress = useProgress();  audit = useMemo(() => computeAudit(CS2565, progress, REGULATION), [progress])
    ├ SummaryHeader            total/124 bar · GPAX · verdict badges · KU-EXITE toggle · export/import
    └ RequirementCard[]        one per top-level Requirement (gen-ed groups render nested)
        ├ progress bar         haveCredits / needCredits  (+ "remaining N")
        ├ CourseRow[]          seeded Courses: tick-to-complete, grade + term, prereq info + ⚠ warning
        │   └ AttemptEditor    add/edit Attempts (retake history)
        └ "+ Add Course"  ──▶  AddCourseDialog   (quick-add free-elective / gen-ed: code, name, credits, term, grade, requirement preselected)
```

**Client boundary:** only `AuditDashboard` (and `hooks/useProgress`) need `'use client'`; its imported children join the client bundle automatically. `page.tsx` and `layout.tsx` stay Server Components.

**RetroUI mapping:** `Card` → SummaryHeader / RequirementCard · `Dialog` + `Input` → AddCourseDialog · `Button` → actions · `Text` → headings/labels (Text isn't installed yet — `npx shadcn@latest add @retroui/text`, also unblocks the Card build error from earlier).

---

## 6. Folder structure

```
app/
  layout.tsx · page.tsx · styles/global.css
components/
  audit/  AuditDashboard.tsx  SummaryHeader.tsx  RequirementCard.tsx  CourseRow.tsx  AttemptEditor.tsx  AddCourseDialog.tsx
  retroui/  Button  Card  Dialog  Input  (+ Text to add)
hooks/
  useProgress.ts
lib/
  curriculum/  types.ts  cs-2565.ts  index.ts
  audit/       types.ts  grades.ts  regulation.ts  engine.ts  engine.test.ts
  storage/     types.ts  local-store.ts  migrations.ts
```

(Matches the `@/components`, `@/hooks`, `@/lib` aliases already in `components.json`.)

---

## 7. Build sequence (each step has a verifiable check)

0. **Tooling:** add **Vitest** (no test runner exists yet) for the pure engine. → `npx vitest run` works.
1. **Curriculum types + seed** `cs-2565.ts` — 4 core, 20 required, ~35 electives, the gen-ed requirement tree, 2 mandatory Courses. **Use the corrected prereqs** (Task 3), not the doc's table. → type-checks; counts assert 12 + 58 credits.
2. **Grades + engine + tests** — `computeAudit` with unit tests over hand-built transcripts (a finished student → done; a missing-elective student → correct remaining; a retake → latest grade in GPAX). → tests pass. *(Strongest goal — this is the heart.)*
3. **Storage** — `LocalStorageProgressStore` + migrations + export/import. → round-trip save/load/export/import test.
4. **Read-only dashboard** — `useProgress` + `AuditDashboard` + `SummaryHeader` rendering a seeded sample. → progress shows on screen.
5. **RequirementCard + CourseRow** — tick-to-complete, grade/term entry, AttemptEditor. → ticking updates the audit live.
6. **AddCourseDialog** — quick-add free-elective / gen-ed. → adding a free elective lowers its remaining.
7. **Prereq warnings + verdict** — soft warnings; verdict badges; KU-EXITE toggle. *(Verdict thresholds gated on Task 2.)*
8. **Polish** — export/import UI, empty states, mobile layout.

---

## 8. How it grows later (the seams, recap)

- **Accounts / cloud sync** → new `RemoteProgressStore implements ProgressStore`; the async interface and `curriculumId` field are already in place. Engine + UI untouched.
- **More curriculum versions (รหัส 68/69, other programs)** → add a `Curriculum` data module; select by `admitYear → curriculumId`. Tree/engine are version-agnostic.
- **Gen-Ed course catalog** → swap the open quick-add for a synced pick-list later (the `tagged` rule already supports it).

---

## 9. Open items / to verify

- **Task 2 — verify ข้อบังคับฯ 2566** ✅ DONE: `minGpax 2.00` (§28.2), `minRegularSemesters 6` (§28.2), `maxYears 8` (§26.3.7), honors `3.50/3.25` (§29.1.4), grade scale (§14.1), transfer ≤¾ (§20.2.1) all confirmed. **Correction: retake GPAX counts BOTH attempts (§22.2 + §14.4.1), not the latest** — `regulation.ts` and the engine updated accordingly.
- **Task 3 — patch the analysis doc**: the 6 prereq errors (`01418321←01418221`, `01418331←01418132`, `01418332←01418236`, `01418351←01418236`, `01418371←01418221`, `01418490←01418390`) **and** the §4.9 retake claim ("latest grade" → "both attempts count"); ensure `cs-2565.ts` seeds the corrected prereqs.
- **Gen-Ed seed depth:** v1 seeds only the 2 mandatory Courses + the group tree; all other gen-ed Courses are quick-add. A synced catalog is a later enhancement (Caveat #1 of the analysis doc — don't hardcode the open list).
- **Transfer credits** (เทียบโอน, recorded `P`, ≤¾ cap, excluded from GPAX): handled minimally via the `P` grade today; full transfer rules deferred unless needed.
