# Spec: แก้การคิด GPAX & หน่วยกิตจบ — KU CS-2565

> **วิธีใช้:** วางไฟล์นี้ให้ Claude Code แล้วสั่งว่า *"implement ตาม spec นี้ และเขียน unit test ตาม Acceptance Criteria ด้านล่างให้ผ่านทุกข้อ"*

## บริบท
Credit tracker (`curriculumId: cs-2565`) เก็บข้อมูลใน JSON: `attempts` (วิชาที่มีเกรด A–F), `customCourses` (metadata วิชานอก curriculum), `assignments` (map วิชา → requirementId)

อาการ: **GPAX คำนวณออก 2.20 แต่ของจริงต้องเป็น 2.27** และต้องยืนยันว่า earned credits นับวิชา P ถูกต้อง

เกณฑ์อ้างอิง (ทางการ): ข้อบังคับ มก. ว่าด้วยการศึกษาระดับปริญญาตรี พ.ศ. 2566 + มคอ.2 หลักสูตร CS 2565

---

## กฎที่ยืนยันแล้ว (authoritative — เป็น source of truth)

**ระบบเกรด KU**
- มีแต้ม (เข้า GPAX): `A=4.0  B+=3.5  B=3.0  C+=2.5  C=2.0  D+=1.5  D=1.0  F=0.0`
- ไม่มีแต้ม (ไม่เข้า GPAX): `W, P, I, N, S, U`
- "ผ่าน / ได้หน่วยกิต" = เกรด **≥ D** หรือ **P**

**เรียนซ้ำวิชาที่ติด F:** KU **ไม่ใช้ grade replacement** → F เดิม + เกรดใหม่ ถูกนับเข้า GPAX **ทั้งคู่** (หน่วยกิตเข้า denominator สองครั้ง)

**P:** ได้หน่วยกิตจบ แต่ **ไม่เข้า GPAX**

**โครงสร้างจบ:** รวม ≥ 124 | ศึกษาทั่วไป ≥ 30 | วิชาเฉพาะ ≥ 88 (แกน 12 + บังคับ 58 + เลือก ≥ 18) | เลือกเสรี ≥ 6

---

## Task 1 — แก้สูตร GPAX  ⭐ priority สูงสุด

```ts
const GRADE_POINTS: Record<string, number> = {
  "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5,
  "C": 2.0, "D+": 1.5, "D": 1.0, "F": 0.0,
};

function gpax(attempts: Attempt[]): number {
  let num = 0, den = 0;
  for (const a of attempts) {
    const gp = GRADE_POINTS[a.grade];   // undefined ถ้าเป็น W/P/I/N/S/U
    if (gp === undefined) continue;     // ข้ามตัวที่ไม่มีแต้ม
    const c = creditOf(a.courseCode);
    num += c * gp;
    den += c;                           // *** ทุก attempt A–F รวมวิชาเรียนซ้ำ — ห้าม dedupe ***
  }
  return den ? num / den : 0;
}
```

**บั๊กที่น่าจะทำให้ออก 2.20** (ให้ไล่เช็ค):
- (ก) เผลอ dedupe by `courseCode` ก่อนคิด GPAX → ตัด F เดิมของวิชาเรียนซ้ำออก
- (ข) เผลอเอา `P` หรือ `I` มานับเป็น 0 ใน denominator → ฐานบวมเกิน

แก้ให้ตรง logic ข้างบนเป๊ะ (นับทุก A–F, ตัด W/P/I/N/S/U)

## Task 2 — earned credits (เป็นคนละค่ากับ GPAX denominator — ห้ามปนกัน)

```ts
const PASS = new Set(["A", "B+", "B", "C+", "C", "D+", "D"]);  // ≥ D

function earnedCredits(/* attempts, customCourses, assignments */): number {
  const passed = new Map<string, number>();           // courseCode -> credits (unique)
  for (const a of attempts)
    if (PASS.has(a.grade))
      passed.set(a.courseCode, creditOf(a.courseCode)); // ครั้งเดียวต่อวิชา
  for (const code of passCourseCodes)                  // วิชา P (ดู Task 3)
    if (!passed.has(code)) passed.set(code, creditOf(code));
  return [...passed.values()].reduce((s, c) => s + c, 0);
}
```
- `F` ไม่นับ
- วิชาเรียนซ้ำ (F→B) นับหน่วยกิต **ครั้งเดียว** (ครั้งที่ผ่าน)
- วิชา `P` **นับ**

