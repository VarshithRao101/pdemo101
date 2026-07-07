import appModule from '../server/dist/app.js';
import dbModule from '../server/dist/config/db.js';

const app = appModule.default?.default ?? appModule.default ?? appModule;
const connectDB = dbModule.connectDB ?? dbModule.default?.connectDB;

let dbReady = null;

export default async function handler(req, res) {
  try {
    dbReady ??= connectDB().catch(error => {
      dbReady = null;
      throw error;
    });
    await dbReady;
    return app(req, res);
  } catch (error) {
    console.error('[Vercel API] Database bootstrap failed:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Database bootstrap failed',
    });
  }
}
