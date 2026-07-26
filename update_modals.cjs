const fs = require('fs');
const path = require('path');

const accountantPath = path.join(__dirname, 'src', 'views', 'AccountantPortalViews.tsx');
let content = fs.readFileSync(accountantPath, 'utf8');

// 1. Remove Fee Concession / Waivers section from AccountantPortalViews.tsx
const waiverRegex = /{\/\*\s*FEE WAIVERS SECTION\s*\*\/}[\s\S]*?<\/div>\s*<\/div>/g;
content = content.replace(waiverRegex, '');

// Also remove any leftover waiver blocks in the modal
const genericWaiverRegex = /<div style={{\s*background:\s*'#F0FDF4'[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
content = content.replace(genericWaiverRegex, '');

// 2. Fix garbled close buttons in AccountantPortalViews.tsx
content = content.replace(/âœ•/g, '✕');
content = content.replace(/o/g, '✕');
content = content.replace(/â€”/g, '—');
content = content.replace(/A/g, '·');

// 3. Fix Save & Delete button text with clean symbols in Student Editor Modal
content = content.replace(/Save & Update Profile \(OTP Required\)/g, '🔒 Save & Update Profile (OTP Required)');
content = content.replace(/Delete Record/g, '🗑️ Delete Record');
content = content.replace(/Delete Student Permanently/g, '🗑️ Delete Student Permanently');
content = content.replace(/Permanently Delete/g, '🗑️ Permanently Delete');
content = content.replace(/Security Authorization/g, '🔐 Security Authorization');
content = content.replace(/Authorize & Register/g, '🔐 Authorize & Register');

fs.writeFileSync(accountantPath, content, 'utf8');
console.log('AccountantPortalViews.tsx updated successfully.');
