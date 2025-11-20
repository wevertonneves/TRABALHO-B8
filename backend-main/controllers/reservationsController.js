const Reservation = require("../models/Reservation");
const Place = require("../models/Place");
const eventPublisher = require("../shared/messaging/eventPublisher");

class ReservationController {
  // ➕ Criar reserva validando capacidade por data E DIMINUINDO CAPACIDADE
  static async createReservation(req, res) {
    try {
      const { placeId, reservedAt, peopleCount = 1 } = req.body;
      
      // ✅ CORREÇÃO: O req.user tem estrutura { success: true, user: { id: 7, ... } }
      let userId;
      
      if (req.user && req.user.user && req.user.user.id) {
        // Estrutura: { success: true, user: { id: 7, ... } }
        userId = req.user.user.id;
      } else if (req.user && req.user.id) {
        // Estrutura direta: { id: 7, ... }
        userId = req.user.id;
      } else {
        // Tenta pegar do body como fallback
        userId = req.body.userId;
      }

      if (!userId) {
        return res.status(400).json({ 
          success: false,
          error: "Usuário não autenticado. Faça login novamente." 
        });
      }

      if (!placeId || !reservedAt) {
        return res.status(400).json({ 
          success: false,
          error: "placeId e reservedAt são obrigatórios" 
        });
      }

      // Converta para números para garantir
      const numericUserId = parseInt(userId);
      const numericPlaceId = parseInt(placeId);

      if (isNaN(numericUserId)) {
        return res.status(400).json({ 
          success: false,
          error: "ID do usuário inválido" 
        });
      }

      // Verifica disponibilidade antes de criar
      const availability = await Reservation.checkAvailability(
        numericPlaceId,
        reservedAt
      );

      if (availability.available <= 0) {
        return res.status(400).json({ 
          success: false,
          error: "Não há vagas disponíveis para esta data" 
        });
      }

      // ✅ CORREÇÃO: DIMINUI A CAPACIDADE DO LUGAR
      const place = await Place.findByPk(numericPlaceId);
      if (!place) {
        return res.status(404).json({
          success: false,
          error: "Local não encontrado"
        });
      }

      // Diminui a capacidade
      if (place.capacity > 0) {
        place.capacity -= 1;
        await place.save();
      } else {
        return res.status(400).json({
          success: false,
          error: "Capacidade esgotada"
        });
      }

      // Cria a reserva
      const newReservation = await Reservation.create({
        userId: numericUserId,
        placeId: numericPlaceId,
        reservedAt,
        peopleCount,
      });

      // ✅ PUBLICAR EVENTO DE RESERVA CRIADA NO RABBITMQ
      try {
        await eventPublisher.reservationCreated(newReservation);
        console.log(`📤 [backend-main] Evento RESERVATION_CREATED publicado: ${newReservation.id}`);
      } catch (eventError) {
        console.error("❌ Erro ao publicar evento RESERVATION_CREATED:", eventError);
        // Não falha a criação da reserva se o evento falhar
      }

      // Recalcula disponibilidade atualizada
      const newAvailability = await Reservation.checkAvailability(
        numericPlaceId,
        reservedAt
      );

      res.status(201).json({
        success: true,
        message: "Reserva criada com sucesso",
        reservation: newReservation,
        availability: newAvailability,
        // ✅ INFO EXTRA: Mostra a nova capacidade
        newCapacity: place.capacity
      });
    } catch (error) {
      console.error("Erro ao criar reserva:", error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: "Dados inválidos para reserva"
        });
      }

