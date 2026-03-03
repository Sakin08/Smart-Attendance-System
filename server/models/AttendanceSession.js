const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  }
}, { _id: false });

const attendanceSessionSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  radiusMeters: {
    type: Number,
    required: true,
    default: 100
  },
  qrToken: {
    type: String,
    required: true,
    unique: true
  },
  attendances: [attendanceEntrySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
