const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  referenceCode: { type: String, required: true, unique: true },
  studentName: { type: String, required: true, trim: true },
  parentName: { type: String, trim: true, default: '' },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: '' },
  stream: { type: String, trim: true, default: 'MPC' },
  preferredCampus: { type: String, required: true, trim: true },
  currentGrade: { type: String, trim: true, default: '10th Class' },
  notes: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Pending', 'New', 'Contacted', 'Enrolled', 'Closed', 'Archived'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
