import type { Course, Curriculum, Prerequisite, Requirement } from "./types";

const REQ = (code: string): Prerequisite => ({ anyOf: [code] });
const OR = (...codes: string[]): Prerequisite => ({ anyOf: codes });
const CONC = (code: string): Prerequisite => ({ anyOf: [code], concurrentAllowed: true });

const c = (
  code: string,
  nameTh: string,
  nameEn: string,
  credits: number,
  prerequisites: Prerequisite[] = [],
): Course => ({ code, nameTh, nameEn, credits, prerequisites });

// วิชาแกน — Core (12 credits, all required)
const CORE: Course[] = [
  c("01417111", "แคลคูลัส I", "Calculus I", 3),
  c("01417322", "พีชคณิตเชิงเส้นพื้นฐาน", "Basic Linear Algebra", 3),
  c("01418131", "การโปรแกรมทางสถิติ", "Statistical Programming", 3),
  c("01418132", "หลักมูลการคณนา", "Fundamentals of Computing", 3),
];

// วิชาเฉพาะบังคับ — Major Required (58 credits, 20 courses). Prereqs verified against มคอ.2;
// the 6 marked (*) are the corrections vs the analysis doc's earlier draft.
const REQUIRED: Course[] = [
  c("01418111", "วิทยาการคอมพิวเตอร์เบื้องต้น", "Introduction to Computer Science", 2),
  c("01418112", "แนวคิดการโปรแกรมเบื้องต้น", "Fundamental Programming Concepts", 3, [CONC("01418111")]),
  c("01418113", "การโปรแกรมคอมพิวเตอร์", "Computer Programming", 3),
  c("01418211", "การสร้างซอฟต์แวร์", "Software Construction", 3, [OR("01418113", "01418212")]),
  c("01418221", "ระบบฐานข้อมูลเบื้องต้น", "Fundamentals of Database Systems", 3, [REQ("01418113")]),
  c("01418231", "โครงสร้างข้อมูลและขั้นตอนวิธี", "Data Structures and Algorithms", 3, [REQ("01418113")]),
  c("01418232", "การออกแบบและวิเคราะห์ขั้นตอนวิธี", "Algorithm Design and Analysis", 3, [REQ("01418231")]),
  c("01418233", "สถาปัตยกรรมคอมพิวเตอร์", "Computer Architecture", 3, [REQ("01418113")]),
  c("01418236", "ระบบปฏิบัติการ", "Operating Systems", 3, [REQ("01418233")]),
  c("01418141", "ทรัพย์สินทางปัญญาและจรรยาบรรณวิชาชีพ", "Intellectual Properties and Professional Ethics", 3),
  c("01418261", "หลักพื้นฐานของปัญญาประดิษฐ์", "Fundamentals of Artificial Intelligence", 3),
  c("01418321", "การวิเคราะห์และการออกแบบระบบ", "System Analysis and Design", 3, [REQ("01418221")]), // *
  c("01418331", "ทฤษฎีการคำนวณ", "Theory of Computation", 3, [REQ("01418132")]), // *
  c("01418332", "ความมั่นคงในระบบสารสนเทศ", "Information Systems Security", 3, [REQ("01418236")]), // *
  c("01418351", "หลักการเครือข่ายคอมพิวเตอร์และการประมวลผลบนคลาวด์", "Computer Networks and Cloud Computing Principles", 3, [REQ("01418236")]), // *
  c("01418371", "การบริหารโครงการและสตาร์ทอัพดิจิทัล", "Project Management and Digital Startup", 3, [REQ("01418221")]), // *
  c("01418390", "การเตรียมความพร้อมสหกิจศึกษา", "Co-operative Education Preparation", 1),
  c("01418490", "สหกิจศึกษา", "Co-operative Education", 6, [REQ("01418390")]), // *
  c("01418497", "สัมมนา", "Seminar", 1),
  c("01418499", "โครงงานวิทยาการคอมพิวเตอร์", "Computer Science Project", 3, [REQ("01418321")]),
];

