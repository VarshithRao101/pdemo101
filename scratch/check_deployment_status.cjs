const https = require('https');

function fetchGithub(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path,
      headers: { 'User-Agent': 'Node.js' }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function main() {
  const statuses = await fetchGithub('/repos/VarshithRao101/pdemo101/deployments/5717618995/statuses');
  console.log(JSON.stringify(statuses, null, 2));
}

main();
