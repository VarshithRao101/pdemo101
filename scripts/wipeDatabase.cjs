// scripts/wipeDatabase.cjs
// Script to safely drop legacy collections and reset MongoDB to a clean slate.

require('dotenv').config();
const { connectToDatabase } = require('../server/db.cjs');
const mongoose = require('mongoose');

async function wipeDatabase() {
  console.log('🔄 Connecting to MongoDB to wipe legacy collections...');
  await connectToDatabase();
  
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection instance is unavailable.');
  }

  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections to purge.`);

  for (const col of collections) {
    console.log(`🧹 Purging collection: ${col.name}`);
    await db.collection(col.name).deleteMany({});
  }

  console.log('✅ Database wipe complete! All legacy collections cleared.');
  process.exit(0);
}

wipeDatabase().catch((err) => {
  console.error('❌ Database wipe failed:', err);
  process.exit(1);
});
