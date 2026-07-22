// api/index.cjs
// Vercel Serverless Function Entrypoint (CommonJS) wrapping Express app
let app;
let bootError = null;

try {
  app = require('../server/app.cjs');
} catch (err) {
  console.error('BOOT CRASH:', err.stack || err.message || err);
  bootError = err;
}

module.exports = (req, res) => {
  if (bootError) {
    console.error('BOOT CRASH ON INVOCATION:', bootError.stack || bootError.message);
    return res.status(500).json({
      status: 'error',
      message: 'Serverless Boot Crash Error',
      error: bootError.message,
      stack: bootError.stack
    });
  }

  try {
    return app(req, res);
  } catch (err) {
    console.error('Vercel Request Handler Error:', err.stack || err.message);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Serverless Execution Error',
      error: err.message,
      stack: err.stack
    });
  }
};