// วิชาเฉพาะเลือก — Major Elective options (choose ≥18 credits; code matches ^014182).
// Prereqs included where verified against มคอ.2 course descriptions; others left empty.
const ELECTIVES: Course[] = [
  c("01418212", "การโปรแกรมภาษาซี", "C Programming", 3, [OR("01418111", "01418112")]),
  c("01418213", "การโปรแกรมภาษาโคบอล", "COBOL Programming", 3, [OR("01418111", "01418112")]),
  c("01418214", "การฝึกปฏิบัติการพัฒนาซอฟต์แวร์", "Practicum in Software Development", 1, [REQ("01418113")]),
  c("01418222", "ระบบสารสนเทศวิสาหกิจ", "Enterprise Information System", 3, [REQ("01418112")]),
  c("01418223", "วิทยาการข้อมูลและโปรแกรมประยุกต์", "Data Science and Applications", 3),
  c("01418234", "การโปรแกรมอินเทอร์เน็ตของสรรพสิ่ง", "Programming Internet of Things", 3, [OR("01418112", "01418113", "01418212")]),
  c("01418235", "ระบบปฏิบัติการยูนิกซ์และการโปรแกรมเปลือกระบบ", "Unix Operating System and Shell Programming", 3, [REQ("01418113")]),
  c("01418241", "เทคโนโลยีสารสนเทศการเงินและการธนาคาร", "Financial and Banking Information Technology", 3, [REQ("01418111")]),
  c("01418281", "หลักการสร้างภาพเคลื่อนไหวด้วยคอมพิวเตอร์", "Principles of Computer Animation", 3, [OR("01418112", "01418113")]),
  c("01418282", "การประมวลผลภาพและวีดิทัศน์", "Image and Video Processing", 3, [OR("01418112", "01418113")]),
  c("01418311", "การโปรแกรมเชิงคำนวณแบบท้าทาย", "Challenging Computational Programming", 3, [REQ("01418232")]),
  c("01418322", "วิทยาการข้อมูลเบื้องต้น", "Introduction to Data Science", 3, [REQ("01418112")]),
  c("01418323", "การจัดการคุณภาพข้อมูล", "Data Quality Management", 3, [REQ("01418221")]),
  c("01418324", "ระบบสนับสนุนการตัดสินใจและอัจฉริยะทางธุรกิจ", "Decision Support and Business Intelligent Systems", 3, [REQ("01418221")]),
  c("01418325", "ข้อมูลจินตทัศน์", "Data Visualization", 3, [REQ("01418221")]),
  c("01418333", "เทคนิคตัวแปลโปรแกรม", "Compiler Techniques", 3, [REQ("01418231")]),
  c("01418341", "การออกแบบและการพัฒนาระบบการวางแผนทรัพยากรองค์กร", "Enterprise Resource Planning System Design and Development", 3, [REQ("01418221")]),
  c("01418342", "การออกแบบและพัฒนาโปรแกรมประยุกต์สำหรับอุปกรณ์เคลื่อนที่", "Mobile Application Design and Development", 3),
  c("01418343", "การคำนวณแบบขนานด้วยคูด้า", "Parallel Computing with CUDA", 3),
  c("01418344", "การจัดการมิติข้อมูลและรายงานทางธุรกิจ", "Data Dimension Management and Business Reporting", 3),
  c("01418352", "การสื่อสารข้อมูลและเครือข่าย", "Data Communication and Networks", 3),
  c("01418353", "แนวคิดและบริการการคำนวณแบบคลาวด์", "Cloud Computing Concepts and Services", 3),
  c("01418361", "คอมพิวเตอร์วิทัศน์เบื้องต้น", "Introduction to Computer Vision", 3),
  c("01418362", "การเรียนรู้ของเครื่องเบื้องต้น", "Introduction to Machine Learning", 3),
  c("01418363", "การประมวลผลภาษาธรรมชาติ", "Natural Language Processing", 3),
  c("01418381", "คอมพิวเตอร์กราฟิกส์เชิงโต้ตอบเบื้องต้น", "Introduction to Interactive Computer Graphics", 3),
  c("01418382", "วิชวลเอฟเฟกต์", "Visual Effects", 3),
  c("01418383", "ความจริงขยาย", "Augmented Reality", 3),
  c("01418421", "การออกแบบประสบการณ์และส่วนเชื่อมประสานผู้ใช้", "User Experience and User Interface Design", 3),
  c("01418441", "เว็บเทคโนโลยีและเว็บบริการ", "Web Technology and Web Services", 3),
  c("01418451", "การออกแบบและการบริหารเครือข่าย", "Network Design and Administration", 3),
  c("01418471", "การออกแบบและพัฒนาซอฟต์แวร์", "Software Design and Development", 3),
  c("01418472", "การบูรณาการกระบวนการเชิงอไจล์และเดฟอ็อปส์", "Agile and DevOps Process Integration", 3),
  c("01418473", "การควบคุมและการตรวจสอบงานคอมพิวเตอร์", "Computer Control and Audit", 3),
  c("01418474", "การทดสอบและทวนสอบซอฟต์แวร์", "Software Testing and Verification", 3),
  c("01418496", "เรื่องเฉพาะทางวิทยาการคอมพิวเตอร์", "Selected Topics in Computer Science", 3),
];

