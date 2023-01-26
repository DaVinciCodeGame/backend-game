const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv');
const { User, Room, Table } = require('./models');

// const { log } = require('console');
// const { type } = require('os');
// const User = require('./schemas/users');
// const Room = require('./schemas/rooms');
// const { mongoose } = require('mongoose');
// mongoose.set('strictQuery', false);

//dotenv.config();
app.use(cors());

app.get('/', (req, res) => {
  res.send('OK');
});

const server = http.createServer(app);

// db 연결
const DB = require('./models');

// db 연결 확인
DB.sequelize
  .sync()
  .then(() => {
    console.log('database 연결 성공');
  })
  .catch(console.error);

// sequelize model sync(), 테이블 수정 적용 여부
// https://medium.com/@smallbee/how-to-use-sequelize-sync-without-difficulties-4645a8d96841
DB.sequelize.sync({
  force: false, // default가 false, force: true -> 테이블을 생성하고 이미 존재하는 경우 먼저 삭제합니다. (공식문서 참고: https://sequelize.org/docs/v6/core-concepts/model-basics/#model-synchronization)
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

  socket.on('test-line', async (userId) => {
    await Room.create({
      roomId: 0,
      turn: 3,
    });

    await Table.create({
      roomId: 0,
      blackCard: '[0,1,2,3,4,5,6,7,8,9,10,11,12]',
      whiteCard: '[0,1,2,3,4,5,6,7,8,9,10,11,12]',
      users: '[{userId:0},{userId:1},{userId:2},{userId:3},]',
    });

    await User.create({
      roomId: 0,
      userId: 7,
      userName: 'test',
      isReady: false,
      isAlive: true,
      hand: '[{color:black, value:5, isOpen:ture},{color:white, value:3, isOpen:false}]',
    });
  });

  socket.on('sql-read', async () => {
    const roomtest = await Room.findOne({
      where: { roomId: 0 },
      attributes: ['roomId', 'turn'],
      raw: true,
    });
    const tabeltest = await Table.findOne({
      where: { roomId: 0 },
      attributes: ['roomId', 'blackCard', 'whiteCard', 'users'],
      raw: true,
    });

    const usertest = await User.findOne({
      where: { roomId: 0 },
      attributes: [
        'userId',
        'roomId',
        'userName',
        'isReady',
        'isAlive',
        'hand',
      ],
      raw: true,
    });

    console.log('roomtest', roomtest);
    console.log('usertestm', usertest);
    console.log('tabeltest', tabeltest);
  });

  socket.on('sql-update', async () => {
    await Room.update({ turn: 8 }, { where: { roomId: 0 } });
  });
  socket.on('sql-delete', async () => {
    await Table.destroy({ where: { roomId: 0 } });
  });

  socket.on('join', async ({ userId, roomId, userName }) => {
    // TODO:
    // game-info 필요
    // roomId에 따른 방 제목 -> 게임 시작시 상단 바 정보(비공개, 인원, 방제목)
    console.log('roomId: ', roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    const result = await Room.findOne({ where: { roomId } });
    if (!result) {
      await Room.create({
        roomId,
        turn: 9999,
      });

      await Table.create({
        roomId,
        blackCard: '[0,1,2,3,4,5,6,7,8,9,10,11,12]',
        whiteCard: '[0,1,2,3,4,5,6,7,8,9,10,11,12]',
        users: JSON.stringify([{ userId }]),
      });

      await User.create({
        roomId,
        userId,
        userName,
        isReady: false,
        isAlive: true,
        hand: '[]',
      });
    } else {
      const result = await Table.findOne({
        where: { roomId },
        attributes: ['users'],
        raw: true,
      });

      let usersData = JSON.parse(result.users);

      usersData.push({ userId });

      await Table.update(
        { users: JSON.stringify(usersData) },
        { where: { roomId } }
      );
    }
  });

  socket.on('ready', async ({ userId, roomId }) => {
    //const userInff = await User.findOne({where: userId})
    
    
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

server.listen(process.env.PORT, () => {
  console.log('Server is Listening');
});
