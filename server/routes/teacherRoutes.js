const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const Course = require("../models/Course");
const AttendanceSession = require("../models/AttendanceSession");
const User = require("../models/User");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// POST /api/courses — create course
router.post("/courses", verifyToken, authorize("teacher"), async (req, res) => {
  try {
    const { department, season, courseName, courseCode, students } = req.body;

    if (!department || !season || !courseName || !courseCode) {
      return res.status(400).json({
        message:
          "Department, season, course name, and course code are required",
      });
    }

    const course = await Course.create({
      department,
      season,
      courseName,
      courseCode,
      teacherId: req.user._id,
      students: students || [],
    });

    res.status(201).json({ course });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/courses — list teacher's courses
router.get(
  "/courses",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      let filter = {};
      if (req.user.role === "teacher") {
        filter.teacherId = req.user._id;
      }
      const courses = await Course.find(filter).populate(
        "teacherId",
        "name email",
      );
      res.json({ courses });
    } catch (error) {
      console.error("List courses error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/courses/:id — get single course
router.get(
  "/courses/:id",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id).populate(
        "teacherId",
        "name email",
      );
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json({ course });
    } catch (error) {
      console.error("Get course error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// PUT /api/courses/:id/students — add/remove students
router.put(
  "/courses/:id/students",
  verifyToken,
  authorize("teacher"),
  async (req, res) => {
    try {
      const { students } = req.body; // Array of student emails
      const course = await Course.findOne({
        _id: req.params.id,
        teacherId: req.user._id,
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      course.students = students.map((e) => e.toLowerCase());
      await course.save();

      res.json({ course });
    } catch (error) {
      console.error("Update students error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// POST /api/attendance-sessions — create session + generate QR token
router.post(
  "/attendance-sessions",
  verifyToken,
  authorize("teacher"),
  async (req, res) => {
    try {
      const { courseId, startTime, endTime, lat, lng, radiusMeters } = req.body;

      if (
        !courseId ||
        !startTime ||
        !endTime ||
        lat === undefined ||
        lng === undefined
      ) {
        return res.status(400).json({
          message: "courseId, startTime, endTime, lat, and lng are required",
        });
      }

      // verify course belongs to teacher
      const course = await Course.findOne({
        _id: courseId,
        teacherId: req.user._id,
      });
      if (!course) {
        return res
          .status(404)
          .json({ message: "Course not found or access denied" });
      }

      const qrToken = uuidv4();

      const session = await AttendanceSession.create({
        courseId,
        teacherId: req.user._id,
        location: { lat, lng },
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        radiusMeters: radiusMeters || 100,
        qrToken,
        attendances: [],
      });

      res.status(201).json({ session });
    } catch (error) {
      console.error("Create session error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/attendance-sessions/teacher — list all sessions for teacher
router.get(
  "/attendance-sessions/teacher",
  verifyToken,
  authorize("teacher"),
  async (req, res) => {
    try {
      const { courseId } = req.query;
      const filter = { teacherId: req.user._id };
      if (courseId) filter.courseId = courseId;

      const sessions = await AttendanceSession.find(filter)
        .populate("courseId", "courseName courseCode department season")
        .sort({ startTime: -1 });

      res.json({ sessions });
    } catch (error) {
      console.error("List sessions error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/attendance-sessions/:id — view session attendance sheet
router.get(
  "/attendance-sessions/:id",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const session = await AttendanceSession.findById(req.params.id).populate(
        "courseId",
        "courseName courseCode department season students",
      );

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Build attendance sheet: for each enrolled student, check if present
      const enrolledStudents = session.courseId.students || [];
      const sheet = enrolledStudents.map((email) => {
        const entry = session.attendances.find((a) => a.email === email);
        return {
          email,
          status: entry ? "Present" : "Absent",
          markedAt: entry ? entry.timestamp : null,
          lat: entry ? entry.lat : null,
          lng: entry ? entry.lng : null,
        };
      });

      res.json({
        session: {
          _id: session._id,
          course: session.courseId,
          location: session.location,
          startTime: session.startTime,
          endTime: session.endTime,
          radiusMeters: session.radiusMeters,
          qrToken: session.qrToken,
        },
        sheet,
        totalStudents: enrolledStudents.length,
        presentCount: sheet.filter((s) => s.status === "Present").length,
      });
    } catch (error) {
      console.error("View session error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/attendance-sessions/:id/export — export CSV or Excel
router.get(
  "/attendance-sessions/:id/export",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const format = req.query.format || "csv"; // csv or excel
      const session = await AttendanceSession.findById(req.params.id).populate(
        "courseId",
        "courseName courseCode department season students",
      );

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const enrolledStudents = session.courseId.students || [];

      // Fetch student details to get registration numbers
      const students = await User.find({
        email: { $in: enrolledStudents },
        role: "student",
      }).select("email registrationNumber name");

      // Create a map for quick lookup
      const studentMap = {};
      students.forEach((student) => {
        studentMap[student.email] = {
          registrationNumber: student.registrationNumber || "N/A",
          name: student.name,
        };
      });

      const data = enrolledStudents.map((email) => {
        const entry = session.attendances.find((a) => a.email === email);
        const studentInfo = studentMap[email] || {
          registrationNumber: "N/A",
          name: "Unknown",
        };

        return {
          "Registration Number": studentInfo.registrationNumber,
          Status: entry ? "Present" : "Absent",
          "Marked At": entry ? new Date(entry.timestamp).toLocaleString() : "-",
          Email: email,
        };
      });

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance");

        worksheet.columns = [
          {
            header: "Registration Number",
            key: "Registration Number",
            width: 20,
          },
          { header: "Status", key: "Status", width: 10 },
          { header: "Marked At", key: "Marked At", width: 25 },
          { header: "Email", key: "Email", width: 35 },
        ];

        data.forEach((row) => worksheet.addRow(row));

        // Style header
        worksheet.getRow(1).font = { bold: true };

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=attendance_${session._id}.xlsx`,
        );

        await workbook.xlsx.write(res);
        res.end();
      } else {
        const parser = new Parser({ fields: Object.keys(data[0] || {}) });
        const csv = data.length > 0 ? parser.parse(data) : "No data";

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=attendance_${session._id}.csv`,
        );
        res.send(csv);
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/courses/:id/attendance-report — full attendance report for a course
router.get(
  "/courses/:id/attendance-report",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const sessions = await AttendanceSession.find({
        courseId: course._id,
      }).sort({ startTime: 1 });
      const enrolledStudents = course.students || [];

      // Fetch student details
      const students = await User.find({
        email: { $in: enrolledStudents },
        role: "student",
      }).select("email registrationNumber name department batch");

      const studentMap = {};
      students.forEach((student) => {
        studentMap[student.email] = {
          registrationNumber: student.registrationNumber || "N/A",
          name: student.name,
          department: student.department || "N/A",
          batch: student.batch || "N/A",
        };
      });

      // Build a matrix: each student × each session
      const report = enrolledStudents.map((email) => {
        const studentInfo = studentMap[email] || {
          registrationNumber: "N/A",
          name: "Unknown",
          department: "N/A",
          batch: "N/A",
        };

        const row = {
          email,
          registrationNumber: studentInfo.registrationNumber,
          name: studentInfo.name,
          department: studentInfo.department,
          batch: studentInfo.batch,
          sessions: [],
        };
        let presentCount = 0;

        sessions.forEach((session) => {
          const attended = session.attendances.some((a) => a.email === email);
          if (attended) presentCount++;
          row.sessions.push({
            sessionId: session._id,
            date: session.startTime,
            status: attended ? "Present" : "Absent",
          });
        });

        row.totalSessions = sessions.length;
        row.presentCount = presentCount;
        row.percentage =
          sessions.length > 0
            ? Math.round((presentCount / sessions.length) * 100)
            : 0;
        return row;
      });

      res.json({
        course: {
          _id: course._id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          department: course.department,
          season: course.season,
        },
        sessions: sessions.map((s) => ({
          _id: s._id,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        report,
      });
    } catch (error) {
      console.error("Attendance report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/courses/:id/attendance-report/export — export course attendance report
router.get(
  "/courses/:id/attendance-report/export",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const format = req.query.format || "csv";
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const sessions = await AttendanceSession.find({
        courseId: course._id,
      }).sort({ startTime: 1 });
      const enrolledStudents = course.students || [];

      // Fetch student details
      const students = await User.find({
        email: { $in: enrolledStudents },
        role: "student",
      }).select("email registrationNumber name department batch");

      const studentMap = {};
      students.forEach((student) => {
        studentMap[student.email] = {
          registrationNumber: student.registrationNumber || "N/A",
          name: student.name,
          department: student.department || "N/A",
          batch: student.batch || "N/A",
        };
      });

      const data = enrolledStudents.map((email) => {
        const studentInfo = studentMap[email] || {
          registrationNumber: "N/A",
          name: "Unknown",
          department: "N/A",
          batch: "N/A",
        };

        let presentCount = 0;
        sessions.forEach((session) => {
          if (session.attendances.some((a) => a.email === email)) {
            presentCount++;
          }
        });

        const percentage =
          sessions.length > 0
            ? Math.round((presentCount / sessions.length) * 100)
            : 0;

        return {
          "Registration Number": studentInfo.registrationNumber,
          Name: studentInfo.name,
          Department: studentInfo.department,
          Batch: studentInfo.batch,
          "Total Sessions": sessions.length,
          Present: presentCount,
          Absent: sessions.length - presentCount,
          Percentage: `${percentage}%`,
          Email: email,
        };
      });

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Course Attendance Report");

        worksheet.columns = [
          {
            header: "Registration Number",
            key: "Registration Number",
            width: 20,
          },
          { header: "Name", key: "Name", width: 25 },
          { header: "Department", key: "Department", width: 15 },
          { header: "Batch", key: "Batch", width: 10 },
          { header: "Total Sessions", key: "Total Sessions", width: 15 },
          { header: "Present", key: "Present", width: 10 },
          { header: "Absent", key: "Absent", width: 10 },
          { header: "Percentage", key: "Percentage", width: 12 },
          { header: "Email", key: "Email", width: 35 },
        ];

        data.forEach((row) => worksheet.addRow(row));

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${course.courseCode}_attendance_report.xlsx`,
        );

        await workbook.xlsx.write(res);
        res.end();
      } else {
        const parser = new Parser({ fields: Object.keys(data[0] || {}) });
        const csv = data.length > 0 ? parser.parse(data) : "No data";

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${course.courseCode}_attendance_report.csv`,
        );
        res.send(csv);
      }
    } catch (error) {
      console.error("Export course report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
