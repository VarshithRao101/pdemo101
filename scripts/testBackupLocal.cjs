// scripts/testBackupLocal.cjs
const backupService = require('../server/backupService.cjs');

console.log('--- TESTING BACKUP ENCRYPTION LOGIC ---');

const samplePlaintextData = JSON.stringify({
  system: 'Inspire ERP System',
  timestamp: new Date().toISOString(),
  students: [
    { id: 'STU-101', name: 'K. Rahul Sharma', stream: 'MPC', fee: 120000 }
  ],
  users: [
    { id: 'U-1', username: 'admin1', role: 'rector_admin' } // password hash excluded!
  ]
}, null, 2);

console.log('[1] Sample Plaintext Preview:');
console.log(samplePlaintextData.substring(0, 150) + '...\n');

const encryptedPayload = backupService.encryptData(samplePlaintextData);

console.log('[2] AES-256-GCM Encrypted Output Preview:');
console.log(encryptedPayload);

try {
  JSON.parse(encryptedPayload).students;
  console.log('ERROR: Plain JSON parsed directly!');
} catch (e) {
  console.log('\n[3] Verification Passed: Reading file as raw plain JSON fails to expose student data because content is encrypted ciphertext.');
}

console.log('\n--- DRIVE CONFIGURATION CHECK ---');
console.log('GOOGLE_SERVICE_ACCOUNT_KEY present:', Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY));
console.log('GOOGLE_DRIVE_FOLDER_ID present:', Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID));
console.log('BACKUP_ENCRYPTION_KEY present:', Boolean(process.env.BACKUP_ENCRYPTION_KEY));
