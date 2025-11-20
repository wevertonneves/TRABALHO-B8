// middleware/authMiddleware.js - VERIFIQUE SE ESTÁ CORRETO
const jwt = require("jsonwebtoken");

// ✅ CERTIFIQUE-SE DE QUE AS FUNÇÕES ESTÃO SENDO EXPORTADAS CORRETAMENTE
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    console.log(
      `🔧 CORS - Origin: ${req.headers.origin}, Method: ${req.method}`
    );

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acesso requerido",
      });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adicionar usuário à requisição
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role || "user",
    };

    console.log(`🔐 Usuário autenticado: ${req.user.email} (${req.user.role})`);
    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expirado",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        success: false,
        message: "Token inválido",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erro na autenticação",
    });
  }
};

const isAdmin = (req, res, next) => {
  console.log(`👑 Verificando admin: ${req.user?.role}`);

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Acesso negado. Apenas administradores.",
    });
  }
  next();
};

// ✅ EXPORTE CORRETAMENTE - ESTA É A PARTE MAIS IMPORTANTE!
module.exports = {
  authenticateToken,
  isAdmin,
};
