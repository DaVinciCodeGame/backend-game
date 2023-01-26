const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: Number,
    required: true,
  },

  turn: {
    type: Number,
    required: true,
  },

  table: {
    blackCards: [Number],
    whiteCards: [Number],
    users: [Number],
  },

  users: [
    {
      userId: Number,
      sids: Number,
      username: String,
      isReady: Boolean,
      isAlive: Boolean,
      hand: [{ color: String, value: Number, isOpen: Boolean }],
    },
  ],
});

module.exports = mongoose.model('room', roomSchema);
