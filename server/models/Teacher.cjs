const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Teacher' },
  classification: { type: String, default: 'Teaching' },
  subject: { type: String, default: 'General' },
  salary: { type: Number, default: 50000 },
  mobile: { type: String, default: '' },
  email: { type: String, default: '' },
  branch: { type: String, required: true, index: true },
  status: { type: String, default: 'Active', index: true },
  joiningDate: { type: String, default: '' },
  salaryStatus: { type: String, default: 'pending' },
  salaryPaidAmount: { type: Number, default: 0 },
  salaryPaymentDate: { type: String, default: '' },
  assignedSections: [{ type: String }],
  monthlySalaries: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true,
  strict: false,
  autoIndex: true
});

teacherSchema.index({ branch: 1, id: 1 });
teacherSchema.index({ branch: 1, status: 1 });

const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
