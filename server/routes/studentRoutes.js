const express = require("express");
const User = require("../models/User");
const Course = require("../models/Course");
const AttendanceSession = require("../models/AttendanceSession");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// PUT /api/student/profile — update name and phone
router.put(
  "/student/profile",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { name, phone } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (phone !== undefined) updates.phone = phone;

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
      }).select("-password");
      res.json({ user });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/attendance-sessions/active — list active sessions for student's enrolled courses
router.get(
  "/attendance-sessions/active",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const studentEmail = req.user.email;
      const now = new Date();

      // Find courses the student is enrolled in
      const courses = await Course.find({ students: studentEmail });
      const courseIds = courses.map((c) => c._id);

      // Find active sessions for those courses
      const sessions = await AttendanceSession.find({
        courseId: { $in: courseIds },
        startTime: { $lte: now },
        endTime: { $gte: now },
      }).populate("courseId", "courseName courseCode department season");

      // Add already-attended flag
      const sessionsWithStatus = sessions.map((s) => {
        const alreadyMarked = s.attendances.some(
          (a) => a.email === studentEmail,
        );
        return {
          _id: s._id,
          course: s.courseId,
          location: s.location,
          startTime: s.startTime,
          endTime: s.endTime,
          radiusMeters: s.radiusMeters,
          qrToken: undefined, // Don't expose QR token
          alreadyMarked,
        };
      });

      res.json({ sessions: sessionsWithStatus });
    } catch (error) {
      console.error("Active sessions error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// POST /api/attendance/mark — submit QR attendance with validation (location disabled)
router.post(
  "/attendance/mark",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { sessionId, qrToken, lat, lng } = req.body;
      const studentEmail = req.user.email;

      if (!sessionId || !qrToken) {
        return res
          .status(400)
          .json({ message: "sessionId and qrToken are required" });
      }

      if (
        lat === undefined ||
        lat === null ||
        lng === undefined ||
        lng === null
      ) {
        return res.status(400).json({
          message:
            "Your location is required to mark attendance. Please enable location services.",
        });
      }

      // Find session
      const session =
        await AttendanceSession.findById(sessionId).populate("courseId");
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // 1. Validate QR token
      if (session.qrToken !== qrToken) {
        return res.status(400).json({ message: "Invalid QR code" });
      }

      // 2. Validate student is enrolled in course
      const course = await Course.findById(
        session.courseId._id || session.courseId,
      );
      if (!course || !course.students.includes(studentEmail)) {
        return res
          .status(403)
          .json({ message: "You are not enrolled in this course" });
      }

      // 2.5. Validate batch if session has batch filter
      if (session.batch) {
        const student = await User.findOne({
          email: studentEmail,
          role: "student",
        });
        if (!student || student.batch !== session.batch) {
          return res.status(403).json({
            message: `This session is only for batch ${session.batch}`,
          });
        }
      }

      // 3. Validate time window - strict (no buffer)
      const now = new Date();
      const sessionStart = new Date(session.startTime);
      const sessionEnd = new Date(session.endTime);

      console.log("Time validation:", {
        now: now.toISOString(),
        nowLocal: now.toString(),
        sessionStart: sessionStart.toISOString(),
        sessionStartLocal: sessionStart.toString(),
        sessionEnd: sessionEnd.toISOString(),
        sessionEndLocal: sessionEnd.toString(),
        nowTimestamp: now.getTime(),
        startTimestamp: sessionStart.getTime(),
        endTimestamp: sessionEnd.getTime(),
        isBeforeStart: now < sessionStart,
        isAfterEnd: now > sessionEnd,
      });

      // Strict time validation - must be within exact session time
      if (now < sessionStart || now > sessionEnd) {
        const minutesUntilStart = Math.round(
          (sessionStart.getTime() - now.getTime()) / 1000 / 60,
        );
        const minutesSinceEnd = Math.round(
          (now.getTime() - sessionEnd.getTime()) / 1000 / 60,
        );

        return res.status(400).json({
          message: "Attendance session is not active",
          debug: {
            currentTime: now.toISOString(),
            sessionStart: sessionStart.toISOString(),
            sessionEnd: sessionEnd.toISOString(),
            minutesUntilStart: minutesUntilStart > 0 ? minutesUntilStart : null,
            minutesSinceEnd: minutesSinceEnd > 0 ? minutesSinceEnd : null,
          },
        });
      }

      // 4. Location validation - ENABLED
      const distance = haversineDistance(
        lat,
        lng,
        session.location.lat,
        session.location.lng,
      );
      if (distance > session.radiusMeters) {
        return res.status(400).json({
          message: `You are too far from the class. You are ${Math.round(distance)}m away but must be within ${session.radiusMeters}m.`,
          distance: Math.round(distance),
          radiusMeters: session.radiusMeters,
        });
      }

      // 5. Check duplicate
      if (session.attendances.some((a) => a.email === studentEmail)) {
        return res.status(400).json({
          message: "You have already marked attendance for this session",
        });
      }

      // All validations passed — mark attendance
      session.attendances.push({
        email: studentEmail,
        timestamp: now,
        lat,
        lng,
      });
      await session.save();

      res.json({ message: "Attendance marked successfully" });
    } catch (error) {
      console.error("Mark attendance error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// GET /api/attendance-sessions/history — attendance history per course
router.get(
  "/attendance-sessions/history",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const studentEmail = req.user.email;
      const { courseId } = req.query;

      // Find courses the student is enrolled in
      let courses;
      if (courseId) {
        courses = await Course.find({ _id: courseId, students: studentEmail });
      } else {
        courses = await Course.find({ students: studentEmail });
      }

      const history = [];

      for (const course of courses) {
        const sessions = await AttendanceSession.find({
          courseId: course._id,
        }).sort({ startTime: 1 });

        const sessionData = sessions.map((s) => {
          const attended = s.attendances.find((a) => a.email === studentEmail);
          return {
            sessionId: s._id,
            startTime: s.startTime,
            endTime: s.endTime,
            status: attended ? "Present" : "Absent",
            markedAt: attended ? attended.timestamp : null,
          };
        });

        const totalSessions = sessions.length;
        const presentCount = sessionData.filter(
          (s) => s.status === "Present",
        ).length;

        history.push({
          course: {
            _id: course._id,
            courseName: course.courseName,
            courseCode: course.courseCode,
            department: course.department,
            season: course.season,
          },
          sessions: sessionData,
          totalSessions,
          presentCount,
          percentage:
            totalSessions > 0
              ? Math.round((presentCount / totalSessions) * 100)
              : 0,
        });
      }

      res.json({ history });
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

module.exports = router;
