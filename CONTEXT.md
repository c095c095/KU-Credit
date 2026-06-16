# KU-Credit

A personal degree-audit tool that tracks one Kasetsart University Computer Science student's progress toward graduation under the วท.บ. Computer Science curriculum (revision 2565, รหัส 67), computing what credits remain and their GPAX from the Courses they have completed.

## Language

**Course**:
A single รายวิชา in the curriculum, identified by an 8-digit code (e.g. `01418231`) and a fixed credit value.
_Avoid_: subject, class, module

**Requirement**:
A part of the curriculum that is satisfied by a minimum number of credits — e.g. Major-Elective (≥18), the Wellness Gen-Ed group (≥3), Core (12). Completed Courses are applied to Requirements.
_Avoid_: category, bucket, slot

**Completed Course**:
A Course whose latest Attempt passed, contributing its credits to exactly one Requirement.
_Avoid_: taken course, finished subject

**Attempt**:
One enrollment of a Course in a specific term, carrying a grade. A Course may have several Attempts (retakes); only the latest Attempt's grade counts toward GPAX.
_Avoid_: enrollment, try

**Remaining credits**:
For a Requirement, its minimum target minus the credits of Completed Courses applied to it. The headline "what's left" figure.
_Avoid_: credit left, credits to go

**Grade**:
The mark earned in a Completed Course on KU's scale (A, B+, B, C+, C, D+, D, F), plus the non-GPAX symbols P/NP, I, S/U, N.
_Avoid_: score, mark

**GPAX**:
The cumulative grade-point average across all GPAX-counting Completed Courses; must be ≥2.00 to graduate.
_Avoid_: GPA, cumulative GPA

**Gen-Ed group**:
One of the five หมวดศึกษาทั่วไป themes — Wellness, Entrepreneurship, Language, Citizen, Aesthetics — each a Requirement with its own credit minimum. Language further splits into Thai / Foreign / IT sub-minimums.
_Avoid_: theme, gen-ed bucket

**Major Elective** (วิชาเฉพาะเลือก):
A Course with code `014182xx` or higher, counted toward the ≥18 elective credits of the major.
_Avoid_: optional course, elective (bare)

**Free Elective** (วิชาเลือกเสรี):
Any KU Course counted toward the ≥6 free-elective credits.
_Avoid_: general elective

**Prerequisite**:
A Course (or alternative set) that must be completed before another. Conditions may be OR (`01418211` needs `01418113` or `01418212`) or concurrent (`01418112` needs `01418111`, allowed in the same term).
_Avoid_: dependency, requirement (reserved for credit categories)

**Degree Audit**:
The computed status of the student against every Requirement plus the graduation rules — Remaining credits per Requirement, GPAX, and the done/not-done verdict.
_Avoid_: progress report, graduation check
