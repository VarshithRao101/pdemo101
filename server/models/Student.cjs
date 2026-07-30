const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true, index: true },
  admissionNumber: { type: String, required: true, index: true },
  name: { type: String, required: true },
  fatherName: { type: String, default: '' },
  motherName: { type: String, default: '' },
  mobile: { type: String, default: '' },
  parentMobile: { type: String, default: '' },
  email: { type: String, default: '' },
  course: { type: String, default: 'MPC' },
  section: { type: String, default: 'Section A' },
  branch: { type: String, required: true, index: true },
  rollNumber: { type: String, default: '' },
  status: { type: String, default: 'Active', index: true },
  hostelStatus: { type: String, default: 'Day Scholar' },
  transportStatus: { type: String, default: 'Self Transport' },
  academicYear: { type: String, default: '2026-27', index: true },
  dob: { type: String, default: '' }
}, { 
  timestamps: true,
  autoIndex: true
});

// Highly optimized compound indexes for MongoDB Free Tier queries (< 512 MB)
studentSchema.index({ branch: 1, admissionNumber: 1 });
studentSchema.index({ branch: 1, studentId: 1 });
studentSchema.index({ branch: 1, status: 1 });
studentSchema.index({ branch: 1, academicYear: 1 });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

module.exports = Student;
