const { Router } = require('express');
const RoomsController = require('../controllers/rooms.controller');
const authorize = require('../middlewares/authorize');

const roomsRouter = Router();

const roomsController = new RoomsController();

roomsRouter
  .post('/', authorize, roomsController.createRoom)
  .get('/', roomsController.getRooms)
  .get('/quick-start', authorize, roomsController.quickStart);

module.exports = roomsRouter;
