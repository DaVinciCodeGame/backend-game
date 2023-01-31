const { Room } = require('../models');

module.exports = class RoomsRepository {
  /**
   *
   * @param {number} roomId
   * @param {string} roomName
   * @param {number} maxMembers
   * @param {string | undefined} password
   * @returns {Promise<Room>}
   */
  create = (roomId, roomName, maxMembers, password) => {
    const room = Room.create({
      roomId,
      roomName,
      maxMembers,
      password,
    });

    return room;
  };

  /**
   *
   * @param {number} roomId
   * @returns {Promise<Room>}
   */
  findOneById = (roomId) => {
    return Room.findOne({
      where: { roomId },
    });
  };

  /**
   *
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{
   *  totalPage: number,
   *  rooms: {
   *    roomId: number,
   *    roomName: string,
   *    maxMembers: number,
   *    isPlaying: boolean,
   *    createdAt: Date,
   *    password: string
   *  } }>}
   */
  findAndCountPagedList = (page, limit) => {
    const offset = (page - 1) * limit;

    return Room.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  };
};
