import { describe, expect, it } from "vitest";
import { CS_2565 } from "../curriculum/cs-2565";
import { computeAudit } from "./engine";
import { KU_2566 } from "./regulation";
import { checkExpected, fixtures } from "./fixtures";
import type { Progress } from "../storage/types";
import kuCredit from "../../docs/ku-credit.json";

// Same fixtures the zero-dep CLI verifier uses (scripts/verify-engine.ts).
describe("audit engine — transcript fixtures", () => {
  for (const f of fixtures) {
    it(f.name, () => {
      const audit = computeAudit(CS_2565, f.progress, KU_2566);
      expect(checkExpected(audit, f.expect)).toEqual([]);
    });
  }
});

describe("countPassCoursesToward124 flag", () => {
  const rules = fixtures.find((f) => f.name === "gpax_rules_F_retake_W_P_I")!;

  it("counts P-course credits toward 124 when true", () => {
    const audit = computeAudit(CS_2565, rules.progress, KU_2566);
    expect(audit.earnedCredits).toBe(13); // 7 (A–F) + 6 (two P courses)
  });

  it("drops P-course credits when false", () => {
    const audit = computeAudit(CS_2565, rules.progress, { ...KU_2566, countPassCoursesToward124: false });
    expect(audit.earnedCredits).toBe(7); // P courses no longer counted
    expect(audit.earnedCreditsAF).toBe(7); // A–F unaffected
  });
});

describe("acceptance — docs/ku-credit.json (real transcript)", () => {
  const audit = computeAudit(CS_2565, kuCredit as unknown as Progress, KU_2566);

  it("GPAX 2.27 over a 69-credit base", () => {
    expect(audit.gpax).toBe(2.27);
    expect(audit.gpaxCredits).toBe(69);
  });

  it("earned 60 (A–F) / 66 (incl P) → remaining 58", () => {
    expect(audit.earnedCreditsAF).toBe(60);
    expect(audit.earnedCredits).toBe(66);
    expect(audit.totalCredits.remaining).toBe(58);
  });

  it("not ready: failing core (01417111/01417322) + stuck I (01418364)", () => {
    expect(audit.verdict.overallDone).toBe(false);
    expect(audit.verdict.failingRequired).toEqual(expect.arrayContaining(["01417111", "01417322"]));
    expect(audit.verdict.stuckIncomplete).toContain("01418364");
  });
});
