const { connectToDatabase } = require('../server/db.cjs');
const User = require('../server/models/User.cjs');
const bcrypt = require('bcryptjs');

async function main() {
  await connectToDatabase();
  console.log('Connected to DB.');

  const hashedPassword = bcrypt.hashSync('RectorPass#2026', 10);
  const hashedPin = bcrypt.hashSync('346398', 10);

  const res = await User.updateOne(
    { username: 'admin1' },
    {
      $set: {
        password: hashedPassword,
        pin: hashedPin,
        pin_plaintext: '346398',
        status: 'active'
      }
    }
  );

  console.log('Updated admin1 user in DB:', res);

  const admin1 = await User.findOne({ username: 'admin1' });
  console.log('Testing password "RectorPass#2026":', bcrypt.compareSync('RectorPass#2026', admin1.password));
  console.log('Testing PIN "346398":', bcrypt.compareSync('346398', admin1.pin));
}

main().catch(err => console.error(err));
