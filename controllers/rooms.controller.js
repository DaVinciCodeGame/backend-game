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
    } catch (err) {
      next(err);
    }
  };

  quickStart = async (req, res, next) => {
    try {
    } catch (err) {
      next(err);
    }
  };
};
