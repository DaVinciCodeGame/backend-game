const { badRequest } = require('@hapi/boom');
const RoomsService = require('../services/rooms.service');

module.exports = class RoomsController {
  constructor() {
    this.roomsService = new RoomsService();
  }

  createRoom = async (req, res, next) => {
    try {
      const { roomName, maxMembers, password } = req.body;

      if (!roomName) throw badRequest('요청에 본문에 방 이름이 없습니다.');

      if (!maxMembers) throw badRequest('요청에 본문에 최대 인원이 없습니다.');

      if (typeof maxMembers !== 'number')
        throw badRequest('최대 인원이 숫자 형식이 아닙니다.');

      if (password) {
        if (Number.isNaN(Number(password)))
          throw badRequest('비밀번호가 숫자 형식이 아닙니다.');

        if (password.length !== 4)
          throw badRequest('비밀번호가 네 자리가 아닙니다.');
      }

      const roomId = await this.roomsService.createRoom(
        roomName,
        maxMembers,
        password
      );

      res.status(201).json({ roomId });
    } catch (err) {
      next(err);
    }
  };

  checkRoom = async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { password } = req.body;

      console.log(`받은 password: ${password}`);

      if (Number.isNaN(Number(roomId))) throw badRequest('잘못된 요청입니다.');

      const result = await this.roomsService.checkRoom(roomId, password);

      console.log(`나가는 데이터: ${result}`);

      res.status(200).send(result);
    } catch (err) {
      next(err);
    }
  };

  getRooms = async (req, res, next) => {
    try {
      const { page, searchType, search } = req.query;

      if (
        (page && Number.isNaN(Number(page))) ||
        (searchType && searchType !== 'number' && searchType !== 'name') ||
        (searchType === 'number' && search && Number.isNaN(Number(search))) ||
        (searchType === 'name' && typeof search !== 'string')
      ) {
        throw badRequest();
      }

      const result = await this.roomsService.getRooms(page, searchType, search);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  quickStart = async (req, res, next) => {
    try {
      const roomId = await this.roomsService.quickStart();

      res.status(200).json(roomId);
    } catch (err) {
      next(err);
    }
  };
};
