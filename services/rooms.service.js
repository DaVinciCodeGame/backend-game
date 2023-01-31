const bcrypt = require('bcrypt');

const RoomsRepository = require('../repositories/rooms.repository');

module.exports = class RoomsService {
  constructor() {
    this.roomsRepository = new RoomsRepository();
  }

  /**
   *
   * @param {string} roomName
   * @param {number} maxMembers
   * @param {string} password
   * @returns {Promise<Room>}
   */
  createRoom = async (roomName, maxMembers, password) => {
    const roomId = await this.getUnoccupiedRoomId();

    if (password) {
      const hashed = await bcrypt.hash(
        password,
        Number(process.env.ROOM_PASSWORD_SALT)
      );
      const newRoom = await this.roomsRepository.create(
        roomId,
        roomName,
        maxMembers,
        hashed
      );

      return newRoom.roomId;
    } else {
      const newRoom = await this.roomsRepository.create(
        roomId,
        roomName,
        maxMembers
      );

      return newRoom.roomId;
    }
  };

  /**
   *
   * @returns {Promise<number>}
   */
  getUnoccupiedRoomId = async () => {
    const randomGeneratedNumber = Math.floor(Math.random() * 100000 + 1);

    const existRoom = await this.roomsRepository.findOneById(
      randomGeneratedNumber
    );

    if (existRoom) {
      return this.getUnoccupiedRoomId();
    }

    return randomGeneratedNumber;
  };
};
