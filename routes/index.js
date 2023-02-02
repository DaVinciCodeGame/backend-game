const { Router } = require('express');
const roomsRouter = require('./rooms.route');
const authorize = require('../middlewares/authorize');

const router = Router();

router
  .get('/', (req, res) => {
    res.status(200).json('ok');
  })
  .use('/rooms', authorize, roomsRouter);

module.exports = router;
