const favoritePlaceService = require("../services/favoriteService");

console.log("FavoriteController carregado");

const FavoriteController = {
  // 📥 Buscar todos os favoritos de um usuário
  async getUserFavorites(req, res) {
    console.log("GET /api/favorites/user/:userId chamado");
    const { userId } = req.params;

    try {
      const favorites = await favoritePlaceService.getUserFavorites(userId);
      
      console.log(`Favoritos encontrados: ${favorites.length} para usuario ${userId}`);
      res.json({ success: true, favorites });
    } catch (error) {
      console.error("Erro ao buscar favoritos:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar favoritos" 
      });
    }
  },

  // 🔍 Verificar se um local está favoritado
  async checkFavorite(req, res) {
    console.log("GET /api/favorites/:userId/:placeId chamado");
    const { userId, placeId } = req.params;

    try {
      const isFavorite = await favoritePlaceService.checkFavorite(userId, placeId);
      
      console.log(`Favorito verificado: usuario ${userId}, local ${placeId} -> ${isFavorite}`);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Erro ao verificar favorito:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao verificar favorito" 
      });
    }
  },

  // ⭐ Adicionar favorito
  async addFavorite(req, res) {
    console.log("POST /api/favorites chamado");
    const { userId, placeId } = req.body;

    try {
      const favorite = await favoritePlaceService.addFavorite(userId, placeId);
      
      console.log(`Favorito adicionado: usuario ${userId}, local ${placeId}`);

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
      console.error("Erro ao favoritar:", error);

      if (error.message === "Ja esta favoritado") {
        return res.status(400).json({ 
          success: false, 
          message: "Ja esta favoritado" 
        });
      }

      res.status(500).json({ 
        success: false, 
        message: "Erro ao favoritar" 
      });
    }
  },

  // 💔 Remover favorito
  async removeFavorite(req, res) {
    console.log("DELETE /api/favorites chamado");
    const { userId, placeId } = req.body;

    try {
      const result = await favoritePlaceService.removeFavorite(userId, placeId);
      
      console.log(`Favorito removido: usuario ${userId}, local ${placeId}`);

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
      console.error("Erro ao desfavoritar:", error);
      
      if (error.message === "Favorito nao encontrado") {
        return res.status(404).json({ 
          success: false, 
          message: "Favorito nao encontrado" 
        });
      }

      res.status(500).json({ 
        success: false, 
        message: "Erro ao desfavoritar" 
      });
    }
  },

  // 🗑️ Limpar todos os favoritos de um usuário
  async clearUserFavorites(req, res) {
    console.log("DELETE /api/favorites/user/:userId chamado");
    const { userId } = req.params;

    try {
      const result = await favoritePlaceService.clearUserFavorites(userId);
      
      console.log(`${result} favoritos removidos para usuario ${userId}`);

      res.json({ 
        success: true, 
        message: `Todos os favoritos (${result}) foram removidos!`,
        clearedCount: result
      });
    } catch (error) {
      console.error("Erro ao limpar favoritos:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao limpar favoritos" 
      });
    }
  },

  // 📊 Estatísticas de favoritos
  async getFavoriteStats(req, res) {
    console.log("GET /api/favorites/stats/:userId chamado");
    const { userId } = req.params;

    try {
      const stats = await favoritePlaceService.getFavoriteStats(userId);
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error("Erro ao buscar estatisticas de favoritos:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar estatisticas" 
      });
    }
  }
};

module.exports = FavoriteController;