
const express = require('express');
const pool = require('./db');
const redisClient = require('./redis');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CACHE_KEY = 'currency:rates:INR';
const CACHE_TTL_SECONDS = 60;

app.use(express.json({ limit: '10kb' }));

// Connect to Redis. The API can still start if Redis is unavailable.
async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error('Redis connection unavailable:', err.message);
  }
}

// Health check: verifies that the API process is running.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'currency-exchange-api'
  });
});

// Return active INR exchange rates, using Redis as a cache.
app.get('/api/rates', async (req, res, next) => {
  try {
    if (redisClient.isReady) {
      try {
        const cachedRates = await redisClient.get(CACHE_KEY);

        if (cachedRates !== null) {
          return res.json({
            ...JSON.parse(cachedRates),
            cache: 'HIT'
          });
        }
      } catch (err) {
        console.error('Redis cache read failed:', err.message);
      }
    }

    // Cache miss or Redis unavailable: read from MySQL.
    const [rows] = await pool.execute(
      `SELECT er.target_currency, er.rate, er.source, er.updated_at
       FROM exchange_rates AS er
       INNER JOIN currencies AS c
         ON c.code = er.target_currency
       WHERE er.base_currency = ?
         AND c.is_active = TRUE
       ORDER BY er.target_currency`,
      ['INR']
    );

    const rates = Object.fromEntries(
      rows.map(row => [
        row.target_currency,
        Number(row.rate)
      ])
    );

    const sources = [...new Set(rows.map(row => row.source))];

    const response = {
      base: 'INR',
      source: sources.length === 1 ? sources[0] : sources,
      rates,
      updatedAt: rows.length ? rows[0].updated_at : null,
      disclaimer: 'Rates are illustrative, not live exchange rates'
    };

    // Cache writes are best-effort. MySQL remains the source of truth.
    if (redisClient.isReady) {
      try {
        await redisClient.set(CACHE_KEY, JSON.stringify(response), {
          EX: CACHE_TTL_SECONDS
        });
      } catch (err) {
        console.error('Redis cache write failed:', err.message);
      }
    }

    return res.json({
      ...response,
      cache: 'MISS'
    });
  } catch (err) {
    return next(err);
  }
});

// Convert INR into an active target currency using MySQL.
app.post('/api/convert', async (req, res, next) => {
  try {
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

    if (typeof currency !== 'string') {
      return res.status(400).json({
        error: 'currency must be a supported currency code'
      });
    }

    const [rows] = await pool.execute(
      `SELECT er.rate, er.source
       FROM exchange_rates AS er
       INNER JOIN currencies AS c
         ON c.code = er.target_currency
       WHERE er.base_currency = ?
         AND er.target_currency = ?
         AND c.is_active = TRUE`,
      ['INR', currency]
    );

    if (rows.length === 0) {
      const [supportedRows] = await pool.execute(
        `SELECT DISTINCT er.target_currency
         FROM exchange_rates AS er
         INNER JOIN currencies AS c
           ON c.code = er.target_currency
         WHERE er.base_currency = ?
           AND c.is_active = TRUE
         ORDER BY er.target_currency`,
        ['INR']
      );

      return res.status(400).json({
        error: 'Unsupported currency',
        supportedCurrencies: supportedRows.map(
          row => row.target_currency
        )
      });
    }

    const rate = Number(rows[0].rate);
    const convertedAmount = amount / rate;

    return res.json({
      from: 'INR',
      to: currency,
      amount,
      rate,
      convertedAmount: Number(convertedAmount.toFixed(4)),
      source: rows[0].source,
      disclaimer: 'Illustrative rate, not a live exchange rate'
    });
  } catch (err) {
    return next(err);
  }
});

// Handle malformed JSON and unexpected errors.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      error: 'Invalid JSON request body'
    });
  }

  console.error('API request failed:', err.code || err.name);

  return res.status(500).json({
    error: 'Internal server error'
  });
});

async function startServer() {
  await connectRedis();

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Currency Exchange API listening on port ${PORT}`);
  });
}

startServer();
