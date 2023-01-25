const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const { log } = require("console");
const { type } = require("os");
const connect = require("./schemas");
const { mongoose } = require("mongoose");
//-connect();

dotenv.config();
app.use(cors());
mongoose.set("strictQuery", false);

const server = http.createServer(app);

//DB settings
mongoose.connect(process.env.DAVINCICODEDB);
var DB = mongoose.connection;

DB.once("open", function () {
  console.log("DB connected");
});

DB.on("error", function (err) {
  console.log("DB ERROR: ", err);
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    method: ["GET", "POST"],
  },
});

let userCount = 0;
let readyCount = 0;

// let DB = [
//   {
//     roomId: 0,
//     turn: 0,
//     table: {
//       blackCards: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
//       whiteCards: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
//       users: [], //[{userId:1}, {userId:4}, {userId:3}, {userId:2}]
//     },

//     users: [
//       {
//         userId: 0,
//         sids: 0,
//         username: 0,
//         isReady: false,
//         isAlive: true,
//         hand: [], // [ {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true}, {color: black, value: 3 , isOpen: true} ]
//       },
//     ],
//   },
// ];

io.on("connection", async (socket) => {
  console.log("connect", socket.id);
  socket.onAny(async (e) => {
    console.log(`SocketEvent:${e}`);
  });

  
});

server.listen(3001, () => {
  console.log("Server is Listening");
});
