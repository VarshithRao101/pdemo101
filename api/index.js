// api/index.js
// Vercel Serverless Function Handler wrapping Express app
import expressApp from '../server/app.cjs';

export default function handler(req, res) {
  try {
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
