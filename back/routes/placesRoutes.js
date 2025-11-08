// routes/placesRoutes.js
const express = require("express");
const router = express.Router();
const {
  PlacesController,
  isAdmin,
} = require("../controllers/placesController");
const { verifyToken } = require("../middlewares/authMiddleware");
const {
  upload,
  handleUploadErrors,
} = require("../middlewares/uploadMiddleware"); // ✅ Importe ambos

// =======================================================
// 🔒 ROTAS PROTEGIDAS (ADMIN)
// =======================================================

// 📤 Upload de imagem (admin apenas) - COM TRATAMENTO DE ERROS
router.post(
  "/upload",
  verifyToken,
  isAdmin,
  upload.single("image"),
  handleUploadErrors, // ✅ Middleware de tratamento de erros
  PlacesController.uploadImage
);

// 🗑️ Deletar imagem (admin apenas)
router.delete("/image", verifyToken, isAdmin, PlacesController.deleteImage);

// ➕ Criar local (admin apenas)
router.post("/", verifyToken, isAdmin, PlacesController.createPlace);

// ✏️ Atualizar local (admin apenas)
router.put("/:id", verifyToken, isAdmin, PlacesController.updatePlace);

// 🗑️ Deletar local (admin apenas)
router.delete("/:id", verifyToken, isAdmin, PlacesController.deletePlace);

// =======================================================
// 🌐 ROTAS PÚBLICAS
// =======================================================

// 📊 Capacidade disponível (público)
// ⚠️ Importante: deve vir antes da rota "/:id"
router.get("/available-capacity", PlacesController.getAvailableCapacity);

// 📋 Listar todos os locais (público)
router.get("/", PlacesController.getAllPlaces);

// 🔍 Buscar local por ID (público)
router.get("/:id", PlacesController.getPlaceById);

module.exports = router;
