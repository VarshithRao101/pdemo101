const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const { connectToDatabase } = require('../server/db.cjs');
const app = require('../server/app.cjs');
const Enquiry = require('../server/models/Enquiry.cjs');

async function runVerification() {
  console.log('--- STARTING PHASE 7.1 VERIFICATION SCRIPT ---');
  await connectToDatabase();

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Test server running at ${baseUrl}`);

    try {
      // 1. Log in as admin1
      console.log('\n--- STEP 1A: Logging in as admin1 ---');
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'admin1',
          password: 'RectorPass#2026',
          pin: '346398'
        })
      });
      const loginData = await loginRes.json();
      const token = loginData.token;
      console.log('Login Status:', loginRes.status);
      console.log('Token acquired:', token ? 'YES (Valid JWT)' : 'NO');

      // 2. GET /api/enquiries as admin1
      console.log('\n--- STEP 1B: GET /api/enquiries as admin1 ---');
      const get1Res = await fetch(`${baseUrl}/api/enquiries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const get1Data = await get1Res.json();
      console.log('GET /api/enquiries HTTP Status:', get1Res.status);
      console.log('Raw GET /api/enquiries Response Body:');
      console.log(JSON.stringify(get1Data, null, 2));

      // 3. STEP 2: PATCH /api/enquiries/ENQ-2026-0002 to change status to "Contacted"
      console.log('\n--- STEP 2A: PATCH /api/enquiries/ENQ-2026-0002 status -> Contacted ---');
      const patchRes = await fetch(`${baseUrl}/api/enquiries/ENQ-2026-0002`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Contacted' })
      });
      const patchData = await patchRes.json();
      console.log('PATCH HTTP Status:', patchRes.status);
      console.log('Raw PATCH Response Body:');
      console.log(JSON.stringify(patchData, null, 2));

      // 4. Query MongoDB directly
      console.log('\n--- STEP 2B: Querying MongoDB Directly for ENQ-2026-0002 ---');
      const mongoDoc = await Enquiry.findOne({ referenceCode: 'ENQ-2026-0002' }).lean();
      console.log('Direct MongoDB Query Result for ENQ-2026-0002:');
      console.log(JSON.stringify(mongoDoc, null, 2));

      // 5. GET /api/enquiries again as admin1
      console.log('\n--- STEP 2C: GET /api/enquiries as admin1 Post-Update ---');
      const get2Res = await fetch(`${baseUrl}/api/enquiries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const get2Data = await get2Res.json();
      console.log('GET /api/enquiries (Post-Update) HTTP Status:', get2Res.status);
      const updatedItem = get2Data.data ? get2Data.data.find(e => e.referenceCode === 'ENQ-2026-0002') : null;
      console.log('Updated Item in GET /api/enquiries response list:');
      console.log(JSON.stringify(updatedItem, null, 2));

      console.log('\n--- VERIFICATION COMPLETED SUCCESSFULLY ---');
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
    }
  });
}

runVerification();
