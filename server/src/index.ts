import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { initializeRealtime } from './realtime';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import studentRouter from './routes/student';
import adminRouter from './routes/admin';
import accountantRouter from './routes/accountant';
import admin1Router from './routes/admin1';
import admin2Router from './routes/admin2';


// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Security Base: Helmet
app.use(helmet());

// Security Base: CORS configured via env ALLOWED_ORIGINS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or tunnel)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  })
);

// Security Base: Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use(limiter);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger: development mode only
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin1', admin1Router);
app.use('/api/admin2', admin2Router);
app.use('/api/accountant', accountantRouter);
app.use('/api', studentRouter); // exposes /api/bulletins

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

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
