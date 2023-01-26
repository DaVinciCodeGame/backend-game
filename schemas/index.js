const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./users");
const Room = require("./rooms");

const app = express();
dotenv.config();

mongoose.set("strictQuery", false);

//DB settings
mongoose.connect(process.env.DAVINCICODEDB);
var DB = mongoose.connection;

DB.once("open", function () {
  console.log("DB connected");
});

DB.on("error", function (err) {
  console.log("DB ERROR: ", err);
});

// const me = new User({
//   userId: 2,

//   sids: "sids-connect-test",

//   username: "haha",

//   isReady: false,

//   isAlive: true,

//   hand: [],
// });

const testroom = new Room({
  roomId: 3,

  turn: 2,

  table: {
    blackCards: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    whiteCards: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    users: [3, 2, 1, 4],
  },

  users: [
    {
      userId: 0,
      sids: 0,
      username: 0,
      isReady: false,
      isAlive: true,
      hand: [], // [ {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true} ]
    },
    {
      userId: 1,
      sids: 0,
      username: 0,
      isReady: false,
      isAlive: true,
      hand: [], // [ {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true} ]
    },
    {
      userId: 2,
      sids: 0,
      username: 0,
      isReady: false,
      isAlive: true,
      hand: [], // [ {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true} ]
    },
    {
      userId: 3,
      sids: 0,
      username: 0,
      isReady: false,
      isAlive: true,
      hand: [], // [ {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true} ]
    },
  ],
});

testroom
  .save()
  .then(() => {
    console.log(testroom);
  })
  .catch((err) => {
    console.log("Error : " + err);
  });

// me.save()
//   .then(() => {
//     console.log(me);
//   })
//   .catch((err) => {
//     console.log("Error : " + err);
//   });

app.listen(3000, function () {
  console.log("server on! https://localhost:3000");
});
