import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    const dbName = db ? db.databaseName : 'unknown';
    
    let collectionsCount = 0;
    if (db) {
      const collections = await db.listCollections().toArray();
      collectionsCount = collections.length;
    }

    res.status(200).json({
      status: 'ok',
      database: dbName,
      collections: collectionsCount,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error during health check',
    });
  }
});

export default router;