// The only Gen-Ed Course seeded as mandatory; all other Gen-Ed Courses are open / quick-add.
const GENED_MANDATORY: Course[] = [c("01999111", "ศาสตร์แห่งแผ่นดิน", "Knowledge of the Land", 2)];

const courses: Record<string, Course> = {};
for (const course of [...CORE, ...REQUIRED, ...ELECTIVES, ...GENED_MANDATORY]) {
  courses[course.code] = course;
}

const tagged = (tag: string) => ({ kind: "tagged", tag }) as const;

const requirements: Requirement[] = [
  {
    id: "gened",
    nameTh: "หมวดวิชาศึกษาทั่วไป",
    nameEn: "General Education",
    minCredits: 30,
    rule: tagged("gened"),
    children: [
      {
        id: "gened.wellness",
        nameTh: "กลุ่มสาระอยู่ดีมีสุข",
        nameEn: "Wellness",
        minCredits: 3,
        rule: tagged("gened.wellness"),
        mandatoryPattern: { pattern: "^01175", minCredits: 1, label: "PE activity (01175xxx)" },
      },
      {
        id: "gened.entrepreneurship",
        nameTh: "กลุ่มสาระศาสตร์แห่งผู้ประกอบการ",
        nameEn: "Entrepreneurship",
        minCredits: 3,
        rule: tagged("gened.entrepreneurship"),
      },
      {
        id: "gened.language",
        nameTh: "กลุ่มสาระภาษากับการสื่อสาร",
        nameEn: "Language and Communication",
        minCredits: 13,
        rule: tagged("gened.language"),
        children: [
          { id: "gened.language.thai", nameTh: "วิชาภาษาไทย", nameEn: "Thai Language", minCredits: 3, rule: tagged("gened.language.thai") },
          { id: "gened.language.foreign", nameTh: "วิชาภาษาต่างประเทศ", nameEn: "Foreign Language", minCredits: 9, rule: tagged("gened.language.foreign") },
          { id: "gened.language.it", nameTh: "วิชาสารสนเทศ/คอมพิวเตอร์", nameEn: "Information / Computer", minCredits: 1, rule: tagged("gened.language.it") },
        ],
      },
      {
        id: "gened.citizen",
        nameTh: "กลุ่มสาระพลเมืองไทยและพลเมืองโลก",
        nameEn: "Thai and Global Citizen",
        minCredits: 3,
        rule: tagged("gened.citizen"),
        mandatoryCourses: ["01999111"],
      },
      {
        id: "gened.aesthetics",
        nameTh: "กลุ่มสาระสุนทรียศาสตร์",
        nameEn: "Aesthetics",
        minCredits: 3,
        rule: tagged("gened.aesthetics"),
      },
    ],
  },
  {
    id: "major.core",
    nameTh: "วิชาแกน",
    nameEn: "Major Core",
    minCredits: 12,
    rule: { kind: "fixed", courses: CORE.map((x) => x.code) },
  },
  {
    id: "major.required",
    nameTh: "วิชาเฉพาะบังคับ",
    nameEn: "Major Required",
    minCredits: 58,
    rule: { kind: "fixed", courses: REQUIRED.map((x) => x.code) },
  },
  {
    id: "major.elective",
    nameTh: "วิชาเฉพาะเลือก",
    nameEn: "Major Elective",
    minCredits: 18,
    rule: { kind: "pattern", pattern: "^01418[2-9]" },
  },
  {
    id: "free",
    nameTh: "วิชาเลือกเสรี",
    nameEn: "Free Elective",
    minCredits: 6,
    rule: { kind: "any" },
  },
];

export const CS_2565: Curriculum = {
  id: "cs-2565",
  totalCreditsMin: 124,
  appliesToAdmitYears: [2565, 2566, 2567, 2568],
  courses,
  requirements,
};

export const CORE_CODES = CORE.map((x) => x.code);
export const REQUIRED_CODES = REQUIRED.map((x) => x.code);
export const ELECTIVE_CODES = ELECTIVES.map((x) => x.code);
