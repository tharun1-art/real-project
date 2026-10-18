
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10kb' }));

// Demonstration rates only — INR required for one unit of each currency.
// Replace with a live provider before using real financial data.
const rates = {
  USD: 83.0,
  EUR: 90.0,
  GBP: 105.0,
  AUD: 55.0,
  CAD: 61.0
};

// Health-check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'currency-exchange-api'
  });
});

// List supported currencies and demonstration rates
app.get('/api/rates', (req, res) => {
  res.json({
    base: 'INR',
    source: 'demonstration',
    rates,
    disclaimer: 'Not live exchange rates'
  });
});

// Convert INR into a supported currency
app.post('/api/convert', (req, res) => {
  const { amount, currency } = req.body ?? {};

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      error: 'amount must be a positive number'
    });
  }

  if (
    typeof currency !== 'string' ||
    !Object.hasOwn(rates, currency)
  ) {
    return res.status(400).json({
      error: 'Unsupported currency',
      supportedCurrencies: Object.keys(rates)
    });
  }

  const convertedAmount = amount / rates[currency];

  return res.json({
    from: 'INR',
    to: currency,
    amount,
    rate: rates[currency],
    convertedAmount: Number(convertedAmount.toFixed(4)),
    source: 'demonstration'
  });
});

// Handle malformed JSON requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      error: 'Invalid JSON request body'
    });
  }

  console.error(err);
  return res.status(500).json({
    error: 'Internal server error'
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Currency Exchange API listening on port ${PORT}`
  );
});
