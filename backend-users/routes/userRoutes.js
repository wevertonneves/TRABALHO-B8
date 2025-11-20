// routes/userRoutes.js - ADICIONE ESTA ROTA
const express = require("express");
const router = express.Router();
const usersController = require("../controllers/userController");
const { authenticateToken } = require("../middlewares/authMiddleware"); // Importe o middleware

// ---------- Cadastro e login ----------
router.post("/", usersController.createUser);
router.post("/login", usersController.loginUser);

// ---------- Recuperação de senha ----------
router.post("/check-email", usersController.checkEmail);
router.post("/send-code", usersController.sendCode);
router.post("/verify-code", usersController.verifyCode);
router.post("/reset-password", usersController.resetPassword);

// ---------- Alteração de senha ----------
router.put("/change-password", usersController.changePassword);

// ---------- Deletar conta ----------
router.post("/verify-password", usersController.verifyPassword);
router.delete("/", usersController.deleteAccount);

// ---------- Listar todos os usuários (para teste) ----------
router.get("/all", usersController.getAllUsers);

// ✅ ADICIONE ESTAS ROTAS PARA O MAIN SERVICE ACESSAR
router.get("/profile", authenticateToken, usersController.getUserProfile); // Perfil do usuário logado
router.get("/:id", authenticateToken, usersController.getUserById); // Buscar usuário por ID (MAIN SERVICE USA ESTA)
router.get("/check/:id", usersController.userExists); // Verificar se usuário existe (sem auth)

module.exports = router;
