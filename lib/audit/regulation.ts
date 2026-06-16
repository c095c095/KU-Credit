// Graduation rules — VERIFIED against ข้อบังคับมหาวิทยาลัยเกษตรศาสตร์ ว่าด้วยการศึกษาระดับปริญญาตรี พ.ศ. 2566.
// Clause refs inline; see docs/implementation-plan.md §9 (Task 2).

export type Regulation = {
  ref: string;
  minGpax: number;
  minRegularSemesters: number;
  maxYears: number;
  /** §22.2 + §14.4.1: BOTH/all attempts of a retaken course count in GPAX (NOT just the latest). */
  gpaxCountsAllAttempts: boolean;
  honors: { first: number; second: number };
  requiresKuExite: boolean;
};

export const KU_2566: Regulation = {
  ref: "KU-2566",
  minGpax: 2.0, // §28.2 "cumulative GPA of 2.00 or over"
  minRegularSemesters: 6, // §28.2 (4-year program; waived for transfer students)
  maxYears: 8, // §26.3.7 / §19.3 / §18.3 (2× the program's years)
  gpaxCountsAllAttempts: true, // §22.2 + §14.4.1
  honors: { first: 3.5, second: 3.25 }, // §29.1.4
  requiresKuExite: true, // separate KU-EXITE announcement
};
