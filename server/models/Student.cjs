const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true, index: true },
  admissionNumber: { type: String, required: true, index: true },
  qrId: { type: String, default: '' },
  registrationNumber: { type: String, default: '' },
  name: { type: String, required: true },
  fatherName: { type: String, default: '' },
  motherName: { type: String, default: '' },
  mobile: { type: String, default: '' },
  parentMobile: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  residentialAddress: { type: String, default: '' },
  hostelStatus: { type: String, default: 'Day Scholar' },
  transportStatus: { type: String, default: 'Self Transport' },
  hostelBlock: { type: String, default: '' },
  hostelRoom: { type: String, default: '' },
  course: { type: String, default: 'MPC' },
  section: { type: String, default: 'Section A' },
  branch: { type: String, required: true, index: true },
  rollNumber: { type: String, default: '' },
  status: { type: String, default: 'Active', index: true },
  pastSchool: { type: String, default: '' },
  previousSchool: { type: String, default: '' },
  dob: { type: String, default: '' },
  documents: [{ type: String }],
  tuitionFee: { type: Number, default: 0 },
  booksFee: { type: Number, default: 0 },
  uniformFees: { type: Number, default: 0 },
  hndFees: { type: Number, default: 0 },
  internalExamFees: { type: Number, default: 0 },
  annualExamFees: { type: Number, default: 0 },
  partyFees: { type: Number, default: 0 },
  busFees: { type: Number, default: 0 },
  labFees: { type: Number, default: 0 },
  handLoan: { type: Number, default: 0 },
  othersFee: { type: Number, default: 0 },
  hostelFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  miscellaneousFee: { type: Number, default: 0 },
  previousPending: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
  tuitionWaiver: { type: Number, default: 0 },
  hostelWaiver: { type: Number, default: 0 },
  transportWaiver: { type: Number, default: 0 },
  miscWaiver: { type: Number, default: 0 },
  feeAdjustments: [{ type: Object }],
  isCustomFee: { type: Boolean, default: false },
  marks: [{ subject: String, midterm: Number, final: Number }],
  academicYear: { type: String, default: '2026-27' },
  academicYears: [{ type: mongoose.Schema.Types.Mixed }]
}, { 
  timestamps: true,
  autoIndex: true
});

// Highly optimized compound indexes for MongoDB Free Tier queries
studentSchema.index({ branch: 1, admissionNumber: 1 });
studentSchema.index({ branch: 1, studentId: 1 });
studentSchema.index({ branch: 1, status: 1 });
studentSchema.index({ branch: 1, section: 1 });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

module.exports = Student;
