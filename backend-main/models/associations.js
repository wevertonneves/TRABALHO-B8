const Place = require("./Place");
const Reservation = require("./Reservation");
const Favorite = require("./FavoriteModel");

function setupAssociations() {
  try {
    console.log("🔄 Configurando associações LOCAIS...");

    // ✅ REMOVER todas as associações com User
    // (pois User está em outro microserviço)

    // ✅ Place -> Reservation (MANTIDO - associação local)
    Place.hasMany(Reservation, {
      foreignKey: "placeId",
      as: "reservations",
    });

    Reservation.belongsTo(Place, {
      foreignKey: "placeId",
      as: "place",
    });

    // ✅ Place -> Favorite (MANTIDO - associação local)
    Place.hasMany(Favorite, {
      foreignKey: "place_id",
      as: "favorites",
    });

    Favorite.belongsTo(Place, {
      foreignKey: "place_id",
      as: "place",
    });



    console.log("✅ Associações LOCAIS configuradas com sucesso");
  } catch (error) {
    console.error("❌ Erro ao configurar associações:", error);
    throw error;
  }
}

module.exports = setupAssociations;
