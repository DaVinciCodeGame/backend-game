const { badRequest } = require('@hapi/boom');
const RoomsService = require('../services/rooms.service');

module.exports = class RoomsController {
  constructor() {
    this.roomsService = new RoomsService();
  }

  createRoom = async (req, res, next) => {
    try {
      const { roomName, maxMembers, password } = req.body;

      if (!roomName || !maxMembers) {
        throw badRequest();
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

  getRooms = async (req, res, next) => {
    try {
      const { page, searchType, search } = req.query;

      if (
        (page && Number.isNaN(Number(page))) ||
        !searchType !== !search ||
        (searchType && searchType !== 'number' && searchType !== 'name') ||
        (searchType === 'number' && Number.isNaN(Number(search))) ||
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
