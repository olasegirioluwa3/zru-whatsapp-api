// errorLogger.js

const fs = require('fs');
const path = require('path');

const logError = (error) => {
  const logPath = path.join(__dirname, 'error.log');
  const errorMessage = `${new Date().toISOString()}: ${error.stack}\n`;

  fs.appendFile(logPath, errorMessage, (err) => {
    if (err) {
      console.error('Error logging:', err);
    }
  });
};

const errorLoggerMiddleware = (error, req, res, next) => {
  console.error('Internal Server Error:', error);
  logError(error);
  res.status(500).send('Internal Server Error');
};

module.exports = errorLoggerMiddleware;
