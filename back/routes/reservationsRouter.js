// routes/reservationsRouter.js
const express = require("express");
const router = express.Router();
const ReservationController = require("../controllers/reservationsController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ➕ Criar reserva
router.post("/", verifyToken, ReservationController.createReservation);

// 📋 Listar todas as reservas (admin)
router.get("/", verifyToken, ReservationController.getReservations);

// 👤 Listar reservas do usuário
router.get(
  "/user/:userId",
  verifyToken,
  ReservationController.getReservationsByUser
);

// 🗑️ Deletar reserva
router.delete("/:id", verifyToken, ReservationController.deleteReservation);

// 📊 Consultar vagas disponíveis
router.get("/available-spots", ReservationController.getAvailableSpots);

// 📍 Listar reservas por local
router.get(
  "/place/:placeId",
  verifyToken,
  ReservationController.getReservationsByPlace
);

module.exports = router;