> เก็บ 2 ค่าแยกกันให้ชัด: `gpaxCredits` (= denominator ของ GPAX, รวม F + วิชาซ้ำ) กับ `earnedCredits` (= ความคืบหน้าจบ) — สองค่านี้ **ไม่เท่ากันเป็นเรื่องปกติ**

## Task 3 — data model วิชา P (เลือกทางใดทางหนึ่ง)
ปัญหา: วิชา P (`01355101`, `01355102`) ตอนนี้อยู่แค่ใน `customCourses` + `assignments` ไม่มี grade ทำให้แยก "P ที่ผ่านแล้ว" จาก "วิชาที่ยังไม่ได้เรียน" ยาก
- **แนะนำ (สะอาดสุด):** บันทึกวิชา P เป็น `attempts` ที่มี `grade: "P"` ไปเลย → `gpax()` ข้ามเอง (P ไม่อยู่ใน `GRADE_POINTS`) และ `earnedCredits()` นับเอง ไม่ต้อง infer
- **ถ้าไม่อยากแตะ schema:** นิยาม `passCourseCodes` = code ที่อยู่ใน `assignments` แต่ **ไม่มี**ใน `attempts` แล้วดึงหน่วยกิตจาก `customCourses`

## Task 4 — เพิ่มข้อมูลที่ขาด
เพิ่ม **`01355102`** (English for University Life / ภาษาอังกฤษในมหาวิทยาลัย, 3 นก., เกรด P) ลงข้อมูล (วิธีตาม Task 3) — requirement = หมวดภาษาต่างประเทศ (เช็คว่าควร map กับช่องไหนของ `gened.language.foreign`)

## Task 5 — graduation readiness
แสดง "พร้อมจบ" เฉพาะเมื่อครบ **ทุกข้อ**:
- `earnedCredits ≥ 124`
- ทุกหมวดครบขั้นต่ำ (30 / 88 / 6 + sub-buckets)
- วิชาบังคับ/แกน "ผ่าน" (≥ D) ทุกตัว — **flag วิชาแกนที่ยังติด F:** `01417111` (Calculus I), `01417322` (Basic Linear Algebra)
- `gpax ≥ 2.00`
- `flags.kuExitePassed === true`
- ไม่มีเกรด `I` ค้าง (ตอนนี้ `01418364` ยังเป็น I)

---

## Acceptance Criteria — test กับ `ku-credit.json` (หลังแก้เกรด B+/A แล้ว)

| ค่า | ต้องได้ |
|---|---|
| `gpax()` | **2.27** (raw = 156.5 / 69 = 2.2681) |
| GPAX denominator (`gpaxCredits`) | **69** |
| `earnedCredits` (เฉพาะ A–F) | **60** |
| `earnedCredits` (รวมวิชา P 2 ตัว) | **66** |
| remaining to 124 | **58** |
| readiness | **ยังไม่พร้อมจบ** |

**Edge cases ที่ test ต้องครอบคลุม:**
- `01418111`: F(2567/1) + B(2567/2) → GPAX นับทั้งคู่ (`0×2` และ `3×2`); earned +2 (ครั้งเดียว)
- `01417322`: W(2567/2) ข้าม + F(2568/2) นับ 0 ใน GPAX; earned +0
- `01418132`: W(2567/2) ข้าม + D+(2568/2) นับ; earned +3
- `01999111`: W(2567/1) ข้าม + B(2568/1) นับ
- `01355101`, `01355102`: P → GPAX ข้าม, earned +3 ต่อตัว
- `01418364`: I → ข้ามทั้ง GPAX และ earned

---

## ⚠️ Open question (ยังไม่ยืนยัน — handle แบบ configurable)
เครื่องหมายดอกจัน (`*`) ที่กำกับ `01355101`/`01355102` บน transcript ยังไม่มี legend ทางการยืนยันความหมาย ทำให้ยังไม่ 100% ว่าวิชาอังกฤษพื้นฐานนับเข้า 124 จริงไหม (ผลค้นเอนเอียงว่า **"นับ"**)

→ ทำเป็น flag `countPassCoursesToward124` (default `true`) ถ้าภายหลังยืนยันว่าไม่นับ: ตั้ง `false` แล้ว `earnedCredits` = **60**, remaining = **64**