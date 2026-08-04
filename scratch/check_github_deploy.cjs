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
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function main() {
  console.log('--- GitHub Commit Status for f0d1761 ---');
  const statuses = await fetchGithub('/repos/VarshithRao101/pdemo101/commits/f0d1761/status');
  console.log('Statuses:', JSON.stringify(statuses, null, 2));

  console.log('\n--- GitHub Check Runs for f0d1761 ---');
  const checkRuns = await fetchGithub('/repos/VarshithRao101/pdemo101/commits/f0d1761/check-runs');
  console.log('Check Runs:', JSON.stringify(checkRuns, null, 2));

  console.log('\n--- GitHub Deployments ---');
  const deployments = await fetchGithub('/repos/VarshithRao101/pdemo101/deployments');
  console.log('Deployments:', JSON.stringify(deployments, null, 2));
}

main();
