const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    trim: true
  },
  season: {
    type: String,
    required: true,
    trim: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  courseCode: {
    type: String,
    required: true,
    trim: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: String,  // student emails
    lowercase: true,
    trim: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);
