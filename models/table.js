'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Table extends Model {
    static associate(models) {
      this.belongsTo(models.Room, { foreignKey: 'roomId' });
    }
  }

  Table.init(
    {
      tableId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      roomId: {
        type: DataTypes.INTEGER,
      },
      blackCard: {
        type: DataTypes.STRING,
      },
      whiteCard: {
        type: DataTypes.STRING,
      },
      users: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'Table',
    }
  );

  return Table;
};
