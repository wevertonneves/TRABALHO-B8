const Place = require("../models/Place");
const Reservation = require("../models/Reservation");
const cacheService = require("./cacheService");
const path = require("path");
const fs = require("fs");

class PlaceService {
  constructor() {
    this.cacheTTL = 3600; // 1 hora
  }

  // 📋 Listar todos os locais
  async getAllPlaces() {
    const cacheKey = 'places:all';
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const places = await Place.findAll({ order: [["id", "ASC"]] });
    
    await cacheService.set(cacheKey, places, this.cacheTTL);
    
    return places;
  }

  // 🔍 Buscar um local por ID
  async getPlaceById(id) {
    const cacheKey = `place:${id}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const place = await Place.findByPk(id);
    if (!place) {
      throw new Error("Local não encontrado");
    }

    await cacheService.set(cacheKey, place, this.cacheTTL);
    
    return place;
  }

  // ➕ Criar novo local
  async createPlace(placeData) {
    const { name, location, description, category, image, latitude, longitude, capacity } = placeData;

    if (!name || !location) {
      throw new Error("Nome e localização são obrigatórios");
    }

    const newPlace = await Place.create({
      name,
      location,
      description: description || null,
      category: category || "Bar",
      image: image || null,
      latitude: latitude || null,
      longitude: longitude || null,
      capacity: capacity || 10,
    });

    // Invalida cache de lista
    await cacheService.delete('places:all');
    await cacheService.deletePattern('places:*');

    return newPlace;
  }

  // ✏️ Atualizar local
  async updatePlace(id, updateData) {
    const place = await Place.findByPk(id);
    if (!place) {
      throw new Error("Local não encontrado");
    }

    const { image, ...otherData } = updateData;

    // Deleta imagem antiga se houver uma nova
    if (image && place.image && place.image !== image) {
      const oldFilename = path.basename(place.image);
      const oldFilePath = path.join(__dirname, "../uploads", oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    await place.update({
      ...otherData,
      image: image ?? place.image,
    });

    const updatedPlace = await Place.findByPk(id);

    // Invalida caches
    await cacheService.delete(`place:${id}`);
    await cacheService.delete('places:all');

    return updatedPlace;
  }

  // 🗑️ Deletar local
  async deletePlace(id) {
    const place = await Place.findByPk(id);
    if (!place) {
      throw new Error("Local não encontrado");
    }

    if (place.image) {
      const filename = path.basename(place.image);
      const filePath = path.join(__dirname, "../uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await place.destroy();

    // Invalida todos os caches relacionados
    await this.invalidatePlaceCaches(id);

    return { message: "Local deletado com sucesso" };
  }

  // 📊 Capacidade disponível considerando reservas
  async getAvailableCapacity(placeId, reservedAt = null) {
    const dateKey = reservedAt ? reservedAt.split("T")[0] : 'all';
    const cacheKey = `place:capacity:${placeId}:${dateKey}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const place = await Place.findByPk(placeId);
    if (!place) {
      throw new Error("Local não encontrado");
    }

    const capacityTotal = place.capacity;
    const reserved = await Reservation.countByPlaceAndDate(placeId, reservedAt);
    const available = capacityTotal - reserved;

    const result = {
      placeId,
      capacity: capacityTotal,
      reserved,
      available: available > 0 ? available : 0,
    };

    // Cache de capacidade (TTL menor - 5 minutos)
    await cacheService.set(cacheKey, result, 300);
    
    return result;
  }

  // 🧩 Reduzir capacidade ao fazer reserva
  async reduceCapacity(placeId) {
    const place = await Place.findByPk(placeId);
    if (!place) throw new Error("Local não encontrado");

    if (place.capacity <= 0) {
      throw new Error("Capacidade esgotada");
    }

    place.capacity -= 1;
    await place.save();

    // Invalida caches de capacidade
    await cacheService.deletePattern(`place:capacity:${placeId}:*`);
    await cacheService.delete(`place:${placeId}`);

    return place.capacity;
  }

  // 🔄 Métodos de invalidação de cache
  async invalidatePlaceCaches(placeId) {
    await cacheService.delete(`place:${placeId}`);
    await cacheService.deletePattern(`place:capacity:${placeId}:*`);
    await cacheService.delete('places:all');
    await cacheService.deletePattern('reservations:place:*');
  }

  // 🗂️ Buscar locais por categoria
  async getPlacesByCategory(category) {
    const cacheKey = `places:category:${category}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const places = await Place.findAll({
      where: { category },
      order: [["name", "ASC"]]
    });

    await cacheService.set(cacheKey, places, this.cacheTTL);
    
    return places;
  }
}

module.exports = new PlaceService();