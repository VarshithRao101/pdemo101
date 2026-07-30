const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  branch: { type: String, required: true, unique: true, index: true },
  blocks: { type: mongoose.Schema.Types.Mixed, default: {} },
  rooms: [{
    _id: String,
    roomNumber: String,
    block: String,
    capacity: Number,
    occupants: [{ studentId: String, name: String, course: String, rollNumber: String }]
  }]
}, { 
  timestamps: true,
  autoIndex: true
});

const Hostel = mongoose.models.Hostel || mongoose.model('Hostel', hostelSchema);

module.exports = Hostel;
