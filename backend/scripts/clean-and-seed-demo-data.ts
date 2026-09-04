import dotenv from "dotenv";
import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

dotenv.config();

async function cleanAndSeed() {
  console.log("=== STARTING DEMO DATA CLEANUP & SEEDING ===");

  const seedStudentPassword = process.env.SEED_STUDENT_PASSWORD;
  const seedTeacherPassword = process.env.SEED_TEACHER_PASSWORD;

  if (!seedStudentPassword) {
    console.error("Error: Environment variable SEED_STUDENT_PASSWORD is required to seed student accounts.");
    process.exit(1);
  }

  if (!seedTeacherPassword) {
    console.error("Error: Environment variable SEED_TEACHER_PASSWORD is required to seed teacher accounts.");
    process.exit(1);
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
  const studentPasswordHash = await bcrypt.hash(seedStudentPassword, saltRounds);
  const teacherPasswordHash = await bcrypt.hash(seedTeacherPassword, saltRounds);

  // 1. Purge all dependent attendance, security, session, and audit records
  console.log("1. Cleaning manual audits, attendance records, QR tokens, security logs, sessions, assignments...");
  await prisma.attendanceManualAudit.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.qrToken.deleteMany({});
  await prisma.attendanceSecurityLog.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.teacherClassSubject.deleteMany({});

  // 2. Clean obsolete refresh tokens, student profiles, teacher profiles, and user accounts
  console.log("2. Cleaning existing student/teacher profiles and user accounts...");
  await prisma.refreshToken.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.teacherProfile.deleteMany({});

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "admin@example.com").toLowerCase();
  await prisma.user.deleteMany({
    where: {
      email: { not: adminEmail },
    },
  });

  // 3. Ensure Standard Departments Exist
  console.log("3. Seeding standard Departments...");
  const deptDefs = [
    { name: "Computer Science and Engineering", code: "CSE" },
    { name: "Mechanical Engineering", code: "ME" },
    { name: "Electrical Engineering", code: "EE" },
    { name: "Civil Engineering", code: "CE" },
  ];

  const deptMap = new Map<string, string>();
  for (const d of deptDefs) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
    deptMap.set(d.code, dept.id);
  }

  const cseDeptId = deptMap.get("CSE")!;

  // 4. Create Academic Class
  console.log("4. Creating CSE Semester 6 Academic Class...");
  const cseClass = await prisma.academicClass.upsert({
    where: {
      departmentId_semester_section_batchYear: {
        departmentId: cseDeptId,
        semester: 6,
        section: "A",
        batchYear: 2026,
      },
    },
    update: { name: "CSE Semester 6" },
    create: {
      name: "CSE Semester 6",
      departmentId: cseDeptId,
      semester: 6,
      section: "A",
      batchYear: 2026,
    },
  });

  // 5. Create Subjects
  console.log("5. Seeding CSE Semester 6 Subjects...");
  const cseSubjects = [
    { name: "Object Oriented Programming", code: "CSE601", semester: 6 },
    { name: "Data Structure", code: "CSE602", semester: 6 },
    { name: "Computer Network", code: "CSE603", semester: 6 },
    { name: "Automata", code: "CSE604", semester: 6 },
  ];

  const subjectMap = new Map<string, string>();
  for (const s of cseSubjects) {
    const sub = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, departmentId: cseDeptId, semester: s.semester },
      create: {
        name: s.name,
        code: s.code,
        departmentId: cseDeptId,
        semester: s.semester,
      },
    });
    subjectMap.set(s.code, sub.id);
  }

  // 6. Seed Demo Teachers
  console.log("6. Seeding Demo Teachers & assigning to subjects...");
  const teacherDefs = [
    { name: "Demo Teacher A", email: "teacher.a@example.com", empId: "EMP_DEMO_A", subCode: "CSE601" },
    { name: "Demo Teacher B", email: "teacher.b@example.com", empId: "EMP_DEMO_B", subCode: "CSE602" },
    { name: "Demo Teacher C", email: "teacher.c@example.com", empId: "EMP_DEMO_C", subCode: "CSE603" },
    { name: "Demo Teacher D", email: "teacher.d@example.com", empId: "EMP_DEMO_D", subCode: "CSE604" },
  ];

  for (const t of teacherDefs) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name, passwordHash: teacherPasswordHash, role: "TEACHER", isActive: true },
      create: {
        name: t.name,
        email: t.email,
        passwordHash: teacherPasswordHash,
        role: "TEACHER",
        isActive: true,
      },
    });

    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: { employeeId: t.empId, departmentId: cseDeptId },
      create: {
        userId: user.id,
        employeeId: t.empId,
        departmentId: cseDeptId,
      },
    });

    const subjectId = subjectMap.get(t.subCode)!;
    await prisma.teacherClassSubject.create({
      data: {
        teacherId: profile.id,
        classId: cseClass.id,
        subjectId,
      },
    });
  }

  // 7. Seed Demo Students
  console.log("7. Seeding Demo Students...");
  const studentDefs = [
    { name: "Demo Student One", email: "student.one@example.com", regNo: "DEMO-STUDENT-001" },
    { name: "Demo Student Two", email: "student.two@example.com", regNo: "DEMO-STUDENT-002" },
  ];

  for (const s of studentDefs) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, passwordHash: studentPasswordHash, role: "STUDENT", isActive: true },
      create: {
        name: s.name,
        email: s.email,
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { registrationNumber: s.regNo, departmentId: cseDeptId, classId: cseClass.id },
      create: { userId: user.id, registrationNumber: s.regNo, departmentId: cseDeptId, classId: cseClass.id },
    });
  }

  console.log("=== DEMO DATA SEEDING COMPLETED SUCCESSFULLY ===");
}

cleanAndSeed()
  .catch((err) => {
    console.error("Error during cleanup/seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
