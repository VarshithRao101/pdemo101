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
  const deployments = await fetchGithub('/repos/VarshithRao101/pdemo101/deployments');
  for (const d of deployments.slice(0, 5)) {
    const statuses = await fetchGithub(`/repos/VarshithRao101/pdemo101/deployments/${d.id}/statuses`);
    console.log(`Deployment ${d.id} (${d.sha.slice(0,7)}):`);
    if (Array.isArray(statuses)) {
      statuses.forEach(s => {
        console.log(`  Environment: ${s.environment}, State: ${s.state}`);
        console.log(`  Target URL: ${s.target_url}`);
        console.log(`  Environment URL: ${s.environment_url}`);
      });
    }
  }
}

main();
