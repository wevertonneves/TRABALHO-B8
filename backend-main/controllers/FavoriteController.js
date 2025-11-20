const Favorite = require("../models/FavoriteModel");
const Place = require("../models/Place");
const eventPublisher = require("../shared/messaging/eventPublisher");

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

      console.log(`✅ Favoritos encontrados: ${favorites.length} para usuário ${userId}`);
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

      console.log(`🔍 Favorito verificado: usuário ${userId}, local ${placeId} -> ${!!favorite}`);
      res.json({ isFavorite: !!favorite });
    } catch (error) {
      console.error("❌ Erro ao verificar favorito:", error);
      res
        .status(500)
        .json({ success: false, message: "Erro ao verificar favorito" });
    }
  },

  // ===============================
  // ⭐ Adicionar favorito COM EVENTO
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
        console.log(`⚠️ Tentativa de adicionar favorito duplicado: usuário ${userId}, local ${placeId}`);
        return res
          .status(400)
          .json({ success: false, message: "Já está favoritado" });
      }

      // Cria o favorito
      const favorite = await Favorite.create({
        user_id: userId,
        place_id: placeId,
      });

      console.log(`✅ Favorito adicionado: usuário ${userId}, local ${placeId}`);

      // ✅ PUBLICAR EVENTO DE FAVORITO ADICIONADO
      try {
        await eventPublisher.favoriteAdded(userId, placeId, {
          favoriteId: favorite.id,
          addedAt: favorite.created_at
        });
        console.log(`📤 Evento FAVORITE_ADDED publicado: usuário ${userId}, local ${placeId}`);
      } catch (eventError) {
        console.error("❌ Erro ao publicar evento FAVORITE_ADDED:", eventError);
        // Não falha a operação se o evento falhar
      }

      res.json({ 
        success: true, 
        message: "Favorito adicionado!",
        favorite: {
          id: favorite.id,
          user_id: favorite.user_id,
          place_id: favorite.place_id,
          created_at: favorite.created_at
        }
      });
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
  // 💔 Remover favorito COM EVENTO
  // ===============================
  async removeFavorite(req, res) {
    console.log("📥 DELETE /api/favorites chamado");
    const { userId, placeId } = req.body;

    try {
      // Busca o favorito antes de remover (para logging)
      const favorite = await Favorite.findOne({
        where: {
          user_id: userId,
          place_id: placeId,
        },
      });

      if (!favorite) {
        console.log(`⚠️ Tentativa de remover favorito inexistente: usuário ${userId}, local ${placeId}`);
        return res
          .status(404)
          .json({ success: false, message: "Favorito não encontrado" });
      }

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

      console.log(`✅ Favorito removido: usuário ${userId}, local ${placeId}`);

      // ✅ PUBLICAR EVENTO DE FAVORITO REMOVIDO
      try {
        await eventPublisher.favoriteRemoved(userId, placeId);
        console.log(`📤 Evento FAVORITE_REMOVED publicado: usuário ${userId}, local ${placeId}`);
      } catch (eventError) {
        console.error("❌ Erro ao publicar evento FAVORITE_REMOVED:", eventError);
        // Não falha a operação se o evento falhar
      }

      res.json({ 
        success: true, 
        message: "Favorito removido!",
        removed: {
          userId,
          placeId,
          removedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("❌ Erro ao desfavoritar:", error);
      res.status(500).json({ success: false, message: "Erro ao desfavoritar" });
    }
  },

  // ===============================
  // 🗑️ Limpar todos os favoritos de um usuário COM EVENTO
  // ===============================
  async clearUserFavorites(req, res) {
    console.log("📥 DELETE /api/favorites/user/:userId chamado");
    const { userId } = req.params;

    try {
      // Busca os favoritos antes de remover (para logging)
      const userFavorites = await Favorite.findAll({
        where: { user_id: userId }
      });

      const result = await Favorite.destroy({
        where: { user_id: userId },
      });

      console.log(`✅ ${result} favoritos removidos para usuário ${userId}`);

      // ✅ PUBLICAR EVENTO DE FAVORITOS LIMPOS
      if (result > 0) {
        try {
          await eventPublisher.favoritesCleared(userId);
          console.log(`📤 Evento FAVORITES_CLEARED publicado: usuário ${userId}`);
        } catch (eventError) {
          console.error("❌ Erro ao publicar evento FAVORITES_CLEARED:", eventError);
        }
      }

      res.json({ 
        success: true, 
        message: `Todos os favoritos (${result}) foram removidos!`,
        clearedCount: result
      });
    } catch (error) {
      console.error("❌ Erro ao limpar favoritos:", error);
      res.status(500).json({ success: false, message: "Erro ao limpar favoritos" });
    }
  },

  // ===============================
  // 📊 Estatísticas de favoritos
  // ===============================
  async getFavoriteStats(req, res) {
    console.log("📥 GET /api/favorites/stats/:userId chamado");
    const { userId } = req.params;

    try {
      const totalFavorites = await Favorite.count({
        where: { user_id: userId }
      });

      // Favoritos por categoria
      const favoritesByCategory = await Favorite.findAll({
        where: { user_id: userId },
        include: [{
          model: Place,
          as: "place",
          attributes: ["category"]
        }],
        raw: true
      });

      const categoryCount = {};
      favoritesByCategory.forEach(fav => {
        const category = fav['place.category'] || 'Outros';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      res.json({
        success: true,
        stats: {
          totalFavorites,
          byCategory: categoryCount,
          userId
        }
      });
    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas de favoritos:", error);
      res.status(500).json({ success: false, message: "Erro ao buscar estatísticas" });
    }
  }
};

module.exports = FavoriteController;