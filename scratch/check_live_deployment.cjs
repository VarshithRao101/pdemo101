const https = require('https');

const urls = [
  'https://inspire.pdemo101.vercel.app',
  'https://inspirehnk.org',
  'https://www.inspirehnk.org'
];

async function checkUrl(urlStr) {
  return new Promise((resolve) => {
    https.get(urlStr, (res) => {
      console.log(`\nURL: ${urlStr}`);
      console.log(`Status: ${res.statusCode}`);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      resolve({ url: urlStr, status: res.statusCode, headers: res.headers });
    }).on('error', (err) => {
      console.log(`\nURL: ${urlStr} Error: ${err.message}`);
      resolve({ url: urlStr, error: err.message });
    });
  });
}

async function main() {
  for (const u of urls) {
    await checkUrl(u);
  }
}

main();
