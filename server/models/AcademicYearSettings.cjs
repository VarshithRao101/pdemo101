const mongoose = require('mongoose');

const academicYearSettingsSchema = new mongoose.Schema({
  activeYear: { type: String, default: '2026-27' },
  academicYears: [{
    yearId: { type: String, required: true },
    label: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Closed', 'Archived', 'Upcoming'], default: 'Upcoming' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'Admin One' }
  }]
}, { 
  timestamps: true,
  autoIndex: true
});

const AcademicYearSettings = mongoose.models.AcademicYearSettings || mongoose.model('AcademicYearSettings', academicYearSettingsSchema);

module.exports = AcademicYearSettings;
