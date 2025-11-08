const Favorite = require("../models/FavoriteModel");
const Place = require("../models/Place");

console.log("✅ FavoriteController carregado, modelo Favorite:", !!Favorite);

const FavoriteController = {
  // ===============================
  // 📥 Buscar todos os favoritos de um usuário
  // ===============================
  async getUserFavorites(req, res) {
    console.log("📥 GET /api/favorites/user/:userId chamado");
    const { userId } = req.params;

    try {
      const favorites = await Favorite.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Place,
            as: "place", // Deve bater com associations.js
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

      res.json({ success: true, favorites });
    } catch (error) {
      console.error("❌ Erro ao buscar favoritos:", error);
      res
        .status(500)
        .json({ success: false, message: "Erro ao buscar favoritos" });
    }
  },

  // ===============================
  // 🔍 Verificar se um local está favoritado
  // ===============================
  async checkFavorite(req, res) {
    console.log("📥 GET /api/favorites/:userId/:placeId chamado");
    const { userId, placeId } = req.params;

    try {
      const favorite = await Favorite.findOne({
        where: {
          user_id: userId,
          place_id: placeId,
        },
      });

      res.json({ isFavorite: !!favorite });
    } catch (error) {
      console.error("❌ Erro ao verificar favorito:", error);
      res
        .status(500)
        .json({ success: false, message: "Erro ao verificar favorito" });
    }
  },

  // ===============================
  // ⭐ Adicionar favorito
  // ===============================
  async addFavorite(req, res) {
    console.log("📥 POST /api/favorites chamado");
    const { userId, placeId } = req.body;

    try {
      // Verifica se já existe
      const existingFavorite = await Favorite.findOne({
        where: { user_id: userId, place_id: placeId },
      });

      if (existingFavorite) {
        return res
          .status(400)
          .json({ success: false, message: "Já está favoritado" });
      }

      await Favorite.create({
        user_id: userId,
        place_id: placeId,
      });

      res.json({ success: true, message: "Favorito adicionado!" });
    } catch (error) {
      console.error("❌ Erro ao favoritar:", error);

      if (error.name === "SequelizeUniqueConstraintError") {
        return res
          .status(400)
          .json({ success: false, message: "Já está favoritado" });
      }

      res.status(500).json({ success: false, message: "Erro ao favoritar" });
    }
  },

  // ===============================
  // 💔 Remover favorito
  // ===============================
  async removeFavorite(req, res) {
    console.log("📥 DELETE /api/favorites chamado");
    const { userId, placeId } = req.body;

    try {
      const result = await Favorite.destroy({
        where: {
          user_id: userId,
          place_id: placeId,
        },
      });

      if (result === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Favorito não encontrado" });
      }

      res.json({ success: true, message: "Favorito removido!" });
    } catch (error) {
      console.error("❌ Erro ao desfavoritar:", error);
      res.status(500).json({ success: false, message: "Erro ao desfavoritar" });
    }
  },
};

module.exports = FavoriteController;
