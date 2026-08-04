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
  if (Array.isArray(deployments)) {
    deployments.forEach((d, idx) => {
      console.log(`Deployment [${idx}]: ID=${d.id}, sha=${d.sha}, created_at=${d.created_at}, env=${d.environment}`);
    });
  } else {
    console.log(deployments);
  }
}

main();
