// models/FavoriteModel.js
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Favorite extends Model {}

Favorite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "favorites",
    modelName: "Favorite",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "place_id"],
      },
    ],
  }
);

// Métodos estáticos para compatibilidade
Favorite.getAllByUser = async function (userId) {
  const Place = require("./Place");
  return await this.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Place,
        as: "place", // ← ADICIONADO 'as' se você fizer include de Place
        attributes: [
          "id",
          "name",
          "location",
          "description",
          "category",
          "image",
          "capacity",
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

Favorite.isFavorite = async function (userId, placeId) {
  const favorite = await this.findOne({
    where: { user_id: userId, place_id: placeId },
  });
  return !!favorite;
};

Favorite.addFavorite = async function (userId, placeId) {
  const [favorite, created] = await this.findOrCreate({
    where: { user_id: userId, place_id: placeId },
    defaults: { user_id: userId, place_id: placeId },
  });

  if (!created) {
    const error = new Error("Já está favoritado");
    error.code = "ER_DUP_ENTRY";
    throw error;
  }

  return favorite;
};

Favorite.removeFavorite = async function (userId, placeId) {
  const result = await this.destroy({
    where: { user_id: userId, place_id: placeId },
  });

  if (result === 0) {
    throw new Error("Favorito não encontrado");
  }

  return result;
};

module.exports = Favorite;
