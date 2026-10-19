
const { createClient } = require('redis');

const redisClient = createClient({
  socket: {
    host: '127.0.0.1',
    port: 6379,
    reconnectStrategy: retries => {
      if (retries > 10) {
        return new Error('Redis reconnect limit reached');
      }

      return Math.min(retries * 250, 3000);
    }
  }
});

redisClient.on('error', err => {
  console.error('Redis client error:', err.message);
});

redisClient.on('ready', () => {
  console.log('Redis client is ready');
});

module.exports = redisClient;
