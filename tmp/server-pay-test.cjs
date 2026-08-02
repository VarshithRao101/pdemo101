const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
require('dotenv').config({ path: '.env' });
const app = require('../server/app.cjs');

const dbUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'jc_erp_prod';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { const parsed = JSON.parse(data); resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed }); }
        catch (e) { resolve({ statusCode: res.statusCode, headers: res.headers, data }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  await mongoose.connect(dbUri, { dbName });
  console.log('Connected to MongoDB for server test.');
  const db = mongoose.connection.client.db(dbName);

  // Seed admin1_test user
  const hashedPin = await bcrypt.hash('784920', 10);
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.collection('users').updateOne({ username: 'admin1_test' }, { $set: { username: 'admin1_test', password: hashedPassword, role: 'admin1', pin: hashedPin, campus: 'Erragattugutta C1', name: 'Test Admin1', status: 'active' } }, { upsert: true });
  console.log('Seeded admin1_test user with password admin123 and PIN 784920');

  const server = app.listen(5001);
  console.log('Started server on port 5001');

  // Login
  const loginRes = await makeRequest({ hostname: '127.0.0.1', port: 5001, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { username: 'admin1_test', password: 'admin123', pin: '784920', role: 'admin1' });
  if (!loginRes.data || !loginRes.data.token) {
    console.error('Login failed', loginRes);
    server.close();
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('Acquired auth token, length:', token.length);

  // Submit payment via API
  const payStart = Date.now();
  const payRes = await makeRequest({ hostname: '127.0.0.1', port: 5001, path: '/api/accountant/students/INS-2026-PAYTEST/payments', method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }, { amount: 1000, category: 'Tuition Fee', installment: 'Installment 1', mode: 'Cash' });
  const payEnd = Date.now();
  console.log('Payment API response status:', payRes.statusCode, 'body:', payRes.data ? payRes.data : payRes);
  console.log('Payment API elapsed ms:', payEnd - payStart);

  // Fetch student doc
  const stud = await db.collection('students').findOne({ admissionNumber: 'INS-2026-PAYTEST' });
  console.log('Student receipts length:', (stud.receipts || []).length);
  console.log(JSON.stringify(stud, null, 2));

  server.close();
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
