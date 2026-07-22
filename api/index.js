// api/index.js
// Vercel Serverless Function entrypoint wrapping Express app
const app = require('../server/app.cjs');

module.exports = (req, res) => {
  return app(req, res);
};