      res.status(500).json({
        success: false,
        error: "Erro interno ao criar reserva"
      });
    }
  }

  // ❌ Cancelar reserva E RESTAURA CAPACIDADE
  static async deleteReservation(req, res) {
    const { id } = req.params;
    try {
      const numericId = parseInt(id);
      
      if (isNaN(numericId)) {
        return res.status(400).json({
          success: false,
          error: "ID da reserva inválido"
        });
      }

      // Primeiro busca a reserva para saber o placeId
      const reservation = await Reservation.findByPk(numericId);
      if (!reservation) {
        return res.status(404).json({ 
          success: false, 
          message: "Reserva não encontrada" 
        });
      }

      const placeId = reservation.placeId;

      // ✅ CORREÇÃO: RESTAURA A CAPACIDADE ANTES DE DELETAR
      const place = await Place.findByPk(placeId);
      if (place) {
        place.capacity += 1;
        await place.save();
      }

      // ✅ PUBLICAR EVENTO DE RESERVA CANCELADA NO RABBITMQ
      try {
        await eventPublisher.reservationCancelled(numericId, "Cancelado pelo usuário");
        console.log(`📤 [backend-main] Evento RESERVATION_CANCELLED publicado: ${numericId}`);
      } catch (eventError) {
        console.error("❌ Erro ao publicar evento RESERVATION_CANCELLED:", eventError);
      }

      // Deleta a reserva
      await reservation.destroy();

      res.json({ 
        success: true, 
        message: "Reserva deletada com sucesso",
        // ✅ INFO EXTRA: Mostra a capacidade restaurada
        restoredCapacity: place ? place.capacity : null
      });
    } catch (error) {
      console.error(`Erro ao deletar reserva ${id}:`, error);
      res.status(500).json({ 
        success: false, 
        error: "Erro ao cancelar reserva" 
      });
    }
  }

  // 📋 Listar todas as reservas (com dados do local)
  static async getReservations(req, res) {
    try {
      const reservations = await Reservation.findAllWithPlace();
      res.json({ success: true, reservations });
    } catch (error) {
      console.error("Erro ao buscar reservas:", error);
      res.status(500).json({ 
        success: false, 
        error: "Erro ao buscar reservas" 
      });
    }
  }

  // 👤 Listar reservas por usuário
  static async getReservationsByUser(req, res) {
    const { userId } = req.params;
    try {
      const numericUserId = parseInt(userId);
      
      if (isNaN(numericUserId)) {
        return res.status(400).json({
          success: false,
          error: "ID do usuário inválido"
        });
      }

      const reservations = await Reservation.findByUserWithPlace(numericUserId);
      res.json({ success: true, reservations });
    } catch (error) {
      console.error(`Erro ao buscar reservas do usuário ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar reservas do usuário",
      });
    }
  }

  // 📊 Consultar vagas disponíveis por local e data
  static async getAvailableSpots(req, res) {
    const { placeId, reservedAt } = req.query;

    if (!placeId || !reservedAt) {
      return res.status(400).json({
        success: false,
        error: "placeId e reservedAt são obrigatórios",
      });
    }

    try {
      const numericPlaceId = parseInt(placeId);
      
      if (isNaN(numericPlaceId)) {
        return res.status(400).json({
          success: false,
          error: "ID do local inválido"
        });
      }

      const availability = await Reservation.checkAvailability(
        numericPlaceId,
        reservedAt
      );

      res.json({ success: true, ...availability });
    } catch (error) {
      console.error("Erro ao consultar vagas disponíveis:", error);
      if (error.message === "Local não encontrado") {
        return res.status(404).json({ 
          success: false, 
          error: "Local não encontrado" 
        });
      }
      res.status(500).json({
        success: false,
        error: "Erro ao consultar vagas disponíveis",
      });
    }
  }

  // 🏠 Listar reservas por local específico
  static async getReservationsByPlace(req, res) {
    const { placeId } = req.params;
    try {
      const numericPlaceId = parseInt(placeId);
      
      if (isNaN(numericPlaceId)) {
        return res.status(400).json({
          success: false,
          error: "ID do local inválido"
        });
      }

      const reservations = await Reservation.findByPlace(numericPlaceId);
      res.json({ success: true, reservations });
    } catch (error) {
      console.error(`Erro ao buscar reservas do local ${placeId}:`, error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar reservas do local",
      });
    }
  }
}

module.exports = ReservationController;