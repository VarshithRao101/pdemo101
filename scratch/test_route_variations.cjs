const https = require('https');
const http = require('http');

const BASE_URL = 'https://inspirecolleges.vercel.app';

function testEndpoint(path, payload = {}) {
  const url = `${BASE_URL}${path}`;
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          duration: Date.now() - startTime,
          data: data.slice(0, 150)
        });
      });
    });
    req.on('error', err => resolve({ path, status: 'ERR', error: err.message }));
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== TESTING ROUTE MATCHING & DOUBLE-PREFIX PATHS ===\n');

  const credentials = { identifier: 'admin1', password: 'RectorPass#2026', pin: '346398' };

  const testPaths = [
    '/api/auth/login',         // Normal route -> Should 200
    '/api/api/auth/login',     // Double prefix bug -> 404
    '/auth/login',             // Missing /api prefix -> 404 currently
    '/api/auth/login/',        // Trailing slash -> ?
    '/api/login',              // Direct alias -> 404 currently
    '/api/auth/verify-credentials', // Normal verify -> Should 200
    '/api/api/auth/verify-credentials', // Double prefix bug -> 404
    '/auth/verify-credentials'  // Missing /api prefix -> 404 currently
  ];

  for (const path of testPaths) {
    const res = await testEndpoint(path, credentials);
    console.log(`Path: [${res.path.padEnd(35)}] -> Status: ${res.status} (${res.duration}ms)`);
  }
}

main();
