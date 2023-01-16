import { Server } from 'socket.io';

const serverOption = {
  path: '/game/',
  cors: {
    origin: 'http://localhost:3000',
    method: ['GET', 'POST'],
  },
};

export default class SocketIO extends Server {
  constructor() {
    super(serverOption);
  }
}
