// api/index.js
// Vercel Serverless Function Handler wrapping Express app with cached Mongo connection
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const appPath = path.resolve(__dirname, '../server/app.cjs');
const dbPath = path.resolve(__dirname, '../server/db.cjs');

const expressApp = require(appPath);
const { connectToDatabase } = require(dbPath);

export default async function handler(req, res) {
  try {
    await connectToDatabase();

    const app = typeof expressApp === 'function' ? expressApp : (expressApp && expressApp.default) || expressApp;
    if (typeof app !== 'function') {
      throw new Error('Express app module failed to export a valid function handler.');
    }
    return app(req, res);
  } catch (err) {
    console.error('Vercel Serverless Function Error:', err.stack || err.message || err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Internal server error'
    });
  }
}
