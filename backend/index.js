
const express = require('express');

const app = express();
const PORT = 3000;

// Health-check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'currency-exchange-api',
    message: 'API is running successfully'
  });
});

// Start the server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Currency Exchange API listening on port ${PORT}`);
});
