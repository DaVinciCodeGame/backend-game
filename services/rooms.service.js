const bcrypt = require('bcrypt');

const RoomsRepository = require('../repositories/rooms.repository');

const ROOMS_PER_PAGE = 12;

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

  /**
   * 
   * @param {number} page 
   * @param {'number' | 'name'} searchType 
   * @param {string} search 
   * @returns {Promise<{ totalPage: number, rooms: {
          currentMembers: number,
          maxMembers: number,
          isPlaying: boolean,
          roomId: number,
          roomName: string,
          isPrivate: boolean,
        }
      }>}
   */
  getRooms = async (page, searchType, search) => {
    let findResult;

    if (searchType && search) {
      // if (searchType === 'number') {
      //   const roomId = Number(search);
      // }
      findResult = await this.roomsRepository.findAndCountPagedList(
        page,
        ROOMS_PER_PAGE
      );
    } else {
      findResult = await this.roomsRepository.findAndCountPagedList(
        page,
        ROOMS_PER_PAGE
      );
    }
    const { count, rows } = findResult;

    const rooms = rows.map(
      ({ maxMembers, isPlaying, roomId, roomName, password }) => {
        return {
          currentMembers: 0,
          maxMembers,
          isPlaying,
          roomId,
          roomName,
          isPrivate: Boolean(password),
        };
      }
    );

    const totalPage = Math.ceil(count / ROOMS_PER_PAGE);

    return { totalPage, rooms };
  };
};
