import {
  RedisClientType,
  RedisModules as M,
  RedisFunctions as F,
  RedisScripts as S,
} from 'redis';
import { Server } from 'socket.io';

const serverOption = {
  path: '/game/',
  cors: {
    origin: 'http://localhost:3000',
    method: ['GET', 'POST'],
  },
};

export default class SocketIO extends Server {
  redis: RedisClientType<M, F, S>;

  constructor(redis: RedisClientType<M, F, S>) {
    super(serverOption);

    this.redis = redis;
  }
}
