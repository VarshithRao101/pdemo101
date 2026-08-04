const mongoose = require('mongoose');

// Configure global Mongoose settings for serverless environments
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 3000);
mongoose.set('autoIndex', false);

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const FALLBACK_MONGODB_URI = 'mongodb+srv://inspirehead:7gPAF4kPW13lwETe@cluster0.aw1u47g.mongodb.net/jc_erp_prod?retryWrites=true&w=majority&appName=Cluster0';
let databaseBlockedUntil = 0;
const DATABASE_BLOCK_COOLDOWN_MS = 30 * 1000;

function isDatabaseTemporarilyBlocked() {
  return Date.now() < databaseBlockedUntil;
}

async function connectToDatabase() {
  if (isDatabaseTemporarilyBlocked()) {
    throw new Error('MongoDB temporarily unavailable. Falling back to managed portal cache.');
  }

  const MONGODB_URI = process.env.MONGODB_URI || FALLBACK_MONGODB_URI;

  if (cached.conn && mongoose.connection.readyState === 1) {
    databaseBlockedUntil = 0;
    return cached.conn;
  }

  if (!cached.promise || (mongoose.connection && mongoose.connection.readyState === 0)) {
    const opts = {
      dbName: process.env.MONGODB_DB_NAME || 'jc_erp_prod',
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 15000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        databaseBlockedUntil = 0;
        console.log('✅ [Database]: Connected to MongoDB (' + (process.env.MONGODB_DB_NAME || 'jc_erp_prod') + ')');
        return mongooseInstance.connection;
      })
      .catch((err) => {
        databaseBlockedUntil = Date.now() + DATABASE_BLOCK_COOLDOWN_MS;
        if (MONGODB_URI !== FALLBACK_MONGODB_URI) {
          console.warn('⚠️ [Database]: Primary MONGODB_URI failed (' + err.message + '). Retrying with Atlas fallback...');
          return mongoose.connect(FALLBACK_MONGODB_URI, opts).then((mongooseInstance) => {
            databaseBlockedUntil = 0;
            console.log('✅ [Database]: Connected via Atlas fallback URI.');
            return mongooseInstance.connection;
          });
        }
        cached.promise = null;
        global.mongoose.promise = null;
        console.error('❌ [Database]: MongoDB connection error:', err.message);
        throw err;
      });
    global.mongoose.promise = cached.promise;
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    global.mongoose.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = { connectToDatabase, isDatabaseTemporarilyBlocked };
