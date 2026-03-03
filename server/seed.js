require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const User = require("./models/User");
const Course = require("./models/Course");
const AttendanceSession = require("./models/AttendanceSession");

const connectDB = require("./config/db");

async function seed() {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Course.deleteMany({});
  await AttendanceSession.deleteMany({});

  console.log("Cleared existing data");

  // Create admin
  const admin = await User.create({
    name: "System Admin",
    email: "admin@sust.edu",
    password: "admin123",
    role: "admin",
  });
  console.log("Created admin:", admin.email);

  // Create teacher
  const teacher = await User.create({
    name: "Dr. Rahman",
    email: "dr.rahman@sust.edu",
    password: "teacher123",
    role: "teacher",
  });
  console.log("Created teacher:", teacher.email);

  // Create students
  const studentData = [
    {
      name: "Alice Akter",
      email: "2021331001@student.sust.edu",
      registrationNumber: "2021331001",
      year: 2021,
      batch: "2021",
      departmentCode: "331",
      department: "CSE",
      rollNumber: 1,
    },
    {
      name: "Bob Hasan",
      email: "2021331002@student.sust.edu",
      registrationNumber: "2021331002",
      year: 2021,
      batch: "2021",
      departmentCode: "331",
      department: "CSE",
      rollNumber: 2,
    },
    {
      name: "Charlie Karim",
      email: "2021331003@student.sust.edu",
      registrationNumber: "2021331003",
      year: 2021,
      batch: "2021",
      departmentCode: "331",
      department: "CSE",
      rollNumber: 3,
    },
    {
      name: "Diana Islam",
      email: "2021331004@student.sust.edu",
      registrationNumber: "2021331004",
      year: 2021,
      batch: "2021",
      departmentCode: "331",
      department: "CSE",
      rollNumber: 4,
    },
    {
      name: "Eve Rahman",
      email: "2021331005@student.sust.edu",
      registrationNumber: "2021331005",
      year: 2021,
      batch: "2021",
      departmentCode: "331",
      department: "CSE",
      rollNumber: 5,
    },
  ];

  const students = [];
  for (const s of studentData) {
    const student = await User.create({
      ...s,
      password: "student123",
      role: "student",
    });
    students.push(student);
    console.log("Created student:", student.email);
  }

  // Create course
  const course = await Course.create({
    department: "Computer Science & Engineering",
    season: "2021",
    courseName: "Software Engineering",
    courseCode: "CSE-331",
    teacherId: teacher._id,
    students: studentData.map((s) => s.email),
  });
  console.log("Created course:", course.courseName);

  // Create a sample attendance session (active for the next 2 hours)
  const now = new Date();
  const session = await AttendanceSession.create({
    courseId: course._id,
    teacherId: teacher._id,
    location: { lat: 24.9128, lng: 91.8315 }, // SUST campus approx coords
    startTime: now,
    endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    radiusMeters: 500,
    qrToken: uuidv4(),
    attendances: [
      {
        email: studentData[0].email,
        timestamp: new Date(),
        lat: 24.9128,
        lng: 91.8315,
      },
      {
        email: studentData[1].email,
        timestamp: new Date(),
        lat: 24.9129,
        lng: 91.8316,
      },
    ],
  });
  console.log("Created session with QR token:", session.qrToken);

  console.log("\n=== Seed Complete ===");
  console.log("Admin login:   admin@sust.edu / admin123");
  console.log("Teacher login: dr.rahman@sust.edu / teacher123");
  console.log("Student login: 2021331001@student.sust.edu / student123");
  console.log("(All students use password: student123)");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
