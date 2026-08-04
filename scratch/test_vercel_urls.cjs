const https = require('https');

const candidates = [
  'https://pdemo101.vercel.app',
  'https://pdemo101-varshithrao101.vercel.app',
  'https://pdemo101-varshithrao101s-projects.vercel.app',
  'https://pdemo101-git-main-varshithrao101.vercel.app',
  'https://pdemo101-git-main-varshithrao101s-projects.vercel.app',
  'https://inspire.pdemo101.vercel.app'
];

function testUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet: data.substring(0, 200)
        });
      });
    });
    req.on('error', (err) => {
      resolve({ url, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, error: 'TIMEOUT' });
    });
  });
}

async function main() {
  for (const c of candidates) {
    const res = await testUrl(c);
    console.log('Result for:', c);
    console.log(JSON.stringify(res, null, 2));
  }
}

main();
