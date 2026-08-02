const mongoose = require('mongoose');
require('dotenv').config();
const Payment = require('../server/models/Payment.cjs');
const Student = require('../server/models/Student.cjs');

const FALLBACK_MONGODB_URI = 'mongodb+srv://inspirehead:7gPAF4kPW13lwETe@cluster0.aw1u47g.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_URI = process.env.MONGODB_URI || FALLBACK_MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod' });
  console.log('Connected to MongoDB');

  const student = await Student.findOne({ admissionNumber: 'INS-2026-PAYTEST' });
  if (!student) {
    console.error('Test student not found');
    process.exit(1);
  }

  const amount = 1000;
  const receiptNumber = `SIM-${Date.now().toString().slice(-6)}`;
  const start = Date.now();
  const newPayment = await Payment.create({
    receiptNumber,
    studentId: student.studentId,
    admissionNumber: student.admissionNumber,
    studentName: student.name,
    amount,
    category: 'Tuition Fee',
    installment: 'Installment 1',
    paymentMode: 'Cash',
    cashier: 'sim_runner',
    branch: student.branch,
    date: new Date(),
    remarks: 'Simulated test payment',
    idempotencyKey: `sim_${student.studentId}_${amount}_${Date.now()}`
  });
  const afterCreate = Date.now();

  const updatedStudent = await Student.findOneAndUpdate(
    { _id: student._id },
    { $inc: { totalPaid: amount } },
    { new: true }
  );
  const cleanedSlots = (updatedStudent.customFeeSlots || []).filter(slot => {
    if (!slot) return false;
    const k = String(slot.key || slot.id || '').toLowerCase().trim();
    const n = String(slot.name || '').toLowerCase().trim();
    const standardKeys = ['tuitionfee', 'hostelfee', 'transportfee', 'miscellaneousfee', 'previouspending', 'tuition', 'hostel', 'transport', 'misc'];
    return !standardKeys.includes(k) && !['tuition fee', 'hostel fee', 'transport fee', 'miscellaneous fee', 'previous pending'].includes(n);
  });
  const totalCustomFees = cleanedSlots.reduce((acc, slot) => acc + Number(slot.amount || 0), 0);
  const grossFees = Number(updatedStudent.tuitionFee || 0) + Number(updatedStudent.hostelFee || 0) + Number(updatedStudent.transportFee || 0) + Number(updatedStudent.miscellaneousFee || 0) + Number(updatedStudent.previousPending || 0) + totalCustomFees;
  const totalWaivers = Number(updatedStudent.tuitionWaiver || 0) + Number(updatedStudent.hostelWaiver || 0) + Number(updatedStudent.transportWaiver || 0) + Number(updatedStudent.miscWaiver || 0);

  updatedStudent.customFeeSlots = cleanedSlots;
  updatedStudent.remainingBalance = Math.max(0, Math.round((grossFees - totalWaivers - updatedStudent.totalPaid) * 100) / 100);
  await updatedStudent.save();
  const afterUpdate = Date.now();

  console.log('Payment created:', { receiptNumber: newPayment.receiptNumber, amount: newPayment.amount });
  console.log('Updated student remainingBalance:', updatedStudent.remainingBalance, 'totalPaid:', updatedStudent.totalPaid);
  console.log('Timings (ms): createPayment=', afterCreate - start, ', updateStudent=', afterUpdate - afterCreate, ', total=', afterUpdate - start);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
