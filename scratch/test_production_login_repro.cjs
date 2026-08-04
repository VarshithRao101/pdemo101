const https = require('https');
const http = require('http');

const TARGETS = [
  'https://inspirecolleges.vercel.app',
  'https://pdemo101.vercel.app',
  'http://localhost:3000',
  'http://localhost:3005'
];

async function sendLoginRequest(baseUrl, payload) {
  const url = `${baseUrl}/api/auth/login`;
  const body = JSON.stringify(payload);

  const client = url.startsWith('https') ? https : http;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({
          url,
          status: res.statusCode,
          duration,
          data: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        url,
        status: 'NETWORK_ERROR',
        error: err.message,
        duration: Date.now() - startTime
      });
    });

    req.write(body);
    req.end();
  });
}

async function runReproduction() {
  console.log('=== TESTING LOGIN REPRO ACROSS DOMAINS ===\n');

  const credentials = {
    identifier: 'admin1',
    password: 'RectorPass#2026',
    pin: '346398'
  };

  for (const targetUrl of TARGETS) {
    console.log(`\n--- Target URL: ${targetUrl} ---`);
    const res1 = await sendLoginRequest(targetUrl, credentials);
    console.log(`Cold Start Test: Status=${res1.status}, Duration=${res1.duration}ms, Response:`, JSON.stringify(res1.data));

    if (res1.status !== 'NETWORK_ERROR') {
      console.log('Running 10 rapid concurrent login requests...');
      const burstPromises = Array.from({ length: 10 }).map(() => sendLoginRequest(targetUrl, credentials));
      const burstResults = await Promise.all(burstPromises);
      burstResults.forEach((r, idx) => {
        console.log(`Burst [${idx + 1}]: Status=${r.status}, Duration=${r.duration}ms, Response:`, JSON.stringify(r.data));
      });
    }
  }

  console.log('\n=== REPRO TEST COMPLETED ===');
}

runReproduction();
