const express = require("express");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const User = require("../models/User");
const Course = require("../models/Course");
const AttendanceSession = require("../models/AttendanceSession");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// ─── User Management ─────────────────────────────────

// GET /api/admin/users — list all users (with optional role filter)
router.get("/users", verifyToken, authorize("admin"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/users/:id
router.delete(
  "/users/:id",
  verifyToken,
  authorize("admin"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// PUT /api/admin/users/:id/role — change user role
router.put(
  "/users/:id/role",
  verifyToken,
  authorize("admin"),
  async (req, res) => {
    try {
      const { role } = req.body;
      if (!["student", "teacher", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true },
      ).select("-password");
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── Course Management ───────────────────────────────

// GET /api/admin/courses
router.get("/courses", verifyToken, authorize("admin"), async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.season) filter.season = req.query.season;

    const courses = await Course.find(filter).populate(
      "teacherId",
      "name email",
    );
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/courses/:id
router.delete(
  "/courses/:id",
  verifyToken,
  authorize("admin"),
  async (req, res) => {
    try {
      const course = await Course.findByIdAndDelete(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      // clean up sessions too
      await AttendanceSession.deleteMany({ courseId: req.params.id });
      res.json({ message: "Course and its sessions deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// DELETE /api/admin/sessions/:id — delete attendance session
router.delete(
  "/sessions/:id",
  verifyToken,
  authorize("admin"),
  async (req, res) => {
    try {
      const session = await AttendanceSession.findByIdAndDelete(req.params.id);
      if (!session)
        return res.status(404).json({ message: "Session not found" });
      res.json({ message: "Session deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);

// ─── Reports ─────────────────────────────────────────

// GET /api/admin/reports — aggregate attendance report with filters
router.get("/reports", verifyToken, authorize("admin"), async (req, res) => {
  try {
    const { department, season, courseId } = req.query;

    // Build course filter
    const courseFilter = {};
    if (department) courseFilter.department = department;
    if (season) courseFilter.season = season;
    if (courseId) courseFilter._id = courseId;

    const courses = await Course.find(courseFilter).populate(
      "teacherId",
      "name email",
    );

    const report = [];

    for (const course of courses) {
      const sessions = await AttendanceSession.find({
        courseId: course._id,
      }).sort({ startTime: 1 });

      const studentStats = {};
      course.students.forEach((email) => {
        studentStats[email] = { present: 0, total: sessions.length };
      });

      sessions.forEach((session) => {
        course.students.forEach((email) => {
          if (session.attendances.some((a) => a.email === email)) {
            studentStats[email].present++;
          }
        });
      });

      report.push({
        course: {
          _id: course._id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          department: course.department,
          season: course.season,
          teacher: course.teacherId,
        },
        totalSessions: sessions.length,
        enrolledStudents: course.students.length,
        students: Object.entries(studentStats).map(([email, stats]) => ({
          email,
          present: stats.present,
          total: stats.total,
          percentage:
            stats.total > 0
              ? Math.round((stats.present / stats.total) * 100)
              : 0,
        })),
      });
    }

    res.json({ report });
  } catch (error) {
    console.error("Admin report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/reports/export
router.get(
  "/reports/export",
  verifyToken,
  authorize("admin"),
  async (req, res) => {
    try {
      const { department, season, courseId, format } = req.query;

      const courseFilter = {};
      if (department) courseFilter.department = department;
      if (season) courseFilter.season = season;
      if (courseId) courseFilter._id = courseId;

      const courses = await Course.find(courseFilter).populate(
        "teacherId",
        "name email",
      );
      const data = [];

      for (const course of courses) {
        const sessions = await AttendanceSession.find({
          courseId: course._id,
        }).sort({ startTime: 1 });

        course.students.forEach((email) => {
          let present = 0;
          sessions.forEach((s) => {
            if (s.attendances.some((a) => a.email === email)) present++;
          });

          data.push({
            Course: course.courseName,
            "Course Code": course.courseCode,
            Department: course.department,
            Season: course.season,
            Teacher: course.teacherId?.name || "-",
            "Student Email": email,
            "Sessions Attended": present,
            "Total Sessions": sessions.length,
            Percentage:
              sessions.length > 0
                ? Math.round((present / sessions.length) * 100) + "%"
                : "0%",
          });
        });
      }

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance Report");

        if (data.length > 0) {
          worksheet.columns = Object.keys(data[0]).map((key) => ({
            header: key,
            key,
            width: 20,
          }));
          data.forEach((row) => worksheet.addRow(row));
          worksheet.getRow(1).font = { bold: true };
        }

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=attendance_report.xlsx",
        );
        await workbook.xlsx.write(res);
        res.end();
      } else {
        const parser = new Parser({ fields: Object.keys(data[0] || {}) });
        const csv = data.length > 0 ? parser.parse(data) : "No data";
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=attendance_report.csv",
        );
        res.send(csv);
      }
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/admin/stats — dashboard stats
router.get("/stats", verifyToken, authorize("admin"), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalTeachers = await User.countDocuments({ role: "teacher" });
    const totalCourses = await Course.countDocuments();
    const totalSessions = await AttendanceSession.countDocuments();

    res.json({ totalStudents, totalTeachers, totalCourses, totalSessions });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// ─── Comprehensive Attendance Report ─────────────────────────────────

// GET /api/admin/attendance-report — Get comprehensive attendance report for all students
router.get(
  "/attendance-report",
  verifyToken,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { department, batch, courseId } = req.query;

      // Build student filter
      const studentFilter = { role: "student" };
      if (department) studentFilter.department = department;
      if (batch) studentFilter.batch = batch;

      // Get all students matching filter
      const students = await User.find(studentFilter)
        .select(
          "name email registrationNumber department batch year rollNumber",
        )
        .sort({ registrationNumber: 1 });

      if (students.length === 0) {
        return res.json({ students: [], summary: { totalStudents: 0 } });
      }

      const studentEmails = students.map((s) => s.email);

      // Build course filter
      const courseFilter = { students: { $in: studentEmails } };
      if (courseId) courseFilter._id = courseId;

      // Get all courses these students are enrolled in
      const courses = await Course.find(courseFilter)
        .populate("teacherId", "name email")
        .sort({ season: -1, courseName: 1 });

      // Get all attendance sessions for these courses
      const courseIds = courses.map((c) => c._id);
      const sessions = await AttendanceSession.find({
        courseId: { $in: courseIds },
      }).sort({ startTime: -1 });

      // Build comprehensive report for each student
      const report = students.map((student) => {
        const studentCourses = courses.filter((c) =>
          c.students.includes(student.email),
        );

        const courseAttendance = studentCourses.map((course) => {
          const courseSessions = sessions.filter(
            (s) => s.courseId.toString() === course._id.toString(),
          );
          const totalSessions = courseSessions.length;

          const presentSessions = courseSessions.filter((session) =>
            session.attendances.some((a) => a.email === student.email),
          );
          const presentCount = presentSessions.length;
          const percentage =
            totalSessions > 0
              ? Math.round((presentCount / totalSessions) * 100)
              : 0;

          return {
            courseId: course._id,
            courseName: course.courseName,
            courseCode: course.courseCode,
            department: course.department,
            season: course.season,
            teacher: course.teacherId?.name || "N/A",
            totalSessions,
            presentCount,
            absentCount: totalSessions - presentCount,
            percentage,
          };
        });

        const totalSessions = courseAttendance.reduce(
          (sum, c) => sum + c.totalSessions,
          0,
        );
        const totalPresent = courseAttendance.reduce(
          (sum, c) => sum + c.presentCount,
          0,
        );
        const overallPercentage =
          totalSessions > 0
            ? Math.round((totalPresent / totalSessions) * 100)
            : 0;

        return {
          student: {
            name: student.name,
            email: student.email,
            registrationNumber: student.registrationNumber,
            department: student.department,
            batch: student.batch,
            year: student.year,
            rollNumber: student.rollNumber,
          },
          courses: courseAttendance,
          summary: {
            totalCourses: courseAttendance.length,
            totalSessions,
            totalPresent,
            totalAbsent: totalSessions - totalPresent,
            overallPercentage,
          },
        };
      });

      res.json({
        students: report,
        summary: {
          totalStudents: students.length,
          totalCourses: courses.length,
          totalSessions: sessions.length,
        },
      });
    } catch (error) {
      console.error("Comprehensive report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/admin/attendance-report/export — Export comprehensive report
router.get(
  "/attendance-report/export",
  verifyToken,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { department, batch, format = "csv" } = req.query;

      // Build student filter
      const studentFilter = { role: "student" };
      if (department) studentFilter.department = department;
      if (batch) studentFilter.batch = batch;

      // Get all students
      const students = await User.find(studentFilter)
        .select(
          "name email registrationNumber department batch year rollNumber",
        )
        .sort({ registrationNumber: 1 });

      if (students.length === 0) {
        return res.status(404).json({ message: "No students found" });
      }

      const studentEmails = students.map((s) => s.email);

      // Get all courses
      const courses = await Course.find({
        students: { $in: studentEmails },
      }).populate("teacherId", "name");

      // Get all sessions
      const courseIds = courses.map((c) => c._id);
      const sessions = await AttendanceSession.find({
        courseId: { $in: courseIds },
      });

      // Build export data
      const data = [];

      students.forEach((student) => {
        const studentCourses = courses.filter((c) =>
          c.students.includes(student.email),
        );

        studentCourses.forEach((course) => {
          const courseSessions = sessions.filter(
            (s) => s.courseId.toString() === course._id.toString(),
          );
          const totalSessions = courseSessions.length;

          const presentCount = courseSessions.filter((session) =>
            session.attendances.some((a) => a.email === student.email),
          ).length;

          const percentage =
            totalSessions > 0
              ? Math.round((presentCount / totalSessions) * 100)
              : 0;

          data.push({
            "Registration Number": student.registrationNumber || "N/A",
            Name: student.name,
            Department: student.department || "N/A",
            Batch: student.batch || "N/A",
            "Course Code": course.courseCode,
            "Course Name": course.courseName,
            Teacher: course.teacherId?.name || "N/A",
            "Total Sessions": totalSessions,
            Present: presentCount,
            Absent: totalSessions - presentCount,
            Percentage: `${percentage}%`,
            Email: student.email,
          });
        });
      });

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Attendance Report");

        worksheet.columns = [
          {
            header: "Registration Number",
            key: "Registration Number",
            width: 20,
          },
          { header: "Name", key: "Name", width: 25 },
          { header: "Department", key: "Department", width: 15 },
          { header: "Batch", key: "Batch", width: 10 },
          { header: "Course Code", key: "Course Code", width: 15 },
          { header: "Course Name", key: "Course Name", width: 30 },
          { header: "Teacher", key: "Teacher", width: 20 },
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
          `attachment; filename=comprehensive_attendance_report.xlsx`,
        );

        await workbook.xlsx.write(res);
        res.end();
      } else {
        const parser = new Parser({ fields: Object.keys(data[0] || {}) });
        const csv = data.length > 0 ? parser.parse(data) : "No data";

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=comprehensive_attendance_report.csv`,
        );
        res.send(csv);
      }
    } catch (error) {
      console.error("Export comprehensive report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
