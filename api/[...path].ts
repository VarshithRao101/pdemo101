import app from '../server/src/app';
import { connectDB } from '../server/src/config/db';

let dbReady: Promise<void> | null = null;

export default async function handler(req: any, res: any) {
  dbReady ??= connectDB().catch(error => {
    dbReady = null;
    throw error;
  });
  await dbReady;
  return app(req, res);
}
