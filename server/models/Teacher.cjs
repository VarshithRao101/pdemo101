const mongoose = require('mongoose');
const softDeletePlugin = require('./softDelete.cjs');

const teacherSchema = new mongoose.Schema({
  id: {
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
  subject: {
    type: String,
    required: true,
    trim: true
  },
  salary: {
    type: Number,
    required: true,
    default: 0
  },
  mobile: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  branch: {
    type: String,
    required: true,
    enum: ['Erragattugutta C1', 'Erragattugutta C2', 'Beemaram C1', 'Beemaram C2'],
    index: true
  },
  classification: {
    type: String,
    enum: ['Teaching', 'Non-Teaching'],
    default: 'Teaching'
  },
  role: { type: String, default: 'Senior Lecturer', trim: true },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  salaryLedger: {
    type: Object,
    default: {}
  },
  monthlySalaries: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Adds deletedAt/deletedBy and hides soft-deleted rows from every
// read automatically. See softDelete.cjs for why this is a plugin
// rather than a field each query has to remember to filter on.
teacherSchema.plugin(softDeletePlugin);

const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
