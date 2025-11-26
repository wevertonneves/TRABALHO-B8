const reservationService = require("../services/reservationService");

class ReservationController {
  // ➕ Criar reserva validando capacidade
  static async createReservation(req, res) {
    try {
      const { placeId, reservedAt, peopleCount = 1 } = req.body;
      
      // Obtem userId do usuario autenticado
      let userId;
      
      if (req.user && req.user.user && req.user.user.id) {
        userId = req.user.user.id;
      } else if (req.user && req.user.id) {
        userId = req.user.id;
      } else {
        userId = req.body.userId;
      }

      if (!userId) {
        return res.status(400).json({ 
          success: false,
          error: "Usuario nao autenticado. Faca login novamente." 
        });
      }

      const result = await reservationService.createReservation({
        userId,
        placeId,
        reservedAt,
        peopleCount
      });

      res.status(201).json({
        success: true,
        message: "Reserva criada com sucesso",
        reservation: result.reservation,
        availability: result.availability,
        newCapacity: result.newCapacity
      });
    } catch (error) {
      console.error("Erro ao criar reserva:", error);
      
      if (error.message.includes("nao autenticado") || 
          error.message.includes("obrigatorios") ||
          error.message.includes("invalido") ||
          error.message.includes("vagas disponiveis") ||
          error.message.includes("Capacidade esgotada")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      if (error.message === "Local nao encontrado") {
        return res.status(404).json({
          success: false,
          error: error.message
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
      const result = await reservationService.cancelReservation(id);

      res.json({ 
        success: true, 
        message: "Reserva deletada com sucesso",
        restoredCapacity: result.restoredCapacity
      });
    } catch (error) {
      console.error(`Erro ao deletar reserva ${id}:`, error);
      
      if (error.message.includes("invalido") || 
          error.message === "Reserva nao encontrada") {
        return res.status(400).json({ 
          success: false, 
          error: error.message 
        });
      }

      res.status(500).json({ 
        success: false, 
        error: "Erro ao cancelar reserva" 
      });
    }
  }

  // 📋 Listar todas as reservas (com dados do local)
  static async getReservations(req, res) {
    try {
      const reservations = await reservationService.getAllReservations();
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
      const reservations = await reservationService.getReservationsByUser(userId);
      res.json({ success: true, reservations });
    } catch (error) {
      console.error(`Erro ao buscar reservas do usuario ${userId}:`, error);
      
      if (error.message.includes("invalido")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: "Erro ao buscar reservas do usuario",
      });
    }
  }

  // 📊 Consultar vagas disponíveis por local e data
  static async getAvailableSpots(req, res) {
    const { placeId, reservedAt } = req.query;

    if (!placeId || !reservedAt) {
      return res.status(400).json({
        success: false,
        error: "placeId e reservedAt sao obrigatorios",
      });
    }

    try {
      const availability = await reservationService.getAvailableSpots(placeId, reservedAt);
      res.json({ success: true, ...availability });
    } catch (error) {
      console.error("Erro ao consultar vagas disponiveis:", error);
      
      if (error.message === "Local nao encontrado") {
        return res.status(404).json({ 
          success: false, 
          error: "Local nao encontrado" 
        });
      }
      
      if (error.message.includes("invalido")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: "Erro ao consultar vagas disponiveis",
      });
    }
  }

  // 🏠 Listar reservas por local específico
  static async getReservationsByPlace(req, res) {
    const { placeId } = req.params;
    
    try {
      const reservations = await reservationService.getReservationsByPlace(placeId);
      res.json({ success: true, reservations });
    } catch (error) {
      console.error(`Erro ao buscar reservas do local ${placeId}:`, error);
      
      if (error.message.includes("invalido")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: "Erro ao buscar reservas do local",
      });
    }
  }

  // 📈 Estatísticas de reservas
  static async getReservationStats(req, res) {
    try {
      const stats = await reservationService.getReservationStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error("Erro ao buscar estatisticas de reservas:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar estatisticas de reservas",
      });
    }
  }
}

module.exports = ReservationController;