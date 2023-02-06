const bcrypt = require('bcrypt');

const RoomsRepository = require('../repositories/rooms.repository');
const RoomCheckResult = require('../utils/room-check-result');

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
    const randomGeneratedNumber = Math.floor(Math.random() * 99999 + 1);

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
   * @param {boolean} isWaiting
   * @param {boolean} isPublic
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
  getRooms = async (page, searchType, search, isWaiting, isPublic) => {
    let findResult;

    if (searchType && search) {
      if (searchType === 'number') {
        findResult =
          await this.roomsRepository.findAndCountPagedListFilteredById(
            page ?? 1,
            ROOMS_PER_PAGE,
            search,
            isWaiting,
            isPublic
          );
      } else {
        findResult =
          await this.roomsRepository.findAndCountPagedListFilteredByName(
            page ?? 1,
            ROOMS_PER_PAGE,
            search,
            isWaiting,
            isPublic
          );
      }
    } else {
      findResult = await this.roomsRepository.findAndCountPagedList(
        page ?? 1,
        ROOMS_PER_PAGE,
        isWaiting,
        isPublic
      );
    }
    const { count, rows } = findResult;

    const rooms = rows.map(
      ({ maxMembers, isPlaying, roomId, roomName, password, Table: table }) => {
        const currentMembers = table ? JSON.parse(table.users).length : 0;
        const isPrivate = Boolean(password);

        return {
          currentMembers,
          maxMembers,
          isPlaying,
          roomId,
          roomName,
          isPrivate,
        };
      }
    );

    const totalPage = Math.ceil(count / ROOMS_PER_PAGE);

    return { totalPage, rooms };
  };

  /**
   *
   * @param {number} roomId
   * @param {string} password
   * @returns {Promise<RoomCheckResult>}
   */
  checkRoom = async (roomId, password) => {
    const room = await this.roomsRepository.findOneById(roomId);

    if (!room) return new RoomCheckResult(101, '해당하는 방이 없습니다.');

    const currentMembers = room.Table ? JSON.parse(room.Table.users).length : 0;

    if (currentMembers >= room.maxMembers)
      return new RoomCheckResult(102, '방이 가득 찼습니다.');

    if (room.isPlaying)
      return new RoomCheckResult(103, '해당 방은 현재 게임이 진행 중입니다.');

    if (room.password && !(await bcrypt.compare(password, room.password)))
      return new RoomCheckResult(104, '비밀번호가 틀렸습니다.');

    return new RoomCheckResult(1);
  };

  /**
   *
   * @returns {Promise<number>}
   */
  quickStart = async () => {
    const roomsForQuickStart =
      await this.roomsRepository.findAllForQuickStart();

    const notFullRooms = roomsForQuickStart.filter(
      ({ maxMembers, Table: table }) => {
        const currentMembers = table ? JSON.parse(table.users).length : 0;

        return maxMembers > currentMembers;
      }
    );

    if (notFullRooms.length === 0) {
      const roomId = await this.getUnoccupiedRoomId();

      const newRoom = await this.roomsRepository.create(
        roomId,
        '초보자 환영! 같이 배우면서 즐겨요.',
        4
      );
      return newRoom.roomId;
    }

    const randomIndex = Math.floor(Math.random() * notFullRooms.length);

    return notFullRooms[randomIndex].roomId;
  };
};
