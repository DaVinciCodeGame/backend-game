const RoomsService = require('../services/rooms.service');

module.exports = class RoomsController {
  constructor() {
    this.roomsService = new RoomsService();
  }
};
