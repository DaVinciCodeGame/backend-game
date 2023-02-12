require('dotenv/config');

const http = require('http');
const { Server } = require('socket.io');
const { Op } = require('sequelize');
const { default: axios } = require('axios');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const { eventName } = require('./event-name');
const app = require('./app');
const { Player, Room, Table } = require('./models');
const DB = require('./models');
const cookieParser = require('./utils/cookie-parser');
const CustomError = require('./utils/custom-error');
const verifyToken = require('./utils/verify-token');

async function start() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'development') {
    await DB.sequelize
      .sync()
      .then(() => {
        console.log('database 동기화 성공');
      })
      .catch(console.error);
  }

  const socketIoOptions = {
    cors: {
      origin: [process.env.ORIGIN1, process.env.ORIGIN2],
      method: ['GET', 'POST'],
      credentials: true,
    },
  };

  const io = new Server(httpServer, socketIoOptions);

  const pubClient = createClient({ url: process.env.REDIS_URI });
  const subClient = pubClient.duplicate();

  if (process.env.NODE_ENV === 'production') {
    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
  }

  io.on('connection', async (socket) => {
    try {
      const { cookie } = socket.handshake.headers;

      if (!cookie)
        throw new CustomError('요청에 쿠키가 포합되어 있지 않습니다.', 301);

      const { accessToken } = cookieParser(cookie);

      if (!accessToken)
        throw new CustomError('엑세스 토큰이 담긴 쿠키가 없습니다.', 302);

      const { userId } = verifyToken(accessToken);

      if (!userId)
        throw new CustomError('엑세스 토큰이 유효하지 않습니다.', 303);

      const { data } = await axios.get(
        `${process.env.MAIN_SERVER_URL}/p/users/${userId}`
      );

      socket.onAny((event, ...args) => {
        console.log(`들어온 이벤트 이름: ${event}`);
        if (args) {
          console.log('매개변수:');
          args.forEach((arg) => {
            console.log(arg);
          });
        }
      });

      socket.onAnyOutgoing((event, ...args) => {
        console.log(`나가는 이벤트 이름: ${event}`);
        if (args) {
          console.log('매개변수:');
          args.forEach((arg) => {
            console.log(arg);
          });
        }
      });

      socket.on(eventName.SEND_MESSAGE, (msg, room, addMyMessage) => {
        const userName = socket.data.userName;

        socket.to(room).emit(eventName.RECEIVE_MESSAGE, msg, userName);
        addMyMessage(msg);
      });

      socket.on(eventName.JOINED, async (roomId, fn) => {
        socket.data.isFirstDraw = false;
        const score = 0;

        const room = await Room.findOne({ where: { roomId } });

        if (!room) {
          const newError = new CustomError('방이 없습니다.', 800);

          io.to(socket.id).emit(eventName.ERROR, newError);
          return;
        }

        socket.join(roomId);
        socket.data.roomId = roomId;

        socket.data.userId = data.userId;
        const userId = data.userId;
        socket.data.userProfileImg = data.profileImageUrl;
        socket.data.userName = data.username;

        const duplicate = await Player.findOne({ where: { userId } });
        if (duplicate) {
          const newError = new CustomError(
            '이미 다른 방에 참여 중인 Player 입니다.',
            999
          );

          io.to(socket.id).emit(eventName.ERROR, newError);
          return;
        }

        let table = await room.getTable();

        if (!table) {
          table = await Table.create({
            blackCards: JSON.stringify([
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
            ]),
            whiteCards: JSON.stringify([
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
            ]),
            users: JSON.stringify([]),
            top: JSON.stringify([]),
            turn: userId,
            roomId,
          });

          await Promise.all([room.setTable(table), table.setRoom(room)]);
        }

        const player = await Player.create({
          userId,
          sids: socket.id,
          userName: socket.data.userName,
          userProfileImg: socket.data.userProfileImg,
          security: '',
          isReady: false,
          gameOver: false,
          hand: JSON.stringify([]),
          score,
        });

        room.addPlayer(player);

        const usersData = JSON.parse(table.users);

        usersData.push({ userId });

        await Table.update(
          { users: JSON.stringify(usersData) },
          { where: { roomId } }
        );

        let tableInfo = await Table.findOne({
          where: { roomId },
        });

        let userInfo = await Player.findAll({
          where: { roomId },
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

        const roomInfo = {
          maxMembers: room.maxMembers,
          members: userInfoV2.length,
          isPlaying: room.isPlaying,
          secret: room.password ? true : false,
          roomId: room.roomId,
          roomName: room.roomName,
        };

        userInfo.forEach((el) =>
          socket.to(el.sids).emit(eventName.ADD_READY, cardResult, roomInfo)
        );
        fn(cardResult, roomInfo);
      });

      socket.on(eventName.READY, async () => {
        const roomId = socket.data.roomId;
        const userId = socket.data.userId;
        socket.data.isFirstDraw = false;

        const room = await Room.findOne({ where: { roomId } });
        const userReady = await Player.findOne({
          where: { userId, [Op.and]: [{ roomId }] },
          attributes: ['isReady'],
          raw: true,
        });

        userReady.isReady
          ? await Player.update({ isReady: false }, { where: { userId } })
          : await Player.update({ isReady: true }, { where: { userId } });

        let readyCount = await Player.findAll({
          where: {
            roomId,
            [Op.and]: [{ isReady: 1 }],
          },
          attributes: ['isReady'],
          raw: true,
        });

        let tableInfo = await Table.findOne({
          where: { roomId },
          attributes: ['blackCards', 'whiteCards', 'turn', 'users'],
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

        let roomInfo = {
          maxMembers: room.maxMembers,
          members: userInfoV2.length,
          isPlaying: room.isPlaying,
          secret: room.password ? true : false,
          roomId: room.roomId,
          roomName: room.roomName,
        };

        userInfo.forEach((el) =>
          io.to(el.sids).emit(eventName.ADD_READY, cardResult, roomInfo)
        );

        if (JSON.parse(tableInfo.users).length > 1)
          if (readyCount.length === JSON.parse(tableInfo.users).length) {
            roomInfo.isPlaying = true;
            await Room.update({ isPlaying: true }, { where: { roomId } });

            await Table.update(
              {
                blackCards: JSON.stringify([
                  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                ]),
                whiteCards: JSON.stringify([
                  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                ]),
                top: JSON.stringify([]),
              },
              { where: { roomId } }
            );

            await Promise.all(
              userInfo.map(async (el) => {
                await Player.update(
                  {
                    isReady: false,
                    gameOver: false,
                    hand: JSON.stringify([]),
                    security: '',
                  },
                  { where: { userId: el.userId } }
                );
              })
            );

            userInfo.forEach((el) =>
              io.to(el.sids).emit(eventName.GAME_START, roomInfo)
            );
          }
      });

      socket.on(eventName.FIRST_DRAW, async (black, myCard) => {
        if (!socket.data.isFirstDraw) {
          const roomId = socket.data.roomId;

          const userId = socket.data.userId;
          let getCards = [];
          let white = 0;

          let cardResult = await Table.findOne({
            where: { roomId },
          });

          if (JSON.parse(cardResult.users).length > 3) {
            white = 3 - black;
          } else {
            white = 4 - black;
          }

          let cards = JSON.parse(cardResult.blackCards);

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
            attributes: [
              'userId',
              'userName',
              'gameOver',
              'hand',
              'sids',
              'needToBeDeleted',
              'userProfileImg',
            ],
            raw: true,
          });

          let myInfo = userInfo.map((el) => {
            if (el.userId === userId) {
              return {
                userId: el.userId,
                userName: el.userName,
                userProfileImg: el.userProfileImg,
                gameOver: el.gameOver ? true : false,
                hand: JSON.parse(el.hand).map((card) => {
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
                userProfileImg: el.userProfileImg,
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

          const completion = userInfo.filter(
            (el) => JSON.parse(el.hand).length === 0
          ).length;

          if (completion === 0) {
            function info(temp) {
              const gameInfo = userInfo.map((el) => {
                return {
                  userId: el.userId,
                  userName: el.userName,
                  userProfileImg: el.userProfileImg,
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
              if (!el.needToBeDeleted) {
                const result = info(el);
                io.to(el.sids).emit(eventName.DRAW_RESULT, result);
              }
            });
          }
          socket.data.isFirstDraw = true;
        }
      });

      socket.on(eventName.COLOR_SELECTED, async (color, myCard) => {
        let roomId = socket.data.roomId;
        const userId = socket.data.userId;
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
          myCard({ color: 'black', value: Number(randomCard), isOpen: false });
          await Player.update(
            {
              security: JSON.stringify({
                color: 'black',
                value: Number(randomCard),
              }),
            },
            { where: { userId } }
          );
          oneCard = {
            color: 'black',
            value: Number(randomCard),
            isOpen: false,
          };
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
          myCard({ color: 'white', value: Number(randomCard), isOpen: false });
          await Player.update(
            {
              security: JSON.stringify({
                color: 'white',
                value: Number(randomCard),
              }),
            },
            { where: { userId } }
          );
          oneCard = {
            color: 'white',
            value: Number(randomCard),
            isOpen: false,
          };
          cards.splice(cardIndex, 1);
          await Table.update(
            { whiteCards: JSON.stringify(cards) },
            { where: { roomId } }
          );
        }
        let userInfo = await Player.findAll({
          where: { roomId },
          attributes: [
            'userId',
            'userName',
            'gameOver',
            'hand',
            'sids',
            'needToBeDeleted',
          ],
          raw: true,
        });

        userInfo.forEach((el) => {
          if (!el.needToBeDeleted)
            socket.to(el.sids).emit(eventName.RESULT_SELECT, { userId, color });
        });
      });

      socket.on(eventName.GUESS, async (userId, { index, value }) => {
        const roomId = socket.data.roomId;

        let targetHand = JSON.parse(
          (
            await Player.findOne({
              where: { userId, [Op.and]: [{ roomId }] },
              attributes: ['hand'],
              raw: true,
            })
          ).hand
        );

        let result = false;
        let guessResult = {};
        let userCard;
        let no_security;
        let userInfoV2;

        if (targetHand[index].value === value) {
          targetHand[index].isOpen = true;
          if (targetHand.filter((card) => card.isOpen === false).length) {
            await Player.update(
              { hand: JSON.stringify(targetHand) },
              { where: { userId } }
            );
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

            let getUser = await Player.findOne({
              where: { userId, [Op.and]: [{ roomId }] },
              attributes: ['userId'],

              raw: true,
            });

            topRank.unshift(getUser.userId);

            await Table.update(
              { top: JSON.stringify(topRank) },
              { where: { roomId } }
            );

            await Room.update({ isPlaying: false }, { where: { roomId } });
          }

          userCard = await Player.findOne({
            where: { userId, [Op.and]: [{ roomId }] },
            attributes: ['hand', 'security'],
            raw: true,
          });

          result = true;
        } else {
          userCard = await Player.findOne({
            where: { userId: socket.data.userId, [Op.and]: [{ roomId }] },
            attributes: ['hand', 'security'],
            raw: true,
          });

          let changeHand = JSON.parse(userCard.hand);
          let targetSecurity = JSON.parse(userCard.security);

          for (let i = 0; i < changeHand.length; i++) {
            if (
              changeHand[i].value == targetSecurity.value &&
              changeHand[i].color == targetSecurity.color
            ) {
              changeHand[i].isOpen = true;
            }
          }

          if (changeHand.filter((card) => card.isOpen === false).length) {
            await Player.update(
              { hand: JSON.stringify(changeHand) },
              { where: { userId: socket.data.userId } }
            );
          } else {
            await Player.update(
              {
                hand: JSON.stringify(changeHand),
                gameOver: true,
                security: '',
              },
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

            let getUser = await Player.findOne({
              where: { userId: socket.data.userId, [Op.and]: [{ roomId }] },
              attributes: ['userId'],

              raw: true,
            });

            topRank.unshift(getUser.userId);

            await Table.update(
              { top: JSON.stringify(topRank) },
              { where: { roomId } }
            );
          }

          const table = await Table.findOne({ where: { roomId } });
          let player = await Player.findAll({ where: { roomId } });
          let nextTurn = table.turn;
          let turns = JSON.parse(table.users);

          let turnIndex = 0;

          for (let i = 0; i < turns.length; i++) {
            if (turns[i].userId === nextTurn) {
              turnIndex = i;
              break;
            }
          }

          let flag = 0;

          for (let i = 1; i < turns.length + 1; i++) {
            for (let j = 0; j < player.length; j++) {
              if (
                turns[(turnIndex + i) % turns.length].userId ==
                  player[j].userId &&
                !player[j].gameOver
              ) {
                nextTurn = player[j].userId;
                flag = 1;
                break;
              }
            }
            if (flag) {
              break;
            }
          }

          await Table.update({ turn: nextTurn }, { where: { roomId } });

          result = false;
        }

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

        let tableInfoV2 = await Table.findOne({
          where: { roomId },
          attributes: ['blackCards', 'whiteCards', 'turn'],
          raw: true,
        });

        function info(temp) {
          const some = userInfo.map((el) => {
            return {
              userId: el.userId,
              userName: el.userName,
              userProfileImg: el.userProfileImg,
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
              blackCards: JSON.parse(tableInfoV2.blackCards).length,
              whiteCards: JSON.parse(tableInfoV2.whiteCards).length,
              turn: tableInfoV2.turn,
              users: some,
            });
          return guessResult;
        }

        if (userInfo.filter((user) => user.gameOver == false).length === 1) {
          const winner = await Player.findOne({
            where: {
              roomId,
              [Op.and]: [{ gameOver: false }],
            },
            attributes: ['userId'],

            raw: true,
          });

          let topRank = JSON.parse(
            (
              await Table.findOne({
                where: { roomId },
                attributes: ['top'],
                raw: true,
              })
            ).top
          );

          topRank.unshift(winner.userId);

          const result = (
            await axios.post(
              `${process.env.MAIN_SERVER_URL}/p/game-result`,
              topRank
            )
          ).data;

          let endingInfo = result.map((user) => {
            if (user.change > 0) {
              number = `+${user.change}`;
            } else number = JSON.stringify(user.change);

            return {
              userId: user.userId,
              userName: user.username,
              prevScore: user.prevScore,
              score: user.score,
              change: number,
            };
          });
          await Room.update(
            { isPlaying: false, turn: winner.userId },
            { where: { roomId } }
          );

          await Table.update(
            {
              blackCards: JSON.stringify([
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
              ]),
              whiteCards: JSON.stringify([
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
              ]),
              top: JSON.stringify([]),
            },
            { where: { roomId } }
          );

          await Promise.all(
            userInfo.map(async (el) => {
              await Player.update(
                {
                  isReady: false,
                  gameOver: false,
                  hand: JSON.stringify([]),
                  security: '',
                },
                { where: { userId: el.userId } }
              );
            })
          );

          let tableInfo = await Table.findOne({
            where: { roomId },
            attributes: ['blackCards', 'whiteCards', 'turn'],
            raw: true,
          });

          userInfoV2 = await Player.findAll({
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
              'needToBeDeleted',
            ],
            raw: true,
          });

          function infoV2(temp) {
            const some = userInfoV2
              .filter((el) => el !== undefined)
              .map((el) => {
                return {
                  userId: el.userId,
                  userName: el.userName,
                  userProfileImg: el.userProfileImg,
                  isReady: el.isReady,
                  gameOver: el.gameOver ? true : false,
                  hand: JSON.parse(el.hand).map((card) => {
                    if (card == '[]') {
                      return card;
                    } else if (el.userId === temp.userId) {
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

          userInfo.forEach((el) => {
            const gameInfo = infoV2(el);

            if (!el.needToBeDeleted)
              io.to(el.sids).emit(eventName.GAMEOVER, endingInfo, gameInfo);
          });

          userInfoV2.map(async (user) => {
            if (user.needToBeDeleted === 1) {
              await Player.destroy({
                where: { userId: user.userId, [Op.and]: [{ roomId }] },
              });
            }
          });
        } else {
          userInfo.forEach((el) => {
            if (!el.needToBeDeleted) {
              const table = info(el);
              io.to(el.sids).emit(
                eventName.RESULT_GUESS,
                result,
                no_security,
                table
              );
            }
          });
        }
      });

      socket.on(eventName.PLACE_JOKER, async (hand) => {
        const userId = socket.data.userId;
        const roomId = socket.data.roomId;

        if (hand) {
          await Player.update(
            { hand: JSON.stringify(hand) },
            { where: { userId } }
          );
        } else {
          let userInfo = await Player.findOne({
            where: { userId, [Op.and]: [{ roomId }] },
            attributes: ['security', 'hand'],
            raw: true,
          });

          let userSecurity = JSON.parse(userInfo.security);
          let userHand = JSON.parse(userInfo.hand);
          userSecurity.isOpen = false;

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
          attributes: [
            'userId',
            'userName',
            'gameOver',
            'hand',
            'sids',
            'needToBeDeleted',
            'userProfileImg',
          ],
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
              userProfileImg: el.userProfileImg,
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
          if (!el.needToBeDeleted) {
            const result = info(el);
            io.to(el.sids).emit(eventName.ONGOING, result);
          }
        });
      });

      socket.on(
        eventName.SELECT_CARD_AS_SECURITY,
        async (userId, color, value) => {
          await Player.update(
            { security: JSON.stringify({ color, value }) },
            { where: { userId } }
          );
        }
      );

      socket.on(eventName.NEXT_TURN, async () => {
        const roomId = socket.data.roomId;

        let tableInfo = await Table.findOne({
          where: { roomId },
          attributes: ['blackCards', 'whiteCards', 'users', 'turn'],
          raw: true,
        });

        let userInfo = await Player.findAll({
          where: { roomId },
          attributes: [
            'userId',
            'userName',
            'gameOver',
            'hand',
            'sids',
            'userProfileImg',
          ],
          raw: true,
        });

        let turns = JSON.parse(tableInfo.users);
        let nextTurn = tableInfo.turn;
        let turnIndex = 0;

        for (let i = 0; i < turns.length; i++) {
          if (turns[i].userId === nextTurn) {
            turnIndex = i;
            break;
          }
        }

        let flag = 0;

        for (let i = 1; i < turns.length + 1; i++) {
          for (let j = 0; j < userInfo.length; j++) {
            if (
              turns[(turnIndex + i) % turns.length].userId ==
                userInfo[j].userId &&
              !userInfo[j].gameOver
            ) {
              nextTurn = userInfo[j].userId;
              flag = 1;
              break;
            }
          }
          if (flag) {
            break;
          }
        }

        await Table.update({ turn: nextTurn }, { where: { roomId } });

        function info(temp) {
          const gameInfo = userInfo.map((el) => {
            return {
              userId: el.userId,
              userName: el.userName,
              userProfileImg: el.userProfileImg,
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
            turn: nextTurn,
            users: gameInfo,
          };
          return cardResult;
        }
        userInfo.forEach((el) => {
          if (!el.needToBeDeleted) {
            const result = info(el);
            io.to(el.sids).emit(eventName.NEXT_GAMEINFO, result);
          }
        });
      });

      socket.on(eventName.ROOM_OUT, async () => {
        const roomId = socket.data.roomId;
        const userId = socket.data.userId;

        let userInfoV2;
        let userInfo;
        let nextTurn;

        const room = await Room.findOne({ where: { roomId } });
        const player = await Player.findAll({
          where: { roomId },
          attributes: ['userId', 'userName', 'gameOver', 'hand', 'sids'],
          raw: true,
        });
        const table = await room.getTable();

        let isPlaying = (
          await Room.findOne({
            where: { roomId },
            attributes: ['isPlaying'],
            raw: true,
          })
        ).isPlaying;

        const users = JSON.parse(table?.users);

        if (users?.length > 1) {
          if (table?.turn === userId) {
            let turns = JSON.parse(table?.users);
            nextTurn = table?.turn;
            let turnIndex = 0;

            for (let i = 0; i < turns.length; i++) {
              if (turns[i].userId === nextTurn) {
                turnIndex = i;
                break;
              }
            }

            let flag = 0;

            for (let i = 1; i < turns.length + 1; i++) {
              for (let j = 0; j < player?.length; j++) {
                if (
                  turns[(turnIndex + i) % turns.length].userId ==
                    player[j].userId &&
                  !player[j].gameOver
                ) {
                  nextTurn = player[j].userId;
                  flag = 1;
                  break;
                }
              }
              if (flag) {
                break;
              }
            }

            await Table.update({ turn: nextTurn }, { where: { roomId } });
          }
        }

        for (let i = 0; i < users.length; i++) {
          if (users[i].userId == userId) {
            users.splice(i, 1);
            break;
          }
        }

        if (users.length == 0) {
          await Room.destroy({ where: { roomId } });
        }

        await Table.update(
          {
            users: JSON.stringify(users),
            turn: nextTurn,
          },
          { where: { roomId } }
        );

        if (isPlaying) {
          let outUser = await Player.findOne({
            where: {
              userId,
              [Op.and]: [{ roomId }],
            },
            attributes: [
              'userId',
              'userName',
              'score',
              'gameOver',
              'hand',
              'needToBeDeleted',
            ],
            raw: true,
          });

          let topRank = JSON.parse(
            (
              await Table.findOne({
                where: { roomId },
                attributes: ['top'],
                raw: true,
              })
            ).top
          );

          topRank.unshift(outUser.userId);

          await Table.update(
            { top: JSON.stringify(topRank) },
            { where: { roomId } }
          );

          let outUserHand = JSON.parse(outUser.hand);
          outUserHand.forEach((card) => {
            if (card.isOpen === false) card.isOpen = true;
          });
          outUser.hand = JSON.stringify(outUserHand);

          await Player.update(
            {
              gameOver: true,
              needToBeDeleted: true,
              hand: outUser.hand,
            },
            { where: { userId, [Op.and]: [{ roomId }] } }
          );

          userInfo = await Player.findAll({
            where: { roomId },
            attributes: [
              'userId',
              'userName',
              'gameOver',
              'hand',
              'sids',
              'needToBeDeleted',
            ],
            raw: true,
          });

          if (userInfo.filter((user) => user.gameOver == false).length === 1) {
            const winner = await Player.findOne({
              where: {
                roomId,
                [Op.and]: [{ gameOver: false }],
              },
              attributes: ['userId'],

              raw: true,
            });

            let topRank = JSON.parse(
              (
                await Table.findOne({
                  where: { roomId },
                  attributes: ['top'],
                  raw: true,
                })
              ).top
            );

            topRank.unshift(winner.userId);

            const result = (
              await axios.post(
                `${process.env.MAIN_SERVER_URL}/p/game-result`,
                topRank
              )
            ).data;

            let endingInfo = result.map((user) => {
              if (user.change > 0) {
                number = `+${user.change}`;
              } else number = JSON.stringify(user.change);

              return {
                userId: user.userId,
                userName: user.username,
                prevScore: user.prevScore,
                score: user.score,
                change: number,
              };
            });
            await Room.update(
              { isPlaying: false, turn: winner.userId },
              { where: { roomId } }
            );

            await Table.update(
              {
                blackCards: JSON.stringify([
                  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                ]),
                whiteCards: JSON.stringify([
                  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
                ]),
                top: JSON.stringify([]),
              },
              { where: { roomId } }
            );

            await Promise.all(
              userInfo.map(async (el) => {
                await Player.update(
                  {
                    isReady: false,
                    gameOver: false,
                    hand: JSON.stringify([]),
                    security: '',
                  },
                  { where: { userId: el.userId } }
                );
              })
            );

            let tableInfo = await Table.findOne({
              where: { roomId },
              attributes: ['blackCards', 'whiteCards', 'turn'],
              raw: true,
            });

            userInfoV2 = await Player.findAll({
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
                'needToBeDeleted',
              ],
              raw: true,
            });

            function infoV2(temp) {
              const some = userInfoV2
                .filter((el) => el !== undefined)
                .map((el) => {
                  if (!el.needToBeDeleted) {
                    return {
                      userId: el.userId,
                      userName: el.userName,
                      userProfileImg: el.userProfileImg,
                      isReady: el.isReady,
                      gameOver: el.gameOver ? true : false,
                      hand: JSON.parse(el.hand).map((card) => {
                        if (card == '[]') {
                          return card;
                        } else if (el.userId === temp.userId) {
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
                  }
                });

              guessResult = {
                blackCards: JSON.parse(tableInfo.blackCards).length,
                whiteCards: JSON.parse(tableInfo.whiteCards).length,
                turn: tableInfo.turn,
                users: some,
              };
              return guessResult;
            }

            userInfo.forEach((el) => {
              const gameInfo = infoV2(el);

              if (!el.needToBeDeleted) {
                io.to(el.sids).emit(eventName.GAMEOVER, endingInfo, gameInfo);
              }
            });

            userInfoV2.map(async (user) => {
              if (user.needToBeDeleted === 1) {
                await Player.destroy({
                  where: { userId: user.userId, [Op.and]: [{ roomId }] },
                });
              }
            });
          }
        } else {
          await Player.destroy({ where: { userId } });

          userInfo = await Player.findAll({
            where: { roomId },
            attributes: [
              'userId',
              'userName',
              'gameOver',
              'hand',
              'sids',
              'needToBeDeleted',
              'userProfileImg',
            ],
            raw: true,
          });

          function info(temp) {
            const gameInfo = userInfo.map((el) => {
              return {
                userId: el.userId,
                userName: el.userName,
                userProfileImg: el.userProfileImg,
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
              blackCards: JSON.parse(table.blackCards).length,
              whiteCards: JSON.parse(table.whiteCards).length,
              turn: table.turn,
              users: gameInfo,
            };
            return cardResult;
          }

          const room = await Room.findOne({ where: { roomId } });
          if (room) {
            let roomInfo = {
              maxMembers: room.maxMembers,
              members: userInfo.length,
              isPlaying: room.isPlaying,
              secret: room.password ? true : false,
              roomId: room.roomId,
              roomName: room.roomName,
            };

            userInfo.forEach((el) => {
              if (!el.needToBeDeleted) {
                const result = info(el);
                io.to(el.sids).emit(eventName.LEAVE_USER, result, roomInfo);
              }
            });
          }
        }
      });

      socket.on(eventName.OPEN_MINE, async (index) => {
        const userId = socket.data.userId;
        const roomId = socket.data.roomId;

        let user = await Player.findOne({ where: { userId } });

        let userHand = JSON.parse(user.hand);
        userHand[index].isOpen = true;

        if (userHand.filter((card) => card.isOpen === false).length) {
          await Player.update(
            { hand: JSON.stringify(userHand) },
            { where: { userId } }
          );
        } else {
          await Player.update(
            { gameOver: true, hand: JSON.stringify(userHand) },
            { where: { userId } }
          );
        }

        let player = await Player.findAll({ where: { roomId } });
        const table = await Table.findOne({ where: { roomId } });

        let nextTurn = table.turn;
        let turns = JSON.parse(table.users);

        let turnIndex = 0;

        for (let i = 0; i < turns.length; i++) {
          if (turns[i].userId === nextTurn) {
            turnIndex = i;
            break;
          }
        }

        let flag = 0;

        for (let i = 1; i < turns.length + 1; i++) {
          for (let j = 0; j < player.length; j++) {
            if (
              turns[(turnIndex + i) % turns.length].userId ==
                player[j].userId &&
              !player[j].gameOver
            ) {
              nextTurn = player[j].userId;
              flag = 1;
              break;
            }
          }
          if (flag) {
            break;
          }
        }
        await Table.update({ turn: nextTurn }, { where: { roomId } });
        table.turn = nextTurn;

        let tableInfo = table;

        let userInfo = player;

        function infoV2(temp) {
          const some = userInfo
            .filter((el) => el !== undefined)
            .map((el) => {
              return {
                userId: el.userId,
                userName: el.userName,
                userProfileImg: el.userProfileImg,
                isReady: el.isReady,
                gameOver: el.gameOver ? true : false,
                hand: JSON.parse(el.hand).map((card) => {
                  if (card == '[]') {
                    return card;
                  } else if (el.userId === temp.userId) {
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

        userInfo.forEach((el) => {
          const gameInfo = infoV2(el);
          if (!el.needToBeDeleted)
            io.to(el.sids).emit(eventName.DRAW_RESULT, gameInfo);
        });
      });
    } catch (err) {
      console.error(err);

      if (err instanceof CustomError) {
        io.to(socket.id).emit(eventName.ERROR, err);
      } else {
        const newError = new CustomError(
          '알 수 없는 오류가 발생했습니다.',
          999
        );

        io.to(socket.id).emit(eventName.ERROR, newError);
      }

      socket.disconnect(true);
    }
  });

  httpServer.listen(process.env.PORT, () => {
    console.log('Server is Listening');
  });
}

start();
