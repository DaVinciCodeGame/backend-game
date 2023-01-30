'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      this.belongsTo(models.Table, { foreignKey: 'roomId' });
      this.hasMany(models.Player, { foreignKey: 'roomId' });
    }
  }

  Room.init(
    {
      roomId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        //autoIncrement: true,
      },
      turn: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      top: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'Room',
      tableName: 'Room',
    }
  );

  return Room;
};
