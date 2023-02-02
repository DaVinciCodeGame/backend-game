const { Router } = require('express');
const RoomsController = require('../controllers/rooms.controller');
const authorize = require('../middlewares/authorize');

const roomsRouter = Router();

const roomsController = new RoomsController();

roomsRouter
  .post('/', roomsController.createRoom)
  .get('/', roomsController.getRooms)
  .get('/quick-start', roomsController.quickStart)
  .post('/:roomId');

module.exports = roomsRouter;
