const { connectToDatabase } = require('../server/db.cjs');
const Enquiry = require('../server/models/Enquiry.cjs');
const express = require('express');

async function testSubmission() {
  console.log('--- STARTING PHASE 7 STEP 1 SUBMISSION TEST ---');
  await connectToDatabase();

  const app = require('../server/app.cjs');
  const server = app.listen(3001, async () => {
    console.log('Test server started on http://localhost:3001');

    try {
      // 1. Submit test enquiry 1
      const res1 = await fetch('http://localhost:3001/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: 'Aarav Sharma Test',
          parentName: 'Ramesh Sharma',
          mobile: '9876543210',
          email: 'aarav.sharma@example.com',
          stream: 'MPC (JEE Advanced)',
          preferredCampus: 'Erragattugutta C1',
          currentGrade: 'Grade 10 (Completed)',
          notes: 'Requesting scholarship details and hostel fee structure.'
        })
      });
      const data1 = await res1.json();
      console.log('Submission 1 API Response:', data1);

      // 2. Submit test enquiry 2
      const res2 = await fetch('http://localhost:3001/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: 'Ananya Reddy Test',
          parentName: 'Srinivas Reddy',
          mobile: '9123456789',
          email: 'ananya.reddy@example.com',
          stream: 'BiPC (NEET Medical)',
          preferredCampus: 'Beemaram C1',
          currentGrade: 'Grade 10 (Completed)',
          notes: 'Inquiring about NEET long-term batch admissions.'
        })
      });
      const data2 = await res2.json();
      console.log('Submission 2 API Response:', data2);

      // 3. Verify in MongoDB directly
      const doc1 = await Enquiry.findOne({ referenceCode: data1.referenceCode });
      const doc2 = await Enquiry.findOne({ referenceCode: data2.referenceCode });

      console.log('\n--- VERIFYING MONGO DB RECORDS ---');
      console.log('Doc 1 in MongoDB:', doc1 ? { _id: doc1._id.toString(), ref: doc1.referenceCode, name: doc1.studentName, status: doc1.status, campus: doc1.preferredCampus } : 'NOT FOUND');
      console.log('Doc 2 in MongoDB:', doc2 ? { _id: doc2._id.toString(), ref: doc2.referenceCode, name: doc2.studentName, status: doc2.status, campus: doc2.preferredCampus } : 'NOT FOUND');

      if (doc1 && doc2) {
        console.log('✅ STEP 1 SUBMISSION TEST PASSED: Both test enquiries saved in MongoDBAtlas (jc_erp_prod)!');
      } else {
        console.error('❌ STEP 1 SUBMISSION TEST FAILED!');
      }

    } catch (err) {
      console.error('Error during test submission:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testSubmission();
