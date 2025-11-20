// middleware/authMiddleware.js - VERSÃO SIMPLIFICADA E TESTADA
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Middleware de autenticação obrigatório
const authenticateToken = async (req, res, next) => {
  try {
    console.log("🔐 Iniciando autenticação...");

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      console.log("❌ Token não fornecido");
      return res.status(401).json({ error: "Token de acesso requerido" });
    }

    console.log(`📨 Token recebido: ${token.substring(0, 20)}...`);

    // Verificar token localmente
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`✅ Token válido para usuário:`, decoded);
    } catch (jwtError) {
      console.error("❌ Erro JWT:", jwtError.message);
      return res.status(403).json({ error: "Token inválido ou expirado" });
    }

    // Buscar usuário no serviço de usuários
    const userServiceURL =
      process.env.USER_SERVICE_URL || "http://localhost:3001";

    try {
      console.log(`🌐 Buscando usuário ${decoded.id} em ${userServiceURL}`);

      const response = await axios.get(
        `${userServiceURL}/api/users/${decoded.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log("✅ Usuário encontrado no serviço de usuários");
      req.user = response.data;
      next();
    } catch (apiError) {
      console.error("❌ Erro ao buscar usuário:", {
        status: apiError.response?.status,
        message: apiError.message,
        data: apiError.response?.data,
      });

      if (apiError.response?.status === 403) {
        return res.status(403).json({
          error: "Acesso negado ao serviço de usuários",
        });
      }

      return res.status(401).json({
        error: "Falha ao validar usuário",
      });
    }
  } catch (error) {
    console.error("💥 Erro geral no middleware:", error.message);
    return res.status(500).json({ error: "Erro interno na autenticação" });
  }
};

// Middleware com token opcional
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userServiceURL =
          process.env.USER_SERVICE_URL || "http://localhost:3001";

        const response = await axios.get(
          `${userServiceURL}/api/users/${decoded.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        req.user = response.data;
      } catch (error) {
        // Se houver erro, continua sem usuário
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
