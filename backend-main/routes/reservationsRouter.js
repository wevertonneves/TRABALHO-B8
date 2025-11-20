// routes/reservationsRouter.js
const express = require("express");
const router = express.Router();
const ReservationController = require("../controllers/reservationsController");
const { authenticateToken } = require("../middlewares/authMiddleware"); // ✅ CORRIGIDO

// ➕ Criar reserva
router.post("/", authenticateToken, ReservationController.createReservation);

// 📋 Listar todas as reservas (admin)
router.get("/", authenticateToken, ReservationController.getReservations);

// 👤 Listar reservas do usuário
router.get(
  "/user/:userId",
  authenticateToken,
  ReservationController.getReservationsByUser
);

// 🗑️ Deletar reserva
router.delete(
  "/:id",
  authenticateToken,
  ReservationController.deleteReservation
);

// 📊 Consultar vagas disponíveis
router.get("/available-spots", ReservationController.getAvailableSpots);

// 📍 Listar reservas por local
router.get(
  "/place/:placeId",
  authenticateToken,
  ReservationController.getReservationsByPlace
);

module.exports = router;
