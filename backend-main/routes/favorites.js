// routes/favorites.js
const express = require("express");
const router = express.Router();
const FavoriteController = require("../controllers/FavoriteController");
const { authenticateToken } = require("../middlewares/authMiddleware"); // ✅ Adicionar autenticação

// Listar todos os favoritos de um usuário
router.get(
  "/user/:userId",
  authenticateToken,
  FavoriteController.getUserFavorites
);

// Verificar se um local é favorito
router.get(
  "/:userId/:placeId",
  authenticateToken,
  FavoriteController.checkFavorite
);

// Adicionar favorito
router.post("/", authenticateToken, FavoriteController.addFavorite);

// Remover favorito
router.delete("/", authenticateToken, FavoriteController.removeFavorite);

module.exports = router;
