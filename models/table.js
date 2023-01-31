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
      blackCards: {
        type: DataTypes.STRING,
      },
      whiteCards: {
        type: DataTypes.STRING,
      },
      users: {
        type: DataTypes.STRING,
      },
      top: {
        type: DataTypes.STRING,
      },
      turn: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Table',
      tableName: 'Table',
      onDelete: 'CASCADE',
    }
  );

  return Table;
};
