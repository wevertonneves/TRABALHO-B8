// models/Place.js
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Place extends Model {}

// Inicialização do modelo
Place.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Nome é obrigatório." },
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Localização é obrigatória." },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: "Bar",
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      validate: {
        min: {
          args: [1],
          msg: "Capacidade deve ser pelo menos 1.",
        },
      },
    },
  },
  {
    sequelize,
    modelName: "Place",
    tableName: "places",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Place;
