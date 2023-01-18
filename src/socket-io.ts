import { Server, Socket } from 'socket.io';
import Joi, { ValidationError } from 'joi';
import events from './utils/event-names';
import logger from './config/logger';
import redis from './config/redis';
import User from './utils/user';

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

const io = new Server(serverOption);

io.on(events.CONNECT, async (socket: Socket) => {
  try {
    // HACK: 게임 로직 완성 후 쿠키로 유저 정보 받아오게 바꿔야 함
    const me = await userDataSchema.validateAsync(socket.handshake.query);

    // NOTE: 디버깅용
    socket.onAny((event, ...args) => {
      logger.debug({ type: 'input', event, args });
    });
    socket.onAnyOutgoing((event, ...args) => {
      logger.debug({ type: 'output', event, args });
    });

    const existUser = await redis.hgetall(`users:${me.userId}`);

    if (!existUser) {
      await redis.hmset(`users:${me.userId}`, {
        userId: me.userId,
        username: me.username,
        socketId: socket.id,
      });
    } else {
      io.to(existUser.socketId).disconnectSockets();
      await redis.hset(`users:${me.userId}`, { socketId: socket.id });
    }

    io.to(socket.id).emit(events.READY_TO_JOIN);

    socket.on(events.JOIN, async ({ roomId }: { roomId: number }) => {
      const isPlaying = await redis.get(`rooms:${roomId}:is-playing`);
      if (isPlaying) {
        const existUsers = await redis.hgetall(`rooms:${roomId}:users`);

        if (
          JSON.parse(existUsers[0]).userId === me.userId ||
          JSON.parse(existUsers[1]).userId === me.userId ||
          JSON.parse(existUsers[2]).userId === me.userId ||
          JSON.parse(existUsers[3]).userId === me.userId
        ) {
          // 게임이 진행 중이고 목록에 유저가 있을 때
          socket.join(roomId.toString());

          const users = await redis.hgetall(`rooms:${roomId}:users`);

          io.to(socket.id).emit(events.YOU_JOINED, { users });
          socket.to(roomId.toString()).emit(events.NEW_USER_JOINED, { users });
        }
        // TODO: 게임이 진행 중이지만 목록에 유저가 없을 때
        else {
          io.to(socket.id).emit(events.ERROR, { code: 0, message: '' });
        }
      } else {
        const numberOfExistUsers = await redis.hlen(`rooms:${roomId}:users`);

        if (numberOfExistUsers > 3) {
          // TODO: 다 찼을 때
          io.to(socket.id).emit(events.ERROR, { code: 0, message: '' });
        } else {
          const existUsers = await redis.hgetall(`rooms:${roomId}:users`);

          const pipeline = redis
            .pipeline()
            .hset(`users:${me.userId}`, { roomId });

          if (!existUsers[0])
            await pipeline
              .hset(`rooms:${roomId}:users`, {
                0: JSON.stringify(new User(me.userId, me.username, socket.id)),
              })
              .exec();
          else if (!existUsers[1])
            await pipeline
              .hset(`rooms:${roomId}:users`, {
                1: JSON.stringify(new User(me.userId, me.username, socket.id)),
              })
              .exec();
          else if (!existUsers[2])
            await pipeline
              .hset(`rooms:${roomId}:users`, {
                2: JSON.stringify(new User(me.userId, me.username, socket.id)),
              })
              .exec();
          else if (!existUsers[3])
            await pipeline
              .hset(`rooms:${roomId}:users`, {
                3: JSON.stringify(new User(me.userId, me.username, socket.id)),
              })
              .exec();

          await socket.join(roomId.toString());

          const users = await redis.hgetall(`rooms:${roomId}:users`);

          io.to(socket.id).emit(events.YOU_JOINED, { users });
          socket.to(roomId.toString()).emit(events.NEW_USER_JOINED, { users });
        }
      }
    });

    socket.on(events.RTC_OFFER, ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit(events.RTC_DELIVER_OFFER, {
        sdp,
        callerSocketId: socket.id,
      });
    });

    socket.on(events.RTC_ANSWER, ({ targetSocketId, sdp }) => {
      io.to(targetSocketId).emit(events.RTC_DELIVER_ANSWER, {
        sdp,
        callerSocketId: socket.id,
      });
    });

    socket.on(events.DISCONNECT, async () => {
      const pipeline = redis.pipeline().hdel(`users:${me.userId}`);

      const roomId = await redis.hget(`users:${me.userId}`, 'roomId');
      if (roomId) {
        const usersInRoom = await redis.hgetall(`rooms:${roomId}:users`);

        if (JSON.parse(usersInRoom[0]).userId === me.userId)
          await pipeline.hdel(`rooms:${roomId}:users`, '0').exec();
        else if (JSON.parse(usersInRoom[1]).userId === me.userId)
          await pipeline.hdel(`rooms:${roomId}:users`, '1').exec();
        else if (JSON.parse(usersInRoom[2]).userId === me.userId)
          await pipeline.hdel(`rooms:${roomId}:users`, '2').exec();
        else if (JSON.parse(usersInRoom[3]).userId === me.userId)
          await pipeline.hdel(`rooms:${roomId}:users`, '3').exec();

        socket
          .to(roomId.toString())
          .emit(events.DISCONNECT, { disconnectedSocketId: socket.id });
      }

      logger.debug(`${socket.id} 연결 해제`);
    });
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err.stack);
      if (err instanceof ValidationError) {
        io.to(socket.id).emit(events.ERROR, {
          code: 0,
          message: err.message,
        });
        socket.disconnect(true);
      } else {
        io.to(socket.id).emit(events.ERROR, {
          code: 1,
          message: '알 수 없는 에러',
        });
      }
    }
  }
});

export default io;
