import { describe, expect, it } from "vitest";
import { CS_2565 } from "../curriculum/cs-2565";
import { computeAudit } from "./engine";
import { KU_2566 } from "./regulation";
import { checkExpected, fixtures } from "./fixtures";

// Same fixtures the zero-dep CLI verifier uses (scripts/verify-engine.ts).
describe("audit engine — transcript fixtures", () => {
  for (const f of fixtures) {
    it(f.name, () => {
      const audit = computeAudit(CS_2565, f.progress, KU_2566);
      expect(checkExpected(audit, f.expect)).toEqual([]);
    });
  }
});
