const { connectToDatabase } = require('../server/db.cjs');
const User = require('../server/models/User.cjs');
const bcrypt = require('bcryptjs');

async function main() {
  await connectToDatabase();
  console.log('Connected to DB via connectToDatabase');

  const admin1 = await User.findOne({ username: 'admin1' });
  console.log('Admin1 user from DB:');
  console.log(JSON.stringify({
    username: admin1?.username,
    role: admin1?.role,
    status: admin1?.status,
    password: admin1?.password,
    pin: admin1?.pin
  }, null, 2));

  if (admin1) {
    console.log('Testing password "RectorPass#2026":', bcrypt.compareSync('RectorPass#2026', admin1.password));
    console.log('Testing PIN "346398":', bcrypt.compareSync('346398', admin1.pin));
  }
}

main().catch(err => console.error(err));
