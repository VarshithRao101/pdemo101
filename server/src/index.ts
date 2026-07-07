import { createServer } from 'http';
import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/db';
import { initializeRealtime } from './realtime';

// Load environment variables
dotenv.config();

const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to DB and Start Listening
const bootstrap = async () => {
  try {
    await connectDB();
    initializeRealtime(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`[Server] Booted successfully. Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Bootstrapping failed:', error);
    process.exit(1);
  }
};

bootstrap();
