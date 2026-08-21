const mongoose = require('mongoose');
const softDeletePlugin = require('./softDelete.cjs');

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
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  dob: { type: String, default: '' },
  previousSchool: { type: String, default: '', trim: true },
  previousBoard: { type: String, default: '', trim: true },
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
  // Compact receipt summaries for quick UI display
  receipts: [{
    receiptNumber: { type: String },
    date: { type: Date },
    category: { type: String },
    installment: { type: String },
    amount: { type: Number },
    balance: { type: Number },
    mode: { type: String },
    cashier: { type: String }
  }],
  academicYear: { type: String, default: '2026-2027' },

  // --- Year level and progression ---------------------------------------
  //
  // `course` already existed but holds the stream ("MPC"), not the year. The
  // upgrade flow needs to know where a student is in the programme, so that
  // lives here as its own field rather than being parsed out of a free-text
  // course name.
  //
  // Short Term never progresses, and Second Year is the end of the programme,
  // so only First Year is ever upgradeable.
  studentYear: {
    type: String,
    enum: ['First Year', 'Second Year', 'Short Term'],
    default: 'First Year',
    index: true
  },

  // Set when a year's fees are fully cleared. This is what unlocks the upgrade
  // control, and it stays true for the record of that year.
  yearFeeCleared: { type: Boolean, default: false },

  // Frozen record of each completed year: what was owed, what was paid, and
  // every receipt raised in it.
  //
  // An upgrade resets the live fee fields for the new year, so without this
  // the previous year's financial history would be overwritten. Complete
  // History reads live receipts AND these archives, which is why a student in
  // second year can still show what they paid in first year.
  yearHistory: [{
    studentYear: { type: String },
    academicYear: { type: String },
    tuitionFee: { type: Number, default: 0 },
    hostelFee: { type: Number, default: 0 },
    transportFee: { type: Number, default: 0 },
    miscellaneousFee: { type: Number, default: 0 },
    previousPending: { type: Number, default: 0 },
    customFeeSlots: [customFeeSlotSchema],
    tuitionWaiver: { type: Number, default: 0 },
    hostelWaiver: { type: Number, default: 0 },
    transportWaiver: { type: Number, default: 0 },
    miscWaiver: { type: Number, default: 0 },
    totalPayable: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    closedAt: { type: Date },
    closedBy: { type: String, default: '' },
    receipts: [{
      receiptNumber: { type: String },
      date: { type: Date },
      category: { type: String },
      installment: { type: String },
      amount: { type: Number },
      balance: { type: Number },
      mode: { type: String },
      cashier: { type: String }
    }]
  }],
}, {
  timestamps: true
});

// Adds deletedAt/deletedBy and hides soft-deleted rows from every
// read automatically. See softDelete.cjs for why this is a plugin
// rather than a field each query has to remember to filter on.
studentSchema.plugin(softDeletePlugin);

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

module.exports = Student;
