const mongoose = require('mongoose');
require('dotenv').config();
const Student = require('../server/models/Student.cjs');

const FALLBACK_MONGODB_URI = 'mongodb+srv://inspirehead:7gPAF4kPW13lwETe@cluster0.aw1u47g.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_URI = process.env.MONGODB_URI || FALLBACK_MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod' });
  const student = await Student.findOne({ admissionNumber: 'INS-2026-PAYTEST' }).lean();
  console.log(JSON.stringify(student, null, 2));
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
