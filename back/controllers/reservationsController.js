// controllers/reservationsController.js
const Reservation = require("../models/Reservation");
const { PlacesController } = require("./placesController");

class ReservationController {
  // ➕ Criar reserva validando capacidade por data
  static async createReservation(req, res) {
    const { userId, placeId, reservedAt, peopleCount = 1 } = req.body;

    console.log("📥 [DEBUG] Recebendo requisição de reserva:", req.body);
    console.log("👤 [DEBUG] Usuário autenticado:", req.user);

    if (!userId || !placeId || !reservedAt) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      // Verifica disponibilidade antes de criar
      console.log(
        "🔍 [DEBUG] Verificando disponibilidade para placeId:",
        placeId,
        "data:",
        reservedAt
      );
      const availability = await Reservation.checkAvailability(
        placeId,
        reservedAt
      );

      console.log("📊 [DEBUG] Disponibilidade encontrada:", availability);

      if (availability.available <= 0) {
        return res
          .status(400)
          .json({ error: "Não há vagas disponíveis para esta data" });
      }

      // 💾 Cria a reserva
      console.log("💾 [DEBUG] Salvando reserva no banco...");
      const newReservation = await Reservation.create({
        userId,
        placeId,
        reservedAt,
        peopleCount,
      });

      console.log("✅ [DEBUG] Reserva salva com ID:", newReservation.id);

      // 📉 Reduz a capacidade do local após criar a reserva
      try {
        const novaCapacidade = await PlacesController.reduceCapacity(placeId);
        console.log(
          `📉 Capacidade do local atualizada para: ${novaCapacidade}`
        );
      } catch (err) {
        console.error("⚠️ Erro ao atualizar capacidade:", err.message);
        // Não interrompe a resposta — apenas registra o erro
      }

      // Recalcula disponibilidade atualizada
      const newAvailability = await Reservation.checkAvailability(
        placeId,
        reservedAt
      );
      console.log(
        "📊 [DEBUG] Nova disponibilidade após reserva:",
        newAvailability
      );

      res.status(201).json({
        success: true,
        message: "Reserva criada com sucesso",
        reservation: newReservation,
        availability: newAvailability,
      });
    } catch (error) {
      console.error("❌ Erro ao criar reserva:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao criar reserva: " + error.message,
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
      res
        .status(500)
        .json({ success: false, error: "Erro ao buscar reservas" });
    }
  }

  // 👤 Listar reservas por usuário
  static async getReservationsByUser(req, res) {
    const { userId } = req.params;
    try {
      const reservations = await Reservation.findByUserWithPlace(userId);
      res.json({ success: true, reservations });
    } catch (error) {
      console.error(`Erro ao buscar reservas do usuário ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar reservas do usuário",
      });
    }
  }

  // ❌ Cancelar reserva (opcionalmente restaurar capacidade futuramente)
  static async deleteReservation(req, res) {
    const { id } = req.params;
    try {
      const result = await Reservation.deleteReservation(id);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error(`Erro ao deletar reserva ${id}:`, error);
      if (error.message === "Reserva não encontrada") {
        return res
          .status(404)
          .json({ success: false, message: "Reserva não encontrada" });
      }
      res
        .status(500)
        .json({ success: false, error: "Erro ao cancelar reserva" });
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
      const availability = await Reservation.checkAvailability(
        placeId,
        reservedAt
      );
      res.json({ success: true, ...availability });
    } catch (error) {
      console.error("Erro ao consultar vagas disponíveis:", error);
      if (error.message === "Local não encontrado") {
        return res
          .status(404)
          .json({ success: false, error: "Local não encontrado" });
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
      const reservations = await Reservation.findByPlace(placeId);
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
