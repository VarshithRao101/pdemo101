// api/index.js
// Vercel Serverless Function Handler (ESM) wrapping Express app
import app from '../server/app.cjs';

export default function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Vercel Serverless Function Error:', err.stack || err.message || err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
