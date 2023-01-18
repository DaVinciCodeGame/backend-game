import Redis from 'ioredis';

import env from './env';
import logger from './logger';

const redis = new Redis(env.REDIS_URL, { commandTimeout: 10000 });

redis.on('error', (err) => {
  logger.error(err);
});

export default redis;
