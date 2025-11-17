const User = require("./User");
const Place = require("./Place");
const Reservation = require("./Reservation");
const Favorite = require("./FavoriteModel");

function setupAssociations() {
  try {
    console.log("🔄 Configurando associações...");

    // ✅ User -> Reservation (MANTIDO como está - funcionando)
    User.hasMany(Reservation, {
      foreignKey: "userId",
      as: "reservations",
      constraints: false,
    });

    Reservation.belongsTo(User, {
      foreignKey: "userId",
      as: "user",
      constraints: false,
    });

    // ✅ User -> Favorite (CORRIGIDO: user_id)
    User.hasMany(Favorite, {
      foreignKey: "user_id", // ✅ CORRIGIDO: user_id
      as: "favorites",
      constraints: false,
    });

    Favorite.belongsTo(User, {
      foreignKey: "user_id", // ✅ CORRIGIDO: user_id
      as: "user",
      constraints: false,
    });

    // ✅ Place -> Reservation (MANTIDO como está - funcionando)
    Place.hasMany(Reservation, {
      foreignKey: "placeId",
      as: "reservations",
    });

    Reservation.belongsTo(Place, {
      foreignKey: "placeId",
      as: "place",
    });

    // ✅ Place -> Favorite (CORRIGIDO: place_id)
    Place.hasMany(Favorite, {
      foreignKey: "place_id", // ✅ CORRIGIDO: place_id
      as: "favorites",
    });

    Favorite.belongsTo(Place, {
      foreignKey: "place_id", // ✅ CORRIGIDO: place_id
      as: "place",
    });

    console.log("✅ Associações configuradas com sucesso");
  } catch (error) {
    console.error("❌ Erro ao configurar associações:", error);
    throw error;
  }
}

module.exports = setupAssociations;
