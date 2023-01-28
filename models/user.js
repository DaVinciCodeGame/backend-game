'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.belongsTo(models.Room, { foreignKey: 'roomId' });
    }
  }

  User.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      roomId: {
        type: DataTypes.INTEGER,
      },
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
        type: DataTypes.STRING,
      },
      userProfileImg: {
        type: DataTypes.STRING,
      },
      security: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  );

  return User;
};
