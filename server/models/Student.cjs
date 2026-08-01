const mongoose = require('mongoose');

const customFeeSlotSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  admissionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  fatherName: { type: String, default: '', trim: true },
  motherName: { type: String, default: '', trim: true },
  mobile: { type: String, default: '', trim: true },
  parentMobile: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  course: { type: String, default: '', trim: true },
  section: { type: String, default: '', trim: true },
  branch: {
    type: String,
    required: true,
    enum: ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'],
    index: true
  },
  rollNumber: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  dob: { type: String, default: '' },
  address: { type: String, default: '' },
  hostelStatus: {
    type: String,
    enum: ['Resident', 'Day Scholar'],
    default: 'Day Scholar'
  },
  transportStatus: {
    type: String,
    enum: ['College Bus', 'Self Transport'],
    default: 'Self Transport'
  },
  // Base Fees
  tuitionFee: { type: Number, default: 0 },
  hostelFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  miscellaneousFee: { type: Number, default: 0 },
  previousPending: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
  // Fee Waivers (reduces what the student owes)
  tuitionWaiver: { type: Number, default: 0 },
  hostelWaiver: { type: Number, default: 0 },
  transportWaiver: { type: Number, default: 0 },
  miscWaiver: { type: Number, default: 0 },
  // Custom Fee Slots
  customFeeSlots: [customFeeSlotSchema],
  academicYear: { type: String, default: '2026-2027' }
}, {
  timestamps: true
});

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

module.exports = Student;
