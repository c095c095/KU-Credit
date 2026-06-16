import { beforeEach, describe, expect, it } from "vitest";
import { emptyProgress, migrate, SCHEMA_VERSION } from "./migrations";
import { LocalStorageProgressStore } from "./local-store";

// Minimal in-memory localStorage + window mock (vitest runs in the node environment).
function installStorageMock() {
  const mem = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = {
    localStorage,
    addEventListener() {},
    removeEventListener() {},
  };
}

describe("migrations", () => {
  it("emptyProgress carries the current schema and defaults", () => {
    const p = emptyProgress();
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.attempts).toEqual([]);
    expect(p.flags.kuExitePassed).toBe(false);
  });

  it("migrate fills defaults from corrupt or partial input", () => {
    expect(migrate(null).attempts).toEqual([]);
    expect(migrate({ attempts: "not-an-array" }).attempts).toEqual([]);
    const p = migrate({
      curriculumId: "cs-2565",
      attempts: [{ id: "a", courseCode: "01418111", term: "2567/1", grade: "A" }],
    });
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.attempts).toHaveLength(1);
  });
});

describe("LocalStorageProgressStore", () => {
  beforeEach(() => installStorageMock());

  it("round-trips save → persisted → new instance reads it back", async () => {
    const s1 = new LocalStorageProgressStore();
    expect(s1.getSnapshot().attempts).toEqual([]);

    await s1.save({ ...emptyProgress(), flags: { kuExitePassed: true } });
    expect(s1.getSnapshot().flags.kuExitePassed).toBe(true);

    const s2 = new LocalStorageProgressStore();
    expect(s2.getSnapshot().flags.kuExitePassed).toBe(true);
  });

  it("export → import round-trips through JSON", async () => {
    const s1 = new LocalStorageProgressStore();
    await s1.save({ ...emptyProgress(), customCourses: [{ code: "01101111", credits: 3 }] });
    const json = s1.exportJson();

    installStorageMock(); // fresh storage
    const s2 = new LocalStorageProgressStore();
    await s2.importJson(json);
    expect(s2.getSnapshot().customCourses[0]?.code).toBe("01101111");
  });

  it("notifies subscribers on save and stops after unsubscribe", async () => {
    const s = new LocalStorageProgressStore();
    let calls = 0;
    const unsubscribe = s.subscribe(() => calls++);
    await s.save(emptyProgress());
    expect(calls).toBe(1);
    unsubscribe();
    await s.save(emptyProgress());
    expect(calls).toBe(1);
  });
});
