const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Op, Sequelize } = require('sequelize');
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
const { json } = require('sequelize');
const e = require('express');
const { table } = require('console');

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
//       blackCardss: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
//       whiteCardss: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
//       users: [], //[{userId:1}, {userId:4}, {userId:3}, {userId:2}]
//     },

//     users: [
//       {
//         userId: 0,
//         sids: 0,
//         username: 0,
//         isReady: false,
//         gameOver: flase,
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
      blackCards: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      whiteCards: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      users: '[{userId:0},{userId:1},{userId:2},{userId:3},]',
    });

    await User.create({
      roomId: 0,
      userId: 7,
      sids: socket.id,
      userName: 'test',
      isReady: false,
      gameOver: false,
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
      attributes: ['roomId', 'blackCards', 'whiteCards', 'users'],
      raw: true,
    });

    const usertest = await User.findOne({
      where: { roomId: 0 },
      attributes: [
        'userId',
        'roomId',
        'sids',
        'userName',
        'isReady',
        'gameOver',
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

  socket.on('joined', async (userId, roomId, fn) => {
    // TODO:
    // game-info 필요
    // roomId에 따른 방 제목 -> 게임 시작시 상단 바 정보(비공개, 인원, 방제목)
    // room 정보 마지막 함수로
    // userName은 main DB에서 추출
    userName = 'hohoho';
    console.log('roomId: ', roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    const result = await Room.findOne({ where: { roomId } });
    if (!result) {
      await Room.create({
        roomId,
        turn: userId,
      });

      await Table.create({
        roomId,
        blackCards: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        whiteCards: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        users: JSON.stringify([{ userId }]),
      });

      await User.create({
        roomId,
        userId,
        sids: socket.id,
        userName,
        isReady: false,
        gameOver: false,
        hand: JSON.stringify([]),
      });
    } else {
      const result = await Table.findOne({
        where: { roomId },
        attributes: ['users'],
        raw: true,
      });

      await User.create({
        roomId,
        userId,
        sids: socket.id,
        userName,
        isReady: false,
        gameOver: false,
        hand: JSON.stringify([]),
      });

      let usersData = JSON.parse(result.users);

      usersData.push({ userId });

      await Table.update(
        { users: JSON.stringify(usersData) },
        { where: { roomId } }
      );
    }

    let roomInfo = await Room.findOne({
      where: { roomId },
      attributes: ['turn'],
      raw: true,
    });

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards'],
      raw: true,
    });

    let userInfo = await User.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'isReady', 'gameOver', 'hand', 'sids'],
      raw: true,
    });
    // TODO: userProfileImg
    let userInfoV2 = userInfo.map((el) => {
      return {
        userId: el.userId,
        userName: el.userName,
        userProfileImg: '',
        isReady: el.isReady ? true : false,
        gameOver: el.gameOver ? true : false,
        hand: JSON.parse(el.hand),
      };
    });

    let cardResult = {
      blackCards: JSON.parse(tableInfo.blackCards).length,
      whiteCards: JSON.parse(tableInfo.whiteCards).length,
      turn: roomInfo.turn,
      users: userInfoV2,
    };

    userInfo.forEach((el) => socket.to(el.sids).emit('add-ready', cardResult));
    fn(cardResult);
  });

  socket.on('ready', async (userId) => {
    const roomId = socket.data.roomId;
    console.log('userId', userId);
    console.log('roomId', roomId);

    const userReady = await User.findOne({
      where: { userId },
      attributes: ['isReady'],
      raw: true,
    });

    userReady.isReady
      ? await User.update({ isReady: false }, { where: { userId } })
      : await User.update({ isReady: true }, { where: { userId } });

    let readyCount = await User.findAll({
      where: {
        roomId,
        [Op.or]: [{ isReady: 1 }],
      },
      attributes: ['isReady'],

      raw: true,
    });

    let roomInfo = await Room.findOne({
      where: { roomId },
      attributes: ['turn'],
      raw: true,
    });

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards'],
      raw: true,
    });

    let userInfo = await User.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'isReady', 'gameOver', 'hand', 'sids'],
      raw: true,
    });

    let userInfoV2 = userInfo.map((el) => {
      return {
        userId: el.userId,
        userName: el.userName,
        isReady: el.isReady ? true : false,
        gameOver: el.gameOver ? true : false,
        hand: JSON.parse(el.hand),
      };
    });

    let cardResult = {
      blackCards: JSON.parse(tableInfo.blackCards).length,
      whiteCards: JSON.parse(tableInfo.whiteCards).length,
      turn: roomInfo.turn,
      users: userInfoV2,
    };

    userInfo.forEach((el) => io.to(el.sids).emit('add-ready', cardResult));
    if (readyCount.length === 2) {
      userInfo.forEach((el) => io.to(el.sids).emit('game-start'));
    }
  });

  socket.on('first-draw', async (userId, black, myCard) => {
    const roomId = socket.data.roomId;
    const white = 3 - black;
    console.log('userId', userId);
    console.log('black', black);
    let getCards = [];

    let cardResult = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards'],
      raw: true,
    });
    let cards = JSON.parse(cardResult.blackCards);

    // black 뽑기
    for (let i = 0; i < black; i++) {
      let cardLength = cards.length;
      let CardIndex = Math.floor(Math.random() * Number(cardLength));

      let randomCard = cards[CardIndex];
      getCards = [
        ...getCards,
        { color: 'black', value: Number(randomCard), isOpen: false },
      ];
      cards.splice(CardIndex, 1);
    }

    await Table.update(
      { blackCards: JSON.stringify(cards) },
      { where: { roomId } }
    );

    cards = JSON.parse(cardResult.whiteCards);
    // white 뽑기
    for (let i = 0; i < white; i++) {
      let cardLength = cards.length;
      let CardIndex = Math.floor(Math.random() * Number(cardLength));
      let randomCard = cards[CardIndex];
      getCards = [
        ...getCards,
        { color: 'white', value: Number(randomCard), isOpen: false },
      ];
      cards.splice(CardIndex, 1);
    }

    await Table.update(
      { whiteCards: JSON.stringify(cards) },
      { where: { roomId } }
    );

    getCards
      .sort((a, b) => a.value - b.value)
      .sort((a, b) => {
        if (a.value === b.value) {
          if (a.color < b.color) return -1;
          else if (b.color < a.color) return 1;
          else return 0;
        }
      });

    await User.update(
      { hand: JSON.stringify(getCards) },
      { where: { userId } }
    );

    let roomInfo = await Room.findOne({
      where: { roomId },
      attributes: ['turn'],
      raw: true,
    });

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'users'],
      raw: true,
    });

    let userInfo = await User.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'gameOver', 'hand', 'sids'],
      raw: true,
    });

    let myInfo = userInfo.map((el) => {
      if (el.userId === userId) {
        return {
          userId: el.userId,
          userName: el.userName,
          userProfileImg: '',
          gameOver: el.gameOver ? true : false,
          hand: JSON.parse(el.hand).map((card) => {
            console.log('카드 value:', card.value);
            return {
              color: card.color,
              value: card.value,
              isOpen: card.isOpen,
            };
          }),
        };
      } else {
        return {
          userId: el.userId,
          userName: el.userName,
          userProfileImg: '',
          gameOver: el.gameOver ? true : false,
          hand: JSON.parse(el.hand).map((card) => {
            return {
              color: card.color,
              value: 'Back',
              isOpen: card.isOpen,
            };
          }),
        };
      }
    });

    let mycardResult = {
      blackCards: JSON.parse(tableInfo.blackCards).length,
      whiteCards: JSON.parse(tableInfo.whiteCards).length,
      turn: roomInfo.turn,
      users: myInfo,
    };

    myCard(mycardResult);
    // length 가 0

    const completion = userInfo.filter(
      (el) => JSON.parse(el.hand).length === 0
    ).length;

    if (completion === 0) {
      function a(temp) {
        const gameInfo = userInfo.map((el) => {
          return {
            userId: el.userId,
            userName: el.userName,
            userProfileImg: '',
            gameOver: el.gameOver ? true : false,
            hand: JSON.parse(el.hand).map((card) => {
              if (el.userId === temp.userId) {
                return {
                  color: card.color,
                  value: card.value,
                  isOpen: card.isOpen,
                };
              } else if (!card.isOpen) {
                return {
                  color: card.color,
                  value: 'Back',
                  isOpen: card.isOpen,
                };
              } else {
                return {
                  color: card.color,
                  value: card.value,
                  isOpen: card.isOpen,
                };
              }
            }),
          };
        });
        cardResult = {
          blackCards: JSON.parse(tableInfo.blackCards).length,
          whiteCards: JSON.parse(tableInfo.whiteCards).length,
          turn: roomInfo.turn,
          users: gameInfo,
        };
        return cardResult;
      }
      userInfo.forEach((el) => {
        const result = a(el);
        io.to(el.sids).emit('draw-result', result);
      });
    }
  });

  socket.on('color-selected', async (userId, color, myCard) => {
    let roomId = socket.data.roomId;
    let oneCard = {};

    let cardResult = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards'],
      raw: true,
    });

    if (color === 'black') {
      let cards = JSON.parse(cardResult.blackCards);
      let cardLength = cards.length;
      let cardIndex = Math.floor(Math.random() * Number(cardLength));
      let randomCard = cards[cardIndex];
      myCard({ color: 'black', value: Number(randomCard) });
      socket.data.security = { color: 'black', value: Number(randomCard) };
      oneCard = { color: 'black', value: Number(randomCard), isOpen: false };

      cards.splice(cardIndex, 1);

      await Table.update(
        { blackCards: JSON.stringify(cards) },
        { where: { roomId } }
      );
    } else {
      let cards = JSON.parse(cardResult.whiteCards);
      let cardLength = cards.length;
      let cardIndex = Math.floor(Math.random() * Number(cardLength));
      let randomCard = cards[cardIndex];
      myCard({ color: 'white', value: Number(randomCard) });
      socket.data.security = { color: 'black', value: Number(randomCard) };
      oneCard = { color: 'white', value: Number(randomCard), isOpen: false };

      cards.splice(cardIndex, 1);

      await Table.update(
        { whiteCards: JSON.stringify(cards) },
        { where: { roomId } }
      );
    }

    let userInfo = await User.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'gameOver', 'hand', 'sids'],
      raw: true,
    });

    userInfo.forEach((el) =>
      socket.to(el.sids).emit('result-select', { userId, color })
    );
  });

  socket.on('select-card-as-security', (userId, color, value) => {
    socket.data.security = { color: color, value: value };
    io.to(socket.Id).emit('select-target');
  });
});

server.listen(process.env.PORT, () => {
  console.log('Server is Listening');
});
