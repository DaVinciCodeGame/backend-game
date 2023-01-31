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
      roomId: { type: DataTypes.INTEGER, primaryKey: true },

      roomName: DataTypes.STRING,

      maxMembers: DataTypes.INTEGER,

      isPlaying: { type: DataTypes.BOOLEAN, defaultValue: false },

      password: { type: DataTypes.STRING, allowNull: true },

      createdAt: {
        type: DataTypes.DATE(6),
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP(6)'),
      },
    },
    {
      sequelize,
      modelName: 'Room',
      tableName: 'Room',
      onDelete: 'CASCADE',
    }
  );

  return Room;
};
