const { Router } = require('express');
const roomsRouter = require('./rooms.route');

const router = Router();

router
  .get('/', (req, res) => {
    res.status(200).json('ok');
  })
  .use('/rooms', roomsRouter);

module.exports = router;
