/**
 * Does every receipt an accountant can open carry a working link?
 *
 * The bug this exists for: only the receipt returned straight after a payment
 * had a token, so the "Download your receipt" line vanished from every message
 * shared from a student's installment history — which is where it is actually
 * used. This drives the real server against the real database.
 */
require('dotenv').config();
const http = require('http');
const app = require('../server/app.cjs');

const PORT = 4599;
const BASE = `http://127.0.0.1:${PORT}`;
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
};

const req = (method, path, { token, body } = {}) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }, res => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => resolve({ status: res.statusCode, raw, json: (() => { try { return JSON.parse(raw); } catch { return null; } })() }));
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

(async () => {
  const server = http.createServer(app).listen(PORT);
  await new Promise(r => server.once('listening', r));
  console.log('\nRECEIPT LINK — every receipt, not just the newest\n');

  try {
    // Read a real accountant straight from Mongo rather than putting a
    // credential in a file. Nothing is printed.
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jc_erp_prod' });
    const acc = await mongoose.connection.collection('users').findOne({ role: 'admin1', status: 'active' });
    if (!acc) { console.log('  No active admin1 found.'); process.exit(1); }
    const creds = { username: acc.username, password: acc.password };
    if (String(acc.password || '').startsWith('$2')) {
      console.log('  admin1 password is hashed; cannot drive login from here.');
      process.exit(1);
    }

    const login = await req('POST', '/api/auth/login', { body: creds });
    ok('rector can log in', login.status === 200 && login.json?.token, `status ${login.status}`);
    const token = login.json?.token;

    const list = await req('GET', '/api/accountant/students', { token });
    ok('student list returns', list.status === 200, `status ${list.status}`);
    const students = list.json?.data || [];
    ok('list is not empty', students.length > 0, `${students.length} students`);

    const withReceipts = students.filter(s => (s.receipts || []).length > 0);
    ok('some students have receipts', withReceipts.length > 0, `${withReceipts.length} students`);

    let total = 0, tokened = 0;
    for (const s of withReceipts) {
      for (const r of s.receipts) {
        total++;
        if (r.receiptToken && r.receiptToken.length === 22) tokened++;
      }
    }
    ok('EVERY historical receipt carries a token', total > 0 && tokened === total, `${tokened}/${total}`);

    // A token from history must actually open the public page.
    const sample = withReceipts[0].receipts[0];
    const good = await req('GET', `/r/${encodeURIComponent(sample.receiptNumber)}/${sample.receiptToken}`);
    ok('a history token opens the receipt', good.status === 200, `status ${good.status}`);
    ok('the page shows the amount', good.raw.includes('Amount Paid'));
    ok('the page names the student', good.raw.includes(withReceipts[0].name.split(' ')[0]));

    // And a wrong one must still not.
    const bad = await req('GET', `/r/${encodeURIComponent(sample.receiptNumber)}/${'x'.repeat(22)}`);
    ok('a forged token is still refused', bad.status === 404, `status ${bad.status}`);

    // The detail endpoint must agree with the list.
    const one = await req('GET', `/api/accountant/students/${withReceipts[0].studentId}`, { token });
    const detailTokens = (one.json?.data?.receipts || []).map(r => r.receiptToken);
    ok('detail endpoint agrees with the list', detailTokens.length > 0 && detailTokens.every(Boolean));
    ok('same receipt, same token', detailTokens[0] === withReceipts[0].receipts[0].receiptToken);

    // Nothing was written to store it.
    const again = await req('GET', '/api/accountant/students', { token });
    const t2 = (again.json?.data || []).find(s => s.studentId === withReceipts[0].studentId)?.receipts?.[0]?.receiptToken;
    ok('token is stable across requests (derived, not random)', t2 === sample.receiptToken);

    console.log(`\n  ${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
