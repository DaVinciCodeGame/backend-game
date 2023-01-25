const mongoose = require("mongoose");

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
});

module.exports = mongoose.model("room", roomSchema);
