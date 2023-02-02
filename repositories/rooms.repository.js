const { Room, Table } = require('../models');
const { Op } = require('sequelize');

module.exports = class RoomsRepository {
  /**
   *
   * @param {number} roomId
   * @param {string} roomName
   * @param {number} maxMembers
   * @param {string | undefined} password
   * @returns {Promise<{
   *    roomId: number,
   *    roomName: string,
   *    maxMembers: number,
   *    isPlaying: boolean,
   *    createdAt: Date,
   *    password: string,
   *    Table: undefined,
   *  }>}
   */
  create = (roomId, roomName, maxMembers, password) => {
    const room = Room.create({
      roomId,
      roomName,
      maxMembers,
      password,
    });

    return room;
  };

  /**
   *
   * @param {number} roomId
   * @returns {Promise<{
   *    roomId: number,
   *    roomName: string,
   *    maxMembers: number,
   *    isPlaying: boolean,
   *    createdAt: Date,
   *    password: string,
   *    Table: {
   *      tableId: number,
   *      blackCards: string,
   *      whiteCards: string,
   *      users: string,
   *      top: string,
   *      turn: number,
   *    } | undefined
   *  } | undefined>}
   */
  findOneById = (roomId) => {
    return Room.findOne({
      where: { roomId },
      include: Table,
    });
  };

  /**
   *
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{
   *    count: number,
   *    rows: {
   *      roomId: number,
   *      roomName: string,
   *      maxMembers: number,
   *      isPlaying: boolean,
   *      createdAt: Date,
   *      password: string,
   *      Table: {
   *        tableId: number,
   *        blackCards: string,
   *        whiteCards: string,
   *        users: string,
   *        top: string,
   *        turn: number,
   *      } | undefined,
   *    }[]
   *  }>}
   */
  findAndCountPagedList = (page, limit) => {
    const offset = (page - 1) * limit;

    return Room.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: Table,
    });
  };

  /**
   *
   * @param {number} page
   * @param {number} limit
   * @param {string} search
   * @returns {Promise<{
   *    count: number,
   *    rows: {
   *      roomId: number,
   *      roomName: string,
   *      maxMembers: number,
   *      isPlaying: boolean,
   *      createdAt: Date,
   *      password: string,
   *      Table: {
   *        tableId: number,
   *        blackCards: string,
   *        whiteCards: string,
   *        users: string,
   *        top: string,
   *        turn: number,
   *      } | undefined,
   *    }[]
   *  }>}
   */
  findAndCountPagedListFilteredByName = (page, limit, search) => {
    const offset = (page - 1) * limit;

    return Room.findAndCountAll({
      where: {
        roomName: {
          [Op.like]: `%${search}%`,
        },
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: Table,
    });
  };

  /**
   *
   * @param {number} page
   * @param {number} limit
   * @param {string} search
   * @returns {Promise<{
   *    count: number,
   *    rows: {
   *      roomId: number,
   *      roomName: string,
   *      maxMembers: number,
   *      isPlaying: boolean,
   *      createdAt: Date,
   *      password: string,
   *      Table: {
   *        tableId: number,
   *        blackCards: string,
   *        whiteCards: string,
   *        users: string,
   *        top: string,
   *        turn: number,
   *      } | undefined,
   *    }[]
   *  }>}
   */
  findAndCountPagedListFilteredById = (page, limit, search) => {
    const offset = (page - 1) * limit;

    return Room.findAndCountAll({
      where: {
        roomId: {
          [Op.like]: `%${search}%`,
        },
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: Table,
    });
  };

  /**
   *
   * @returns {Promise<{
   *    roomId: number,
   *    roomName: string,
   *    maxMembers: number,
   *    isPlaying: boolean,
   *    createdAt: Date,
   *    password: string,
   *    Table: {
   *      tableId: number,
   *      blackCards: string,
   *      whiteCards: string,
   *      users: string,
   *      top: string,
   *      turn: number,
   *    } | undefined
   * }[]>}
   */
  findAllForQuickStart = () => {
    return Room.findAll({
      where: {
        password: null,
        isPlaying: false,
      },
      include: Table,
    });
  };
};
