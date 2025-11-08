// routes/favorites.js
const express = require("express");
const router = express.Router();
const FavoriteController = require("../controllers/FavoriteController");

// Listar todos os favoritos de um usuário
router.get("/user/:userId", FavoriteController.getUserFavorites);

// Verificar se um local é favorito
router.get("/:userId/:placeId", FavoriteController.checkFavorite);

// Adicionar favorito
router.post("/", FavoriteController.addFavorite);

// Remover favorito
router.delete("/", FavoriteController.removeFavorite);

module.exports = router;
