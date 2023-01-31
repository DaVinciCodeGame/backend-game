const RoomsRepository = require('../repositories/rooms.repository');

module.exports = class RoomsService {
  constructor() {
    this.roomsRepository = new RoomsRepository();
  }
};
