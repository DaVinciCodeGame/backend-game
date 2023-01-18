export default class User {
  userId: number;

  socketId: string;

  username: string;

  isReady: boolean;

  isAlive: boolean;

  hand: any[];

  constructor(userId: number, username: string, socketId: string) {
    this.userId = userId;
    this.username = username;
    this.socketId = socketId;
    this.isReady = false;
    this.isAlive = true;
    this.hand = [];
  }
}
