const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
  },

  sids: {
    type: Number,
    required: true,
  },

  username: {
    type: Number,
    required: true,
  },

  isReady: {
    type: Boolean,
    required: true,
  },

  isAlive: {
    type: Boolean,
    required: true,
  },

  hand: [{ color: String, value: Number, isOpen: String }],
});

module.exports = mongoose.model('user', userSchema);
