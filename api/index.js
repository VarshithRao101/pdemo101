// api/index.js
// Vercel Serverless Function entrypoint wrapping Express app
const app = require('../server/app.cjs');

module.exports = (req, res) => {
  try {
    return app(req, res);
  } catch (err) {
    console.error('Vercel Function Handler Error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Serverless Execution Error',
      error: err.message
    });
  }
};
