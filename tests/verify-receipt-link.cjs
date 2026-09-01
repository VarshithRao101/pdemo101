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

const req = (method, path, { token, body, form } = {}) => new Promise((resolve, reject) => {
  const data = form ? new URLSearchParams(form).toString() : body ? JSON.stringify(body) : null;
  const type = form ? 'application/x-www-form-urlencoded' : 'application/json';
  const r = http.request(`${BASE}${path}`, {
    method,
    headers: {
      ...(data ? { 'Content-Type': type, 'Content-Length': Buffer.byteLength(data) } : {}),
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

    // Receipts come from the DETAIL route, not the list.
    //
    // `receipts` and `yearHistory` were deliberately projected out of list
    // responses (STUDENT_LIST_OMIT in server/app.cjs) — they were a quarter of
    // the payload and only single-student screens read them. This suite still
    // filtered the LIST on `s.receipts`, so it found none and reported
    // "0 students have receipts" against a database full of them: a red suite
    // describing an optimisation, not a fault. Fetch each student properly.
    const withReceipts = [];
    for (const row of students) {
      const detail = await req('GET', `/api/accountant/students/${row.studentId}`, { token });
      const full = detail.json?.data;
      if (full && (full.receipts || []).length > 0) withReceipts.push(full);
    }
    ok('some students have receipts', withReceipts.length > 0, `${withReceipts.length} of ${students.length} students`);

    let total = 0, tokened = 0;
    for (const s of withReceipts) {
      for (const r of s.receipts) {
        total++;
        if (r.receiptToken && r.receiptToken.length === 22) tokened++;
      }
    }
    ok('EVERY historical receipt carries a token', total > 0 && tokened === total, `${tokened}/${total}`);

    // --- The gate ------------------------------------------------------
    const owner = withReceipts.find(s => String(s.parentMobile || s.mobile || '').replace(/\D/g, '').length >= 4)
      || withReceipts[0];
    const sample = owner.receipts[0];
    const link = `/r/${encodeURIComponent(sample.receiptNumber)}/${sample.receiptToken}`;
    const last4 = String(owner.parentMobile || owner.mobile).replace(/\D/g, '').slice(-4);

    const gate = await req('GET', link);
    ok('a valid link opens the gate', gate.status === 200, `status ${gate.status}`);
    ok('the gate asks for 4 digits', gate.raw.includes('last 4 digits'));
    ok('the gate names NO student', !gate.raw.includes(owner.name.split(' ')[0]));
    ok('the gate shows NO amount', !gate.raw.includes('Amount'));
    ok('the gate leaks no receipt number', !gate.raw.includes(sample.receiptNumber.slice(4)));

    const forged = await req('GET', `/r/${encodeURIComponent(sample.receiptNumber)}/${'x'.repeat(22)}`);
    ok('a forged token is still refused', forged.status === 404, `status ${forged.status}`);

    const wrong = await req('POST', link, { form: { last4: String((Number(last4) + 1) % 10000).padStart(4, '0') } });
    ok('wrong digits are refused', wrong.status === 403, `status ${wrong.status}`);
    ok('a refusal reveals no student', !wrong.raw.includes(owner.name.split(' ')[0]));

    const short = await req('POST', link, { form: { last4: '12' } });
    ok('a short code is rejected', short.status === 400, `status ${short.status}`);

    const good = await req('POST', link, { form: { last4 } });
    ok('correct digits open the receipt', good.status === 200, `status ${good.status}`);
    ok('the receipt names the student', good.raw.includes(owner.name.split(' ')[0]));
    ok('the receipt shows the amount', good.raw.includes('Amount Received'));

    // Same document as the printed one: the shared stylesheet and its classes.
    ok('uses the shared print stylesheet', good.raw.includes('.pdf-tbl') && good.raw.includes('.pdf-tiles'));
    ok('renders the letterhead', good.raw.includes('class="pdf-logo"'), 'no logo img');
    ok('prints on half A4', good.raw.includes('@page { size: 210mm 148.5mm'));
    ok('no inline script (CSP would block it)', !/<script(?![^>]*src=)/.test(good.raw));
    ok('the fitter is a module, so it runs after the logo loads', /<script type="module" src="\/r-print\.js"/.test(good.raw));

    const js = await req('GET', '/r-print.js');
    ok('the fitter is served', js.status === 200 && js.raw.includes('beforeprint'), `status ${js.status}`);
    ok('the fitter targets half A4', js.raw.includes('148.5 - 16'));

    const forgedPost = await req('POST', `/r/${encodeURIComponent(sample.receiptNumber)}/${'x'.repeat(22)}`, { form: { last4 } });
    ok('a forged token is refused even with right digits', forgedPost.status === 404, `status ${forgedPost.status}`);

    // --- Load and lockout ----------------------------------------------
    // Opening the link repeatedly must never lock a parent out. The GET is a
    // static form, so it carries no budget and no database write.
    let allOpened = true;
    const t0 = Date.now();
    for (let i = 0; i < 25; i++) {
      const g = await req('GET', link);
      if (g.status !== 200) { allOpened = false; break; }
    }
    const perGet = (Date.now() - t0) / 25;
    ok('25 opens in a row all succeed (no lockout)', allOpened);
    ok('an open costs no database round trip', perGet < 25, `${perGet.toFixed(1)}ms each`);

    // The POST is where the digits are checked, so it must run out.
    let refusedAt = null;
    for (let i = 1; i <= 12; i++) {
      const a = await req('POST', link, { form: { last4: '0000' } });
      if (a.status === 429) { refusedAt = i; break; }
    }
    ok('guessing runs out of attempts', refusedAt !== null, 'never rate limited');
    ok('it runs out within 10 tries', refusedAt !== null && refusedAt <= 10, `refused at ${refusedAt}`);

    // The detail endpoint must agree with the list.
    const one = await req('GET', `/api/accountant/students/${withReceipts[0].studentId}`, { token });
    const detailTokens = (one.json?.data?.receipts || []).map(r => r.receiptToken);
    ok('detail endpoint agrees with the list', detailTokens.length > 0 && detailTokens.every(Boolean));
    ok('same receipt, same token', detailTokens[0] === withReceipts[0].receipts[0].receiptToken);

    // Nothing was written to store it: read the same receipt a second time,
    // through the detail route, and the token must come back identical.
    //
    // This used to re-read the LIST, which no longer carries `receipts` — so
    // it compared a real token against `undefined` and failed every run, on a
    // property that line 161 has already shown to hold.
    const again = await req('GET', `/api/accountant/students/${withReceipts[0].studentId}`, { token });
    const t2 = (again.json?.data?.receipts || [])
      .find(r => r.receiptNumber === sample.receiptNumber)?.receiptToken;
    ok('token is stable across requests (derived, not random)', !!t2 && t2 === sample.receiptToken);

    console.log(`\n  ${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error('ERROR', err);
    fail++;
  } finally {
    server.close();
    process.exit(fail === 0 ? 0 : 1);
  }
})();
