import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'jc_erp_demo';

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    // Redact password from connection string for safe console logging
    const redactedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Connecting to MongoDB... Target DB: ${dbName}`);

    await mongoose.connect(uri, {
      dbName: dbName,
    });

    console.log(`Successfully connected to database: ${dbName}`);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database object on Mongoose connection is undefined.');
    }

    // List all existing collections in the target database
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    console.log(`Existing collections in "${dbName}":`, collectionNames);

    // Isolation check: if collections are found on first run, exit immediately
    if (collections.length > 0 && process.env.BYPASS_DB_EMPTY_CHECK !== 'true') {
      console.error(
        `\n======================================================================\n` +
        `CRITICAL WARNING: Database "${dbName}" is NOT empty.\n` +
        `Found collections: ${collectionNames.join(', ')}\n` +
        `To prevent cross-contamination or data loss, execution has been HALTED.\n` +
        `======================================================================\n`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};
