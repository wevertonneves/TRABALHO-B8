const Reservation = require("../models/Reservation");
const Place = require("../models/Place");
const cacheService = require("./cacheService");
const eventPublisher = require("../shared/messaging/eventPublisher");
const { Sequelize } = require("sequelize");

class ReservationService {
  constructor() {
    this.cacheTTL = 1800; // 30 minutos
  }

  // ➕ Criar reserva validando capacidade
  async createReservation(reservationData) {
    const { placeId, reservedAt, peopleCount = 1, userId } = reservationData;

    if (!userId) {
      throw new Error("Usuário não autenticado");
    }

    if (!placeId || !reservedAt) {
      throw new Error("placeId e reservedAt são obrigatórios");
    }

    const numericUserId = parseInt(userId);
    const numericPlaceId = parseInt(placeId);

    if (isNaN(numericUserId)) {
      throw new Error("ID do usuário inválido");
    }

    // Verifica disponibilidade
    const availability = await Reservation.checkAvailability(numericPlaceId, reservedAt);
    if (availability.available <= 0) {
      throw new Error("Não há vagas disponíveis para esta data");
    }

    // Diminui a capacidade do lugar
    const place = await Place.findByPk(numericPlaceId);
    if (!place) {
      throw new Error("Local não encontrado");
    }

    if (place.capacity > 0) {
      place.capacity -= 1;
      await place.save();
    } else {
      throw new Error("Capacidade esgotada");
    }

    // Cria a reserva
    const newReservation = await Reservation.create({
      userId: numericUserId,
      placeId: numericPlaceId,
      reservedAt,
      peopleCount,
    });

    // Invalida caches
    await this.invalidateReservationCaches(numericUserId, numericPlaceId, reservedAt);

    // Publica evento
    try {
      await eventPublisher.reservationCreated(newReservation);
    } catch (eventError) {
      console.error("Erro ao publicar evento RESERVATION_CREATED:", eventError);
    }

    // Recalcula disponibilidade atualizada
    const newAvailability = await Reservation.checkAvailability(numericPlaceId, reservedAt);

    return {
      reservation: newReservation,
      availability: newAvailability,
      newCapacity: place.capacity
    };
  }

  // ❌ Cancelar reserva e restaurar capacidade
  async cancelReservation(reservationId) {
    const numericId = parseInt(reservationId);
    
    if (isNaN(numericId)) {
      throw new Error("ID da reserva inválido");
    }

    const reservation = await Reservation.findByPk(numericId);
    if (!reservation) {
      throw new Error("Reserva não encontrada");
    }

    const placeId = reservation.placeId;
    const userId = reservation.userId;
    const reservedAt = reservation.reservedAt;

    // Restaura a capacidade
    const place = await Place.findByPk(placeId);
    if (place) {
      place.capacity += 1;
      await place.save();
    }

    // Publica evento antes de deletar
    try {
      await eventPublisher.reservationCancelled(numericId, "Cancelado pelo usuário");
    } catch (eventError) {
      console.error("Erro ao publicar evento RESERVATION_CANCELLED:", eventError);
    }

    // Deleta a reserva
    await reservation.destroy();

    // Invalida caches
    await this.invalidateReservationCaches(userId, placeId, reservedAt);

    return {
      restoredCapacity: place ? place.capacity : null,
      reservationId: numericId
    };
  }

  // 📋 Listar todas as reservas
  async getAllReservations() {
    const cacheKey = 'reservations:all';
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const reservations = await Reservation.findAllWithPlace();
    
    await cacheService.set(cacheKey, reservations, this.cacheTTL);
    
    return reservations;
  }

  // 👤 Listar reservas por usuário
  async getReservationsByUser(userId) {
    const numericUserId = parseInt(userId);
    
    if (isNaN(numericUserId)) {
      throw new Error("ID do usuário inválido");
    }

    const cacheKey = `reservations:user:${numericUserId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const reservations = await Reservation.findByUserWithPlace(numericUserId);
    
    await cacheService.set(cacheKey, reservations, this.cacheTTL);
    
    return reservations;
  }

  // 📊 Consultar vagas disponíveis
  async getAvailableSpots(placeId, reservedAt) {
    const cacheKey = `availability:${placeId}:${reservedAt}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const numericPlaceId = parseInt(placeId);
    
    if (isNaN(numericPlaceId)) {
      throw new Error("ID do local inválido");
    }

    const availability = await Reservation.checkAvailability(numericPlaceId, reservedAt);
    
    // Cache de disponibilidade (TTL menor - 2 minutos)
    await cacheService.set(cacheKey, availability, 120);
    
    return availability;
  }

  // 🏠 Listar reservas por local
  async getReservationsByPlace(placeId) {
    const numericPlaceId = parseInt(placeId);
    
    if (isNaN(numericPlaceId)) {
      throw new Error("ID do local inválido");
    }

    const cacheKey = `reservations:place:${numericPlaceId}`;
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const reservations = await Reservation.findByPlace(numericPlaceId);
    
    await cacheService.set(cacheKey, reservations, this.cacheTTL);
    
    return reservations;
  }

  // 📈 Estatísticas de reservas
  async getReservationStats() {
    const cacheKey = 'reservations:stats';
    
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const totalReservations = await Reservation.count();
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = await Reservation.count({
      where: {
        reservedAt: {
          [Sequelize.Op.gte]: today
        }
      }
    });

    const stats = {
      totalReservations,
      todayReservations,
      updatedAt: new Date().toISOString()
    };

    await cacheService.set(cacheKey, stats, 900); // 15 minutos
    
    return stats;
  }

  // 🔄 Métodos de invalidação de cache (CORRIGIDO)
  async invalidateReservationCaches(userId, placeId, reservedAt) {
    try {
      await cacheService.delete('reservations:all');
      await cacheService.delete('reservations:stats');
      
      if (userId) {
        await cacheService.delete(`reservations:user:${userId}`);
      }
      
      if (placeId) {
        await cacheService.delete(`reservations:place:${placeId}`);
      }
      
      if (placeId && reservedAt) {
        // ✅ CORREÇÃO: Converter Date para string antes do split
        let dateString;
        
        if (typeof reservedAt === 'string') {
          dateString = reservedAt;
        } else if (reservedAt instanceof Date) {
          dateString = reservedAt.toISOString();
        } else {
          console.log('⚠️ Formato de data inválido para cache:', typeof reservedAt);
          return;
        }
        
        const dateKey = dateString.split('T')[0];
        await cacheService.delete(`availability:${placeId}:${reservedAt}`);
        await cacheService.deletePattern(`place:capacity:${placeId}:*`);
      }
    } catch (error) {
      console.error('❌ Erro ao invalidar caches de reserva:', error.message);
      // Não falhar a operação principal por causa do cache
    }
  }
}

module.exports = new ReservationService();