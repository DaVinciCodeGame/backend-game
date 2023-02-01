'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Player extends Model {
    static associate(models) {
      this.belongsTo(models.Room, { foreignKey: 'roomId' });
    }
  }

  Player.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        //primaryKey: true,
        allowNull: false,
      },
      // roomId: {
      //   type: DataTypes.INTEGER,
      // },
      sids: {
        type: DataTypes.STRING,
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isReady: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      gameOver: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      hand: {
        type: DataTypes.TEXT,
      },
      userProfileImg: {
        type: DataTypes.STRING,
      },
      security: {
        type: DataTypes.STRING,
      },
      score: {
        type: DataTypes.INTEGER,
      },
      needToBeDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Player',
      tableName: 'Player',
      onDelete: 'CASCADE',
    }
  );

  return Player;
};
