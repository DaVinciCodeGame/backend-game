import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import Joi, { ValidationError } from 'joi';
import events from './utils/event-names';
import logger from './config/logger';

const serverOption = {
  path: '/game/',
  cors: {
    origin: 'http://localhost:3000',
    method: ['GET', 'POST'],
  },
};

const userDataSchema = Joi.object<{ userId: number; username: string }>()
  .keys({
    userId: Joi.number().required().description('유저 식별자'),
    username: Joi.string().required().description('유저 이름'),
  })
  .unknown();

export default class SocketIO extends Server {
  redis: Redis;

  constructor(redis: Redis) {
    super(serverOption);

    this.redis = redis;

    this.setListeners();
  }

  private setListeners() {
    this.on(events.CONNECT, async (socket: Socket) => {
      try {
        // HACK: 게임 로직 완성 후 쿠키로 유저 정보 받아오게 바꿔야 함
        const { userId, username } = await userDataSchema.validateAsync(
          socket.handshake.query
        );

        // NOTE: 디버깅용
        socket.onAny((event, ...args) => {
          logger.debug(`들어온 이벤트: ${event}`);
          logger.debug(`  ${args}`);
        });
        socket.onAnyOutgoing((event, ...args) => {
          logger.debug(`나가는 이벤트: ${event}`);
          logger.debug(`  ${args}`);
        });

        await this.redis.hset(`users/${userId}`, {
          userId,
          username,
          socketId: socket.id,
        });

        const user = await this.redis.hgetall(`users/${userId}`);

        logger.debug(user);

        socket.on(events.DISCONNECT, async () => {
          logger.debug(`${socket.id} 연결 해제`);
        });
      } catch (err) {
        if (err instanceof ValidationError) {
          this.to(socket.id).emit(events.ERROR, [0, err.message]);
          socket.disconnect(true);
        }
      }
    });
  }
}
