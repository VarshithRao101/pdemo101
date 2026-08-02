const mongoose = require('mongoose');
require('dotenv').config();

const FALLBACK_MONGODB_URI = 'mongodb+srv://inspirehead:7gPAF4kPW13lwETe@cluster0.aw1u47g.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';
const MONGODB_URI = process.env.MONGODB_URI || FALLBACK_MONGODB_URI;

function sanitizeUri(uri) {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

async function inspectMongo() {
  console.log('--- MONGODB INSPECTION SCRIPT ---');
  console.log('Configured MONGODB_URI (sanitized):', sanitizeUri(MONGODB_URI));
  console.log('Configured MONGODB_DB_NAME env:', process.env.MONGODB_DB_NAME || '(not set, default: jc_erp_prod)');

  const match = MONGODB_URI.match(/@([^/?]+)\/([^?]+)/);
  if (match) {
    console.log('Cluster Host Domain:', match[1]);
    console.log('Database Name in URI Path:', match[2]);
  } else {
    console.log('Could not parse host/dbname from URI format.');
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod',
      serverSelectionTimeoutMS: 5000,
    });

    console.log('\n✅ Successfully connected to MongoDB!');
    const adminDb = conn.connection.db.admin();

    // List all databases available to this connection user
    try {
      const dbsList = await adminDb.listDatabases();
      console.log('\n--- DATABASES ON THIS CLUSTER ---');
      dbsList.databases.forEach(db => console.log(` - ${db.name} (size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`));
    } catch (adminErr) {
      console.log('Could not list all databases (user might lack clusterAdmin permissions):', adminErr.message);
    }

    // List collections in the current database
    const db = conn.connection.db;
    console.log('\n--- COLLECTIONS IN DATABASE:', db.databaseName, '---');
    const collections = await db.listCollections().toArray();
    console.log('Collection Count:', collections.length);
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - Collection: "${col.name}" | Document Count: ${count}`);
    }

    // Sample documents from 'students' or 'users'
    if (collections.some(c => c.name === 'students')) {
      const sampleStudents = await db.collection('students').find().limit(3).toArray();
      console.log('\n--- SAMPLE STUDENTS IN MONGODB ---');
      console.log(JSON.stringify(sampleStudents, null, 2));
    } else {
      console.log('\n⚠️ Collection "students" does NOT exist in database:', db.databaseName);
    }

    if (collections.some(c => c.name === 'users')) {
      const sampleUsers = await db.collection('users').find().limit(3).toArray();
      console.log('\n--- SAMPLE USERS IN MONGODB ---');
      console.log(JSON.stringify(sampleUsers, null, 2));
    }

    await mongoose.disconnect();
    console.log('\nDisconnected cleanly.');
  } catch (err) {
    console.error('\n❌ Failed to connect or query MongoDB:', err);
  }
}

inspectMongo();
