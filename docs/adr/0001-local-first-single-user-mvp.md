# Local-first, single-user MVP

The *KU Computer Science Curriculum 2565 — Degree Audit System Analysis* doc specifies a versioned, multi-student degree-audit backend (relational schema, Gen-Ed sync from the registrar, `my.ku.th` integration). For v1 we deliberately build a **local-first, single-user** web app instead: the 2565 CS curriculum is seeded as static client-side data, the student's progress lives in browser storage, and there are no accounts, server, or database. We chose this for the fastest path to the stated goal ("easy to input what subjects/credits are left"), zero hosting and auth cost, and because one student's progress is small, personal data.

## Consequences

Curriculum data is kept strictly separate from progress data, and all persistence goes through a `ProgressStore` interface — so accounts, cloud sync, and additional curriculum versions can be added later by adding a new store implementation and curriculum module, without touching the audit engine or UI. The trade-off: no cross-device sync or sharing until that work is done, and progress is bound to one browser (mitigated by JSON export/import).
