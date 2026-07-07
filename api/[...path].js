import appModule from '../server/dist/app.js';
import dbModule from '../server/dist/config/db.js';

const app = appModule.default ?? appModule;
const connectDB = dbModule.connectDB ?? dbModule.default?.connectDB;

let dbReady = null;

export default async function handler(req, res) {
  dbReady ??= connectDB().catch(error => {
    dbReady = null;
    throw error;
  });
  await dbReady;
  return app(req, res);
}
