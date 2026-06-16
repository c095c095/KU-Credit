import type { Progress, ProgressStore } from "./types";
import { SCHEMA_VERSION, emptyProgress, migrate } from "./migrations";

export const STORAGE_KEY = "ku-credit:progress";

/**
 * Local-first ProgressStore backed by localStorage. Holds an in-memory cache so getSnapshot()
 * is synchronous (for useSyncExternalStore); writes persist + notify. Listens for cross-tab
 * `storage` events. Safe to construct during SSR (no window → empty, in-memory only).
 */
export class LocalStorageProgressStore implements ProgressStore {
  private current: Progress;
  private listeners = new Set<() => void>();

  constructor() {
    this.current = this.read();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY) {
          this.current = this.read();
          this.emit();
        }
      });
    }
  }

  private read(): Progress {
    if (typeof window === "undefined") return emptyProgress();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? migrate(JSON.parse(raw)) : emptyProgress();
    } catch {
      return emptyProgress();
    }
  }

  private write(next: Progress): void {
    this.current = { ...next, schemaVersion: SCHEMA_VERSION };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
      } catch {
        // quota exceeded / storage disabled — keep the in-memory copy
      }
    }
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  getSnapshot(): Progress {
    return this.current;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async save(next: Progress): Promise<void> {
    this.write(next);
  }

  exportJson(): string {
    return JSON.stringify(this.current, null, 2);
  }

  async importJson(json: string): Promise<void> {
    this.write(migrate(JSON.parse(json)));
  }
}
