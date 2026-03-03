const express = require('express');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Course = require('../models/Course');
const AttendanceSession = require('../models/AttendanceSession');
const { verifyToken, authorize } = require('../middleware/auth');

const router = express.Router();

// ─── User Management ─────────────────────────────────

// GET /api/admin/users — list all users (with optional role filter)
router.get('/users', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/users/:id/role — change user role
router.put('/users/:id/role', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Course Management ───────────────────────────────

// GET /api/admin/courses
router.get('/courses', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.season) filter.season = req.query.season;

    const courses = await Course.find(filter).populate('teacherId', 'name email');
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/courses/:id
router.delete('/courses/:id', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    // clean up sessions too
    await AttendanceSession.deleteMany({ courseId: req.params.id });
    res.json({ message: 'Course and its sessions deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Reports ─────────────────────────────────────────

// GET /api/admin/reports — aggregate attendance report with filters
router.get('/reports', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const { department, season, courseId } = req.query;

    // Build course filter
    const courseFilter = {};
    if (department) courseFilter.department = department;
    if (season) courseFilter.season = season;
    if (courseId) courseFilter._id = courseId;

    const courses = await Course.find(courseFilter).populate('teacherId', 'name email');

    const report = [];

    for (const course of courses) {
      const sessions = await AttendanceSession.find({ courseId: course._id }).sort({ startTime: 1 });

      const studentStats = {};
      course.students.forEach(email => {
        studentStats[email] = { present: 0, total: sessions.length };
      });

      sessions.forEach(session => {
        course.students.forEach(email => {
          if (session.attendances.some(a => a.email === email)) {
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
          teacher: course.teacherId
        },
        totalSessions: sessions.length,
        enrolledStudents: course.students.length,
        students: Object.entries(studentStats).map(([email, stats]) => ({
          email,
          present: stats.present,
          total: stats.total,
          percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
        }))
      });
    }

    res.json({ report });
  } catch (error) {
    console.error('Admin report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/reports/export
router.get('/reports/export', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const { department, season, courseId, format } = req.query;

    const courseFilter = {};
    if (department) courseFilter.department = department;
    if (season) courseFilter.season = season;
    if (courseId) courseFilter._id = courseId;

    const courses = await Course.find(courseFilter).populate('teacherId', 'name email');
    const data = [];

    for (const course of courses) {
      const sessions = await AttendanceSession.find({ courseId: course._id }).sort({ startTime: 1 });

      course.students.forEach(email => {
        let present = 0;
        sessions.forEach(s => {
          if (s.attendances.some(a => a.email === email)) present++;
        });

        data.push({
          'Course': course.courseName,
          'Course Code': course.courseCode,
          'Department': course.department,
          'Season': course.season,
          'Teacher': course.teacherId?.name || '-',
          'Student Email': email,
          'Sessions Attended': present,
          'Total Sessions': sessions.length,
          'Percentage': sessions.length > 0 ? Math.round((present / sessions.length) * 100) + '%' : '0%'
        });
      });
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Report');

      if (data.length > 0) {
        worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key, width: 20 }));
        data.forEach(row => worksheet.addRow(row));
        worksheet.getRow(1).font = { bold: true };
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else {
      const parser = new Parser({ fields: Object.keys(data[0] || {}) });
      const csv = data.length > 0 ? parser.parse(data) : 'No data';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
      res.send(csv);
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/stats — dashboard stats
router.get('/stats', verifyToken, authorize('admin'), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalCourses = await Course.countDocuments();
    const totalSessions = await AttendanceSession.countDocuments();

    res.json({ totalStudents, totalTeachers, totalCourses, totalSessions });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
