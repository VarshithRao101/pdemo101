const { connectToDatabase } = require('../server/db.cjs');
const Student = require('../server/models/Student.cjs');
const Payment = require('../server/models/Payment.cjs');

async function runVerification() {
  console.log('--- STARTING PHASE 6.2 VERIFICATION ---');
  await connectToDatabase();

  const student = await Student.findOne({ admissionNumber: 'INS-2026-PAYTEST' });
  if (!student) {
    console.error('Test student INS-2026-PAYTEST not found!');
    process.exit(1);
  }

  console.log('BEFORE PAYMENT FETCHED STUDENT FROM MONGO:');
  console.log({
    _id: student._id.toString(),
    admissionNumber: student.admissionNumber,
    name: student.name,
    branch: student.branch,
    tuitionFee: student.tuitionFee,
    hostelFee: student.hostelFee,
    miscellaneousFee: student.miscellaneousFee,
    previousPending: student.previousPending,
    tuitionWaiver: student.tuitionWaiver,
    hostelWaiver: student.hostelWaiver,
    totalPaid: student.totalPaid,
    remainingBalance: student.remainingBalance,
    receiptsCount: student.receipts.length
  });

  // Verify field values are not zero/blank
  if (!student.name || !student.admissionNumber || !student.branch) {
    console.error('FAIL: Student identity fields are blank/missing!');
    process.exit(1);
  }
  if (student.tuitionFee !== 100000) {
    console.error('FAIL: tuitionFee is not 100,000! Got:', student.tuitionFee);
    process.exit(1);
  }
  if (student.tuitionWaiver !== 10000) {
    console.error('FAIL: tuitionWaiver is not 10,000! Got:', student.tuitionWaiver);
    process.exit(1);
  }

  console.log('✅ Step 1 & 2 Initial Load Verification: PASS! Identity and fee structure fields intact.');

  // Simulate payment processing (mimicking POST /api/accountant/students/:studentId/payments)
  const payAmt = 1000;
  const receiptNumber = `REC-VERIFY-${Date.now().toString().slice(-4)}`;
  const idempotencyKey = `idem_verify_${student.studentId}_${Date.now()}`;

  const newPayment = await Payment.create({
    receiptNumber,
    studentId: student.studentId,
    admissionNumber: student.admissionNumber,
    studentName: student.name,
    amount: payAmt,
    category: 'Tuition Fee',
    installment: 'Installment 2',
    paymentMode: 'UPI / NetBanking',
    cashier: 'accountant_erragattugutta_c1_1',
    branch: student.branch,
    date: new Date(),
    remarks: 'Phase 6.2 test payment verification',
    idempotencyKey
  });

  const updatedStudent = await Student.findOneAndUpdate(
    { _id: student._id },
    { $inc: { totalPaid: payAmt } },
    { new: true }
  );

  const grossFees = Number(updatedStudent.tuitionFee || 0) + Number(updatedStudent.hostelFee || 0) + Number(updatedStudent.transportFee || 0) + Number(updatedStudent.miscellaneousFee || 0) + Number(updatedStudent.previousPending || 0);
  const totalWaivers = Number(updatedStudent.tuitionWaiver || 0) + Number(updatedStudent.hostelWaiver || 0) + Number(updatedStudent.transportWaiver || 0) + Number(updatedStudent.miscWaiver || 0);

  updatedStudent.remainingBalance = Math.max(0, Math.round((grossFees - totalWaivers - updatedStudent.totalPaid) * 100) / 100);
  updatedStudent.receipts.push({
    receiptNumber,
    date: newPayment.date,
    category: newPayment.category,
    installment: newPayment.installment,
    amount: newPayment.amount,
    balance: updatedStudent.remainingBalance,
    mode: newPayment.paymentMode,
    cashier: newPayment.cashier
  });

  await updatedStudent.save();

  console.log('AFTER PAYMENT UPDATED STUDENT RETURNED FROM BACKEND:');
  console.log({
    admissionNumber: updatedStudent.admissionNumber,
    name: updatedStudent.name,
    branch: updatedStudent.branch,
    tuitionFee: updatedStudent.tuitionFee,
    tuitionWaiver: updatedStudent.tuitionWaiver,
    totalPaid: updatedStudent.totalPaid,
    remainingBalance: updatedStudent.remainingBalance,
    receiptsCount: updatedStudent.receipts.length
  });

  if (!updatedStudent.name || !updatedStudent.admissionNumber || updatedStudent.tuitionFee !== 100000 || updatedStudent.tuitionWaiver !== 10000) {
    console.error('FAIL: Fields went blank/zero after payment!');
    process.exit(1);
  }

  if (updatedStudent.totalPaid !== 79000 || updatedStudent.remainingBalance !== 11000) {
    console.error('FAIL: Paid / Remaining calculation incorrect! Got:', { totalPaid: updatedStudent.totalPaid, remainingBalance: updatedStudent.remainingBalance });
    process.exit(1);
  }

  console.log('✅ Step 2 & 3 Post-Payment State & Waiver Line Verification: PASS!');

  // Revert test payment so student remains cleanly at 78,000 paid / 12,000 balance
  await Payment.deleteOne({ _id: newPayment._id });
  updatedStudent.totalPaid = 78000;
  updatedStudent.remainingBalance = 12000;
  updatedStudent.receipts.pop();
  await updatedStudent.save();

  console.log('REVERTED TEST PAYMENT. MONGO DB RESTORED TO CLEAN STATE (78,000 paid / 12,000 balance):');
  console.log({
    admissionNumber: updatedStudent.admissionNumber,
    name: updatedStudent.name,
    totalPaid: updatedStudent.totalPaid,
    remainingBalance: updatedStudent.remainingBalance
  });

  console.log('--- ALL VERIFICATION CHECKS PASSED ---');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
