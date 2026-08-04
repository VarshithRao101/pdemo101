const mongoose = require('mongoose');
require('dotenv').config();

const Enquiry = require('../server/models/Enquiry.cjs');

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Find all enquiries
  const enquiries = await Enquiry.find({}).sort({ createdAt: -1 }).lean();
  console.log('Total enquiries in DB:', enquiries.length);
  console.log('Enquiries:');
  console.log(JSON.stringify(enquiries, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
