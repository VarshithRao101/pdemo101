const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, trim: true, index: true },
  password: { type: String, required: true },
  passwordRaw: { type: String },
  role: { 
    type: String, 
    required: true, 
    enum: ['admin1', 'admin2', 'accountant', 'authenticator'],
    index: true 
  },
  campus: { type: String, required: true, index: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  mobile: { type: String, default: '' },
  department: { type: String, default: '' },
  address: { type: String, default: '' },
  lastPinReset: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  autoIndex: true
});

userSchema.index({ campus: 1, role: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
