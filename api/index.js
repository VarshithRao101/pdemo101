// api/index.js
// Vercel Serverless Function Handler wrapping Express app with cached Mongo connection
const expressApp = require('../server/app.cjs');
const { connectToDatabase } = require('../server/db.cjs');

module.exports = async function handler(req, res) {
  try {
    // Ensure MongoDB connection is attempted / reused before processing API request
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.warn('MongoDB connection fallback notice:', dbErr.message);
    }
    
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
};
