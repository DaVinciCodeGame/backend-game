import { createClient } from 'redis';
import env from './env';
import logger from './logger';

const client = createClient({ url: env.REDIS_URL });

client.on('error', (err) => {
  logger.error(err);
});

export default client;
