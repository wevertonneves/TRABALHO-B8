// models/associations.js
const Place = require("./Place");
const Reservation = require("./Reservation");
const User = require("./User");
const Favorite = require("./FavoriteModel");

const setupAssociations = () => {
  try {
    // Place <-> Reservation
    Place.hasMany(Reservation, {
      foreignKey: "placeId",
      as: "reservations",
    });

    Reservation.belongsTo(Place, {
      foreignKey: "placeId",
      as: "place", // ← MESMO 'as' usado no include
    });

    // User <-> Reservation
    User.hasMany(Reservation, {
      foreignKey: "userId",
      as: "reservations",
    });

    Reservation.belongsTo(User, {
      foreignKey: "userId",
      as: "user",
    });

    // User <-> Favorite
    User.hasMany(Favorite, {
      foreignKey: "user_id",
      as: "favorites",
    });

    Favorite.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
    });

    // Place <-> Favorite
    Place.hasMany(Favorite, {
      foreignKey: "place_id",
      as: "favorites",
    });

    Favorite.belongsTo(Place, {
      foreignKey: "place_id",
      as: "place", // ← MESMO 'as' usado no include
    });

    console.log("✅ Todas as associações configuradas com sucesso");
  } catch (error) {
    console.error("❌ Erro ao configurar associações:", error);
  }
};

module.exports = setupAssociations;
