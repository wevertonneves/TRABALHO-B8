const Favorite = require("../models/FavoriteModel");
const Place = require("../models/Place");
const cacheService = require("./cacheService");
const eventPublisher = require("../shared/messaging/eventPublisher");

class FavoritePlaceService {
  constructor() {
    this.cacheTTL = 1800; // 30 minutos
  }

  // 📥 Buscar todos os favoritos de um usuário
  async getUserFavorites(userId) {
    const cacheKey = `user:favorites:${userId}`;
    
    // Tenta buscar do cache primeiro
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const favorites = await Favorite.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Place,
          as: "place",
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

    // Salva no cache
    await cacheService.set(cacheKey, favorites, this.cacheTTL);
    
    return favorites;
  }

  // 🔍 Verificar se um local está favoritado
  async checkFavorite(userId, placeId) {
    const cacheKey = `user:favorite:${userId}:${placeId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const favorite = await Favorite.findOne({
      where: { user_id: userId, place_id: placeId },
    });

    const isFavorite = !!favorite;
    
    // Cache de verificação (TTL menor)
    await cacheService.set(cacheKey, isFavorite, 600); // 10 minutos
    
    return isFavorite;
  }

  // ⭐ Adicionar favorito
  async addFavorite(userId, placeId) {
    // Verifica se já existe
    const existingFavorite = await Favorite.findOne({
      where: { user_id: userId, place_id: placeId },
    });

    if (existingFavorite) {
      throw new Error("Já está favoritado");
    }

    // Cria o favorito
    const favorite = await Favorite.create({
      user_id: userId,
      place_id: placeId,
    });

    // Invalida caches relacionados
    await this.invalidateUserFavoritesCache(userId);
    await cacheService.delete(`user:favorite:${userId}:${placeId}`);

    // Publica evento
    try {
      await eventPublisher.favoriteAdded(userId, placeId, {
        favoriteId: favorite.id,
        addedAt: favorite.created_at
      });
    } catch (eventError) {
      console.error("Erro ao publicar evento FAVORITE_ADDED:", eventError);
    }

    return favorite;
  }

  // 💔 Remover favorito
  async removeFavorite(userId, placeId) {
    const favorite = await Favorite.findOne({
      where: { user_id: userId, place_id: placeId },
    });

    if (!favorite) {
      throw new Error("Favorito não encontrado");
    }

    await favorite.destroy();

    // Invalida caches relacionados
    await this.invalidateUserFavoritesCache(userId);
    await cacheService.delete(`user:favorite:${userId}:${placeId}`);

    // Publica evento
    try {
      await eventPublisher.favoriteRemoved(userId, placeId);
    } catch (eventError) {
      console.error("Erro ao publicar evento FAVORITE_REMOVED:", eventError);
    }

    return { userId, placeId };
  }

  // 🗑️ Limpar todos os favoritos de um usuário
  async clearUserFavorites(userId) {
    const userFavorites = await Favorite.findAll({
      where: { user_id: userId }
    });

    const result = await Favorite.destroy({
      where: { user_id: userId },
    });

    // Invalida todos os caches do usuário
    await this.invalidateAllUserFavoritesCache(userId);

    // Publica evento se houve favoritos removidos
    if (result > 0) {
      try {
        await eventPublisher.favoritesCleared(userId);
      } catch (eventError) {
        console.error("Erro ao publicar evento FAVORITES_CLEARED:", eventError);
      }
    }

    return result;
  }

  // 📊 Estatísticas de favoritos
  async getFavoriteStats(userId) {
    const cacheKey = `user:favorites:stats:${userId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const totalFavorites = await Favorite.count({
      where: { user_id: userId }
    });

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

    const stats = {
      totalFavorites,
      byCategory: categoryCount,
      userId
    };

    // Cache de estatísticas
    await cacheService.set(cacheKey, stats, 3600); // 1 hora
    
    return stats;
  }

  // 🔄 Métodos de invalidação de cache
  async invalidateUserFavoritesCache(userId) {
    await cacheService.delete(`user:favorites:${userId}`);
    await cacheService.delete(`user:favorites:stats:${userId}`);
    await cacheService.deletePattern(`user:favorite:${userId}:*`);
  }

  async invalidateAllUserFavoritesCache(userId) {
    await this.invalidateUserFavoritesCache(userId);
    await cacheService.deletePattern(`user:${userId}:favorites:*`);
  }
}

module.exports = new FavoritePlaceService();