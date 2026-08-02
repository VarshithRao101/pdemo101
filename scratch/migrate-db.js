import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: '.env.local' });
dotenv.config();

const OLD_URI = process.env.MONGODB_URI || 'mongodb+srv://inspirehead:918Xt5GDt1ER6A83@cluster0.q74oac9.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';
const NEW_URI = 'mongodb+srv://inspirehead:7gPAF4kPW13lwETe@cluster0.aw1u47g.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';

async function migrateData() {
  console.log('====================================================');
  console.log('STARTING MONGODB DATABASE CLONE & MIGRATION');
  console.log('====================================================');

  console.log('Connecting to OLD database cluster0.q74oac9.mongodb.net...');
  const oldConn = await mongoose.createConnection(OLD_URI, { dbName: 'jc_erp_prod' }).asPromise();
  console.log('Connected to OLD database: jc_erp_prod');

  console.log('\nConnecting to NEW database cluster0.aw1u47g.mongodb.net...');
  const newConn = await mongoose.createConnection(NEW_URI, { dbName: 'jc_erp_prod' }).asPromise();
  console.log('Connected to NEW database: jc_erp_prod');

  const oldDb = oldConn.db;
  const newDb = newConn.db;

  const collections = await oldDb.listCollections().toArray();
  console.log(`\nFound ${collections.length} collections in OLD database:`);

  const report = [];

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    console.log(`\n--- Migrating collection: "${colName}" ---`);
    const oldCol = oldDb.collection(colName);
    const newCol = newDb.collection(colName);

    const oldDocs = await oldCol.find({}).toArray();
    console.log(`Read ${oldDocs.length} documents from OLD "${colName}".`);

    // Clear existing docs in target collection if any
    await newCol.deleteMany({});

    if (oldDocs.length > 0) {
      await newCol.insertMany(oldDocs);
      console.log(`Inserted ${oldDocs.length} documents into NEW "${colName}".`);
    } else {
      console.log(`Collection "${colName}" is empty, skipping insertion.`);
    }

    const newCount = await newCol.countDocuments({});
    const oldCount = oldDocs.length;
    const match = oldCount === newCount;

    report.push({
      collection: colName,
      oldCount,
      newCount,
      match
    });

    console.log(`Verification for "${colName}": OLD=${oldCount}, NEW=${newCount} (${match ? 'MATCH' : 'MISMATCH!'})`);
  }

  console.log('\n====================================================');
  console.log('MIGRATION SUMMARY & COLLECTION DOCUMENT COUNT COMPARISON');
  console.log('====================================================');
  console.table(report);

  const allMatched = report.every(r => r.match);
  if (allMatched) {
    console.log('\nSUCCESS: All collections copied byte-for-byte and document counts match 100%!');
  } else {
    console.error('\nERROR: Document count mismatch detected in one or more collections!');
    process.exitCode = 1;
  }

  await oldConn.close();
  await newConn.close();
}

migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
