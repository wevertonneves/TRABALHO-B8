// routes/placesRoutes.js - CORRIGIDO
const express = require("express");
const router = express.Router();

// ✅ IMPORTE CORRETAMENTE os middlewares e controllers
const {
  authenticateToken,
  optionalAuth,
} = require("../middlewares/authMiddleware");
const placesController = require("../controllers/placesController");

// ✅ ROTAS CORRETAS
router.get("/", optionalAuth, placesController.getAllPlaces);
router.get("/:id", optionalAuth, placesController.getPlaceById);

// ✅ ADICIONE ESTA ROTA PARA CAPACIDADE DISPONÍVEL
router.get("/available-capacity", optionalAuth, placesController.getAvailableCapacity);

router.post("/", authenticateToken, placesController.createPlace);
router.put("/:id", authenticateToken, placesController.updatePlace);
router.delete("/:id", authenticateToken, placesController.deletePlace);

module.exports = router;