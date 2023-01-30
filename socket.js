const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Op, Sequelize } = require('sequelize');
require('dotenv');
const { Player, Room, Table } = require('./models');

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
if (process.env.NODE_ENV === 'development') {
  DB.sequelize
    .sync({ force: false })
    .then(() => {
      console.log('database 연결 성공');
    })
    .catch(console.error);
}

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://frontend-delta-puce.vercel.app'],
    method: ['GET', 'POST'],
  },
});

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

  socket.on('joined', async (userId, roomId, fn) => {
    // TODO:
    // game-info 필요
    // roomId에 따른 방 제목 -> 게임 시작시 상단 바 정보(비공개, 인원, 방제목)
    // room 정보 마지막 함수로
    // userName은 main DB에서 추출
    userName = 'hohoho';
    userProfileImg = '@#$@#$@#$임시';
    security = '';
    console.log('roomId: ', roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    const result = await Room.findOne({ where: { roomId } });
    if (!result) {
      await Room.create({
        roomId,
      });

      await Table.create({
        roomId,
        blackCards: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        whiteCards: JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        users: JSON.stringify([{ userId }]),
        top: JSON.stringify([]),
        turn: userId,
      });

      await Player.create({
        roomId,
        userId,
        sids: socket.id,
        userName,
        userProfileImg,
        security,
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

      await Player.create({
        roomId,
        userId,
        sids: socket.id,
        userName,
        userProfileImg,
        security,
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

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'turn'],
      raw: true,
    });

    let userInfo = await Player.findAll({
      where: { roomId },
      attributes: [
        'userId',
        'userName',
        'isReady',
        'gameOver',
        'hand',
        'sids',
        'userProfileImg',
      ],
      raw: true,
    });

    let userInfoV2 = userInfo.map((el) => {
      return {
        userId: el.userId,
        userName: el.userName,
        userProfileImg,
        isReady: el.isReady ? true : false,
        gameOver: el.gameOver ? true : false,
        hand: JSON.parse(el.hand),
      };
    });

    let cardResult = {
      blackCards: JSON.parse(tableInfo.blackCards).length,
      whiteCards: JSON.parse(tableInfo.whiteCards).length,
      turn: tableInfo.turn,
      users: userInfoV2,
    };

    userInfo.forEach((el) => socket.to(el.sids).emit('add-ready', cardResult));
    fn(cardResult);
  });

  socket.on('ready', async (userId) => {
    const roomId = socket.data.roomId;
    console.log('userId', userId);
    console.log('roomId', roomId);

    const userReady = await Player.findOne({
      where: { userId },
      attributes: ['isReady'],
      raw: true,
    });

    userReady.isReady
      ? await Player.update({ isReady: false }, { where: { userId } })
      : await Player.update({ isReady: true }, { where: { userId } });

    let readyCount = await Player.findAll({
      where: {
        roomId,
        [Op.or]: [{ isReady: 1 }],
      },
      attributes: ['isReady'],

      raw: true,
    });

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'turn'],
      raw: true,
    });

    let userInfo = await Player.findAll({
      where: { roomId },
      attributes: [
        'userId',
        'userName',
        'isReady',
        'gameOver',
        'hand',
        'sids',
        'userProfileImg',
      ],
      raw: true,
    });

    let userInfoV2 = userInfo.map((el) => {
      return {
        userId: el.userId,
        userName: el.userName,
        userProfileImg: el.userProfileImg,
        isReady: el.isReady ? true : false,
        gameOver: el.gameOver ? true : false,
        hand: JSON.parse(el.hand),
      };
    });

    let cardResult = {
      blackCards: JSON.parse(tableInfo.blackCards).length,
      whiteCards: JSON.parse(tableInfo.whiteCards).length,
      turn: tableInfo.turn,
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
      if (randomCard === 12) {
        i--;
        continue;
      }

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
      if (randomCard === 12) {
        i--;
        continue;
      }
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

    await Player.update(
      { hand: JSON.stringify(getCards) },
      { where: { userId } }
    );

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'users', 'turn'],
      raw: true,
    });

    let userInfo = await Player.findAll({
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
      turn: tableInfo.turn,
      users: myInfo,
    };

    myCard(mycardResult);
    // length 가 0

    const completion = userInfo.filter(
      (el) => JSON.parse(el.hand).length === 0
    ).length;

    if (completion === 0) {
      function info(temp) {
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
          turn: tableInfo.turn,
          users: gameInfo,
        };
        return cardResult;
      }
      userInfo.forEach((el) => {
        const result = info(el);
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
      await Player.update(
        {
          security: JSON.stringify({
            color: 'black',
            value: Number(randomCard),
          }),
        },
        { where: { userId } }
      );
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
      await Player.update(
        {
          security: JSON.stringify({
            color: 'white',
            value: Number(randomCard),
          }),
        },
        { where: { userId } }
      );
      oneCard = { color: 'white', value: Number(randomCard), isOpen: false };
      cards.splice(cardIndex, 1);
      await Table.update(
        { whiteCards: JSON.stringify(cards) },
        { where: { roomId } }
      );
    }
    let userInfo = await Player.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'gameOver', 'hand', 'sids'],
      raw: true,
    });
    userInfo.forEach((el) =>
      socket.to(el.sids).emit('result-select', { userId, color })
    );
  });

  socket.on('guess', async (userId, { index, value }) => {
    const roomId = socket.data.roomId;
    console.log(userId);
    console.log(index);
    console.log(value);
    let targetHand = JSON.parse(
      (
        await Player.findOne({
          where: { userId },
          attributes: ['hand'],
          raw: true,
        })
      ).hand
    );
    console.log('target유저 이전 값:', targetHand);
    let result = false;
    let guessResult = {};
    let userCard;
    let no_security;

    // HACK: 타겟유저의 카드를 맞췄을 때
    if (targetHand[index].value === value) {
      console.log('result true');
      console.log('타겟의 값', targetHand[index].value);
      console.log('설정한 값', value);
      targetHand[index].isOpen = true;
      if (targetHand.filter((card) => card.isOpen === false).length) {
        await Player.update(
          { hand: JSON.stringify(targetHand) },
          { where: { userId } }
        );
        console.log('1번콘솔', { hand: JSON.stringify(targetHand) });
      } else {
        await Player.update(
          { hand: JSON.stringify(targetHand), gameOver: true },
          { where: { userId } }
        );

        let topRank = JSON.parse(
          (
            await Table.findOne({
              where: { roomId },
              attributes: ['top'],
              raw: true,
            })
          ).top
        );

        let name = (
          await Player.findOne({
            where: { userId },
            attributes: ['userName'],
            raw: true,
          })
        ).userName;

        topRank.unshift({ userId: userId, userName: name });

        await Table.update(
          { top: JSON.stringify(topRank) },
          { where: { roomId } }
        );

        console.log('2번콘솔', {
          hand: JSON.stringify(targetHand),
          gameOver: true,
        });
      }

      userCard = await Player.findOne({
        where: { userId },
        attributes: ['hand', 'security'],
        raw: true,
      });

      result = true;
    } else {
      console.log('result false');
      console.log('타겟의 값', targetHand[index].value);
      console.log('설정한 값', value);
      userCard = await Player.findOne({
        where: { userId: socket.data.userId },
        attributes: ['hand', 'security'],
        raw: true,
      });

      let roomTurn = await Table.findOne({
        where: { roomId },
        attributes: ['turn'],
        raw: true,
      });

      let usersTurn = await Table.findOne({
        where: { roomId },
        attributes: ['users'],
        raw: true,
      });

      let turns = JSON.parse(usersTurn.users);
      let netxTurn = roomTurn.turn;

      for (let i = 0; i < turns.length; i++) {
        if (turns[i].userId === netxTurn) {
          netxTurn = turns[(i + 1) % turns.length].userId;
          break;
        }
      }

      await Table.update({ turn: netxTurn }, { where: { roomId } });

      result = false;
      let tempSecurity;
      if (userCard.security.length > 0) {
        tempSecurity = JSON.parse(userCard.security);
        tempSecurity.isOpen = true;
      }

      let tempHand = JSON.parse(userCard.hand);

      tempHand.push(tempSecurity);
      let jokerIndex = [];
      let jokerCard = [];
      for (let i = 0; i < tempHand.length; i++) {
        if (tempHand[i].value === 12) {
          jokerIndex.push(i);
          jokerCard.push(tempHand[i]);
        }
      }

      jokerIndex.map((el, i) => {
        tempHand.splice(el - i, 1);
      });

      tempHand
        .sort((a, b) => a.value - b.value)
        .sort((a, b) => {
          if (a.value === b.value) {
            if (a.color < b.color) return -1;
            else if (b.color < a.color) return 1;
            else return 0;
          }
        });

      for (let i = 0; i < jokerIndex.length; i++) {
        tempHand.splice(jokerIndex[i], 0, jokerCard[i]);
      }

      if (tempHand.filter((card) => card.isOpen === false).length) {
        await Player.update(
          { hand: JSON.stringify(tempHand), security: '' },
          { where: { userId: socket.data.userId } }
        );
        console.log('3번콘솔', {
          hand: JSON.stringify(tempHand),
          security: '',
        });
      } else {
        await Player.update(
          { hand: JSON.stringify(tempHand), security: '', gameOver: true },
          { where: { userId: socket.data.userId } }
        );
        let topRank = JSON.parse(
          (
            await Table.findOne({
              where: { roomId },
              attributes: ['top'],
              raw: true,
            })
          ).top
        );

        let name = (
          await Player.findOne({
            where: { userId },
            attributes: ['userName'],
            raw: true,
          })
        ).userName;

        topRank.unshift({ userId: userId, userName: name });

        await Table.update(
          { top: JSON.stringify(topRank) },
          { where: { roomId } }
        );

        console.log('4번콘솔', {
          hand: JSON.stringify(tempHand),
          security: '',
          gameOver: true,
        });
      }
    }

    // TODO: 전체적으로 뿌려주기 전에 상태값 다 입히기.
    let userInfo = await Player.findAll({
      where: { roomId },
      attributes: [
        'userId',
        'userName',
        'isReady',
        'gameOver',
        'hand',
        'sids',
        'userProfileImg',
        'security',
      ],
      raw: true,
    });

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'turn'],
      raw: true,
    });

    function info(temp) {
      const some = userInfo.map((el) => {
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

      (no_security = userCard.security.length === 0 ? false : true),
        (guessResult = {
          blackCards: JSON.parse(tableInfo.blackCards).length,
          whiteCards: JSON.parse(tableInfo.whiteCards).length,
          turn: tableInfo.turn,
          users: some,
        });
      return guessResult;
    }

    if (userInfo.filter((user) => user.gameOver == false).length === 1) {
      // userInfo.forEach((el) => {
      //   io.to(el.sids).emit('gameover', table);
      // });
      let topRank = JSON.parse(
        (
          await Table.findOne({
            where: { roomId },
            attributes: ['top'],
            raw: true,
          })
        ).top
      );

      io.to(roomId).emit('gameover', topRank);

      // TODO: 방 초기화
      // 입장하고 있는 유저들의 정보는 살려야함.
      // turn 넘길 때 죽어있는 유저는 빼고 넘겨야한다.

      await Table.update(
        {
          roomId,
          blackCards: JSON.stringify([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
          ]),
          whiteCards: JSON.stringify([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
          ]),
          users: JSON.stringify([{ userId }]),
          top: JSON.stringify([]),
          turn: userId,
        },
        { where: { roomId } }
      );

      await Player.update({
        roomId,
        userId,
        sids: socket.id,
        userName,
        userProfileImg,
        security,
        isReady: false,
        gameOver: false,
        hand: JSON.stringify([]),
      });
    } else {
      userInfo.forEach((el) => {
        const table = info(el);
        io.to(el.sids).emit('result-guess', result, no_security, table);
      });
    }
  });

  socket.on('place-joker', async (userId, hand) => {
    const roomId = socket.data.roomId;
    console.log(userId);
    console.log(hand);
    console.log(typeof hand);
    // hand가 있으면 수정해서 보내주고,
    // 없으면 그냥 전체적인Info  // 없을 때는 Null

    // hand가 있을 때
    if (hand) {
      await Player.update(
        { hand: JSON.stringify(hand) },
        { where: { userId } }
      );
    } else {
      // TODO: 담보 불러서 저장하기.
      let userInfo = await Player.findOne({
        where: { userId },
        attributes: ['security', 'hand'],
        raw: true,
      });
      console.log(userInfo);
      console.log(userInfo.security);
      console.log(userInfo.hand);

      let userSecurity = JSON.parse(userInfo.security);
      userSecurity.isOpen = false;
      let userHand = JSON.parse(userInfo.hand);

      userHand.push(userSecurity);
      let jokerIndex = [];
      let jokerCard = [];
      for (let i = 0; i < userHand.length; i++) {
        if (userHand[i].value === 12) {
          jokerIndex.push(i);
          jokerCard.push(userHand[i]);
        }
      }

      jokerIndex.map((el, i) => {
        userHand.splice(el - i, 1);
      });

      userHand
        .sort((a, b) => a.value - b.value)
        .sort((a, b) => {
          if (a.value === b.value) {
            if (a.color < b.color) return -1;
            else if (b.color < a.color) return 1;
            else return 0;
          }
        });

      for (let i = 0; i < jokerIndex.length; i++) {
        userHand.splice(jokerIndex[i], 0, jokerCard[i]);
      }

      await Player.update(
        { hand: JSON.stringify(userHand) },
        { where: { userId } }
      );
    }

    let userInfo = await Player.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'gameOver', 'hand', 'sids'],
      raw: true,
    });

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'users', 'turn'],
      raw: true,
    });

    function info(temp) {
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
        turn: tableInfo.turn,
        users: gameInfo,
      };
      return cardResult;
    }
    userInfo.forEach((el) => {
      const result = info(el);
      io.to(el.sids).emit('draw-result', result);
    });
  });

  socket.on('select-card-as-security', async (userId, color, value) => {
    await Player.update(
      { security: JSON.stringify({ color, value }) },
      { where: { userId } }
    );
  });

  socket.on('next-turn', async () => {
    const roomId = socket.data.roomId;

    let tableInfo = await Table.findOne({
      where: { roomId },
      attributes: ['blackCards', 'whiteCards', 'users', 'turn'],
      raw: true,
    });

    let turns = JSON.parse(tableInfo.users);
    let netxTurn = tableInfo.turn;

    for (let i = 0; i < turns.length; i++) {
      if (turns[i].userId === netxTurn) {
        netxTurn = turns[(i + 1) % turns.length].userId;
        break;
      }
    }

    await Table.update({ turn: netxTurn }, { where: { roomId } });

    let userInfo = await Player.findAll({
      where: { roomId },
      attributes: ['userId', 'userName', 'gameOver', 'hand', 'sids'],
      raw: true,
    });

    function info(temp) {
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
        turn: netxTurn,
        users: gameInfo,
      };
      return cardResult;
    }
    userInfo.forEach((el) => {
      const result = info(el);
      io.to(el.sids).emit('next-gameInfo', result);
    });
  });
});

server.listen(process.env.PORT, () => {
  console.log('Server is Listening');
});
