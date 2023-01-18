import env from './config/env';
import logger from './config/logger';
import redis from './config/redis';
import io from './socket-io';

redis.connect(() => {
  logger.info('Redis 연결 완료');

  io.listen(Number(env.PORT));
});
