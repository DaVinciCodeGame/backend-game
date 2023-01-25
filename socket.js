const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { log } = require('console');
const { type } = require('os');
const connect = require('./schemas');
const { mongoose } = require('mongoose');
//-connect();

dotenv.config();
app.use(cors());
mongoose.set('strictQuery', false);

const server = http.createServer(app);

//DB settings
mongoose.connect(process.env.MONGO_URL);
var DB = mongoose.connection;

DB.once('open', function () {
  console.log('DB connected');
});

DB.on('error', function (err) {
  console.log('DB ERROR: ', err);
});

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    method: ['GET', 'POST'],
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

io.on('connection', async (socket) => {
  console.log('connect', socket.id);
  socket.onAny(async (e) => {
    console.log(`SocketEvent:${e}`);
  });

  socket.on('send-message', (msg, room, nickName, addMyMessage) => {
    console.log(msg);
    console.log(room);
    // 소켓 아이디에 맞는 닉네임을 뽑아서 msg와 같이 전송

    socket.to(room).emit('receive-message', nickName, msg);
    addMyMessage(nickName, msg);
  });

  socket.on('connect', (userId) => {
    //DB room 돌면서 userId 있는지 확인하고 삭제
  });

  socket.on('join', (roomId) => {
    // TODO:
    // game-info 필요
    // roomId에 따른 방 제목 -> 게임 시작시 상단 바 정보(비공개, 인원, 방제목)
    console.log(roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;
  });

  socket.on('ready', async ({ userID, roomID }) => {
    // FIXME: 변수 -> redis.lenth로 변경 필요
    const userInfo = await client.hGetAll(
      `rooms:${roomID}:users:${socket.userID}`
    );

    console.log('userID:', userID, typeof userID);
    console.log('roomID:', roomID, typeof roomID);

    await client.hSet(`rooms:${roomID}:users:${socket.userID}`, {
      isReady: userInfo.isReady === 'false' ? 'true' : 'false',
    });

    if (userInfo.isReady === 'false') {
      //{userId:userId}
      // `userId`
      const some = userID;
      await client.hSet(`rooms:${roomID}`, { [userID]: some });
      const test2 = await client.hGetAll(`rooms:${roomID}`);
      console.log('추가', test2);

      let userLength = await client.hLen(`rooms:${roomID}`);
      userLength = 2;

      if (userLength == 2) {
        console.log('test');
        // 유저 별로 socket.Id 찾아서 뿌려주기.
        io.to(socket.id).emit('game-start');
      }
    } else {
      await client.hDel(`rooms:${roomID}`, `${userID}`);

      const test2 = await client.hGetAll(`rooms:${roomID}`);
      console.log('삭제', test2);
    }

    // TODO: ADD_READY :: 방에 설정된 인원값이 모두 ready 했을 때 정보 보내기 + GAME_START 이벤트
  });

  socket.on('first-draw', async (userId, black, roomId, myCard) => {
    // fn (본인 카드 & 잔여 카드 )
    // socket.to(roomId).emit("all-users-cards", [사람들 카드 + 잔여 카드])
    const white = 3 - black;

    let getCards = [];
    let roomIndex = 0;
    let uesrIndex = 0;

    for (let j = 0; j < DB.length; j++) {
      if (DB[j].roomId === roomId) {
        roomIndex = j;
        break;
      }
    }

    // black 뽑기
    for (let i = 0; i < black; i++) {
      let cardLength = DB[roomIndex].table.blackCards.length;
      let CardIndex = Math.floor(Math.random() * Number(cardLength));
      let randomCard = DB[roomIndex].table.blackCards[CardIndex];
      getCards = [
        ...getCards,
        { color: 'black', value: Number(randomCard), isOpen: false },
      ];
      DB[roomIndex].table.blackCards.splice(CardIndex, 1);
    }

    // white 뽑기
    for (let i = 0; i < white; i++) {
      let cardLength = DB[roomIndex].table.whiteCards.length;
      let CardIndex = Math.floor(Math.random() * Number(cardLength));
      let randomCard = DB[roomIndex].table.whiteCards[CardIndex];
      getCards = [
        ...getCards,
        { color: 'white', value: Number(randomCard), isOpen: false },
      ];
      DB[roomIndex].table.whiteCards.splice(CardIndex, 1);
    }

    getCards
      .sort((a, b) => a.value - b.value)
      .sort((a, b) => {
        if (a.value === b.value) {
          if (a.color < b.color) return -1;
          else if (b.color < a.color) return 1;
          else return 0;
        }
      });

    for (let i = 0; i < 4; i++) {
      if (DB[roomIndex].users[i].userId === userId) {
        uesrIndex = i;
        break;
      }
    }
    DB[roomIndex].users[uesrIndex].hand = getCards;
    myCard(getCards);

    // FIXME 나머지 사람들의 카드 보내주기
    // forEach_myCard(data);
    // io.to.(개인의 socket.Id).emit("draw-result", gameInfo)
    let sendAllData = {};
  });

  socket.on('color-selected', (userId, color) => {
    if (color === 'black') {
    } else {
    }

    // io.to.(개인의 socket.Id).emit("selected-result", gameInfo)
  });

  socket.on('select-card-as-security', (userId, color, value) => {
    socket.data.security = { color: color, value: value };
    io.to(socket.Id).emit('select-target');
  });
});

server.listen(3001, () => {
  console.log('Server is Listening');
});
