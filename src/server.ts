import env from './config/env';
import logger from './config/logger';
import redis from './config/redis';
import SocketIO from './socket-io';

redis.connect().then(() => {
  logger.info('Redis 연결 완료');
  const socketIO = new SocketIO();

  socketIO.listen(Number(env.PORT));
});
