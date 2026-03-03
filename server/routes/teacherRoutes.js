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

// GET /api/courses/:id/batches — get available batches for a course
router.get(
  "/courses/:id/batches",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Fetch students enrolled in this course and get their unique batches
      const students = await User.find({
        email: { $in: course.students },
        role: "student",
      }).select("batch");

      const batches = [
        ...new Set(students.map((s) => s.batch).filter((b) => b)),
      ].sort();

      res.json({ batches });
    } catch (error) {
      console.error("Get batches error:", error);
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

// DELETE /api/courses/:id — delete course
router.delete(
  "/courses/:id",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      let filter = { _id: req.params.id };

      // Teachers can only delete their own courses
      if (req.user.role === "teacher") {
        filter.teacherId = req.user._id;
      }

      const course = await Course.findOne(filter);
      if (!course) {
        return res
          .status(404)
          .json({ message: "Course not found or access denied" });
      }

      // Delete all sessions associated with this course
      await AttendanceSession.deleteMany({ courseId: req.params.id });

      // Delete the course
      await Course.findByIdAndDelete(req.params.id);

      res.json({
        message: "Course and associated sessions deleted successfully",
      });
    } catch (error) {
      console.error("Delete course error:", error);
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
      const { courseId, batch, startTime, endTime, lat, lng, radiusMeters } =
        req.body;

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
        batch: batch || "", // Store batch filter
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

// DELETE /api/attendance-sessions/:id — delete session
router.delete(
  "/attendance-sessions/:id",
  verifyToken,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      let filter = { _id: req.params.id };

      // Teachers can only delete their own sessions
      if (req.user.role === "teacher") {
        filter.teacherId = req.user._id;
      }

      const session = await AttendanceSession.findOne(filter);
      if (!session) {
        return res
          .status(404)
          .json({ message: "Session not found or access denied" });
      }

      await AttendanceSession.findByIdAndDelete(req.params.id);

      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Delete session error:", error);
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

        // Add course information at the top
        worksheet.mergeCells("A1:D1");
        worksheet.getCell("A1").value = "ATTENDANCE REPORT";
        worksheet.getCell("A1").font = { bold: true, size: 14 };
        worksheet.getCell("A1").alignment = { horizontal: "center" };

        worksheet.getCell("A2").value = "Course Name:";
        worksheet.getCell("B2").value = session.courseId.courseName;
        worksheet.getCell("A3").value = "Course Code:";
        worksheet.getCell("B3").value = session.courseId.courseCode;
        worksheet.getCell("A4").value = "Department:";
        worksheet.getCell("B4").value = session.courseId.department;
        worksheet.getCell("A5").value = "Season/Batch:";
        worksheet.getCell("B5").value = session.courseId.season;
        worksheet.getCell("A6").value = "Session Date:";
        worksheet.getCell("B6").value = new Date(
          session.startTime,
        ).toLocaleString();

        // Make labels bold
        ["A2", "A3", "A4", "A5", "A6"].forEach((cell) => {
          worksheet.getCell(cell).font = { bold: true };
        });

        // Add empty row
        worksheet.addRow([]);

        // Add data table headers (row 8)
        const headerRow = worksheet.addRow([
          "Registration Number",
          "Status",
          "Marked At",
          "Email",
        ]);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Set column widths
        worksheet.getColumn(1).width = 20;
        worksheet.getColumn(2).width = 10;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 35;

        // Add data rows
        data.forEach((row) => {
          worksheet.addRow([
            row["Registration Number"],
            row.Status,
            row["Marked At"],
            row.Email,
          ]);
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=attendance_${session.courseId.courseCode}_${new Date(session.startTime).toISOString().split("T")[0]}.xlsx`,
        );

        await workbook.xlsx.write(res);
        res.end();
      } else {
        // CSV format with course info at top
        let csvContent = `ATTENDANCE REPORT\n`;
        csvContent += `Course Name:,${session.courseId.courseName}\n`;
        csvContent += `Course Code:,${session.courseId.courseCode}\n`;
        csvContent += `Department:,${session.courseId.department}\n`;
        csvContent += `Season/Batch:,${session.courseId.season}\n`;
        csvContent += `Session Date:,${new Date(session.startTime).toLocaleString()}\n`;
        csvContent += `\n`; // Empty line

        const parser = new Parser({ fields: Object.keys(data[0] || {}) });
        const dataCSV = data.length > 0 ? parser.parse(data) : "No data";
        csvContent += dataCSV;

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=attendance_${session.courseId.courseCode}_${new Date(session.startTime).toISOString().split("T")[0]}.csv`,
        );
        res.send(csvContent);
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

      // Build data with session-wise attendance
      const data = enrolledStudents.map((email) => {
        const studentInfo = studentMap[email] || {
          registrationNumber: "N/A",
          name: "Unknown",
          department: "N/A",
          batch: "N/A",
        };

        const row = {
          "Registration Number": studentInfo.registrationNumber,
          Name: studentInfo.name,
          Department: studentInfo.department,
          Batch: studentInfo.batch,
        };

        let presentCount = 0;

        // Add each session as a column
        sessions.forEach((session, index) => {
          const attended = session.attendances.some((a) => a.email === email);
          const sessionDate = new Date(session.startTime).toLocaleDateString();
          const sessionTime = new Date(session.startTime).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" },
          );

          row[`Session ${index + 1} (${sessionDate} ${sessionTime})`] = attended
            ? "Present"
            : "Absent";

          if (attended) presentCount++;
        });

        const percentage =
          sessions.length > 0
            ? Math.round((presentCount / sessions.length) * 100)
            : 0;

        row["Total Present"] = presentCount;
        row["Total Absent"] = sessions.length - presentCount;
        row["Total Sessions"] = sessions.length;
        row["Percentage"] = `${percentage}%`;

        return row;
      });

      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Course Attendance Report");

        // Add course information at the top
        const totalColumns = 4 + sessions.length + 4; // Student info + sessions + summary
        worksheet.mergeCells(1, 1, 1, totalColumns);
        worksheet.getCell("A1").value = "COURSE ATTENDANCE REPORT";
        worksheet.getCell("A1").font = { bold: true, size: 14 };
        worksheet.getCell("A1").alignment = { horizontal: "center" };

        worksheet.getCell("A2").value = "Course Name:";
        worksheet.getCell("B2").value = course.courseName;
        worksheet.getCell("A3").value = "Course Code:";
        worksheet.getCell("B3").value = course.courseCode;
        worksheet.getCell("A4").value = "Department:";
        worksheet.getCell("B4").value = course.department;
        worksheet.getCell("A5").value = "Season/Batch:";
        worksheet.getCell("B5").value = course.season;
        worksheet.getCell("A6").value = "Total Sessions:";
        worksheet.getCell("B6").value = sessions.length;
        worksheet.getCell("A7").value = "Total Students:";
        worksheet.getCell("B7").value = enrolledStudents.length;

        // Make labels bold
        ["A2", "A3", "A4", "A5", "A6", "A7"].forEach((cell) => {
          worksheet.getCell(cell).font = { bold: true };
        });

        // Add empty row
        worksheet.addRow([]);

        // Build header row dynamically
        const headers = ["Registration Number", "Name", "Department", "Batch"];

        // Add session headers
        sessions.forEach((session, index) => {
          const sessionDate = new Date(session.startTime).toLocaleDateString();
          const sessionTime = new Date(session.startTime).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" },
          );
          headers.push(`Session ${index + 1}\n${sessionDate}\n${sessionTime}`);
        });

        // Add summary headers
        headers.push(
          "Total Present",
          "Total Absent",
          "Total Sessions",
          "Percentage",
        );

        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        headerRow.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
        headerRow.height = 45;

        // Set column widths
        worksheet.getColumn(1).width = 20; // Reg Number
        worksheet.getColumn(2).width = 25; // Name
        worksheet.getColumn(3).width = 15; // Department
        worksheet.getColumn(4).width = 10; // Batch

        // Session columns
        for (let i = 5; i <= 4 + sessions.length; i++) {
          worksheet.getColumn(i).width = 12;
        }

        // Summary columns
        worksheet.getColumn(5 + sessions.length).width = 12; // Total Present
        worksheet.getColumn(6 + sessions.length).width = 12; // Total Absent
        worksheet.getColumn(7 + sessions.length).width = 12; // Total Sessions
        worksheet.getColumn(8 + sessions.length).width = 12; // Percentage

        // Add data rows
        data.forEach((row) => {
          const rowData = [
            row["Registration Number"],
            row.Name,
            row.Department,
            row.Batch,
          ];

          // Add session attendance
          sessions.forEach((session, index) => {
            const sessionDate = new Date(
              session.startTime,
            ).toLocaleDateString();
            const sessionTime = new Date(session.startTime).toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" },
            );
            const key = `Session ${index + 1} (${sessionDate} ${sessionTime})`;
            rowData.push(row[key]);
          });

          // Add summary
          rowData.push(
            row["Total Present"],
            row["Total Absent"],
            row["Total Sessions"],
            row.Percentage,
          );

          const dataRow = worksheet.addRow(rowData);

          // Color code Present/Absent cells
          sessions.forEach((session, index) => {
            const cellIndex = 5 + index; // Starting from column E (5)
            const cell = dataRow.getCell(cellIndex);
            if (cell.value === "Present") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD4EDDA" }, // Light green
              };
              cell.font = { color: { argb: "FF155724" } }; // Dark green
            } else if (cell.value === "Absent") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8D7DA" }, // Light red
              };
              cell.font = { color: { argb: "FF721C24" } }; // Dark red
            }
            cell.alignment = { horizontal: "center" };
          });
        });

        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${course.courseCode}_detailed_attendance_report.xlsx`,
        );

        await workbook.xlsx.write(res);
        res.end();
      } else {
        // CSV format with course info at top
        let csvContent = `COURSE ATTENDANCE REPORT\n`;
        csvContent += `Course Name:,${course.courseName}\n`;
        csvContent += `Course Code:,${course.courseCode}\n`;
        csvContent += `Department:,${course.department}\n`;
        csvContent += `Season/Batch:,${course.season}\n`;
        csvContent += `Total Sessions:,${sessions.length}\n`;
        csvContent += `Total Students:,${enrolledStudents.length}\n`;
        csvContent += `\n`; // Empty line

        const parser = new Parser({ fields: Object.keys(data[0] || {}) });
        const dataCSV = data.length > 0 ? parser.parse(data) : "No data";
        csvContent += dataCSV;

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${course.courseCode}_detailed_attendance_report.csv`,
        );
        res.send(csvContent);
      }
    } catch (error) {
      console.error("Export course report error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
