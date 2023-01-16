import Redis from 'ioredis';

import env from './env';
import logger from './logger';

const redis = new Redis(env.REDIS_URL);

redis.on('error', (err) => {
  logger.error(err);
});

export default redis;
