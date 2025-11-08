// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Importar o modelo User

// ---------- Verifica se usuário está logado ----------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 Header Authorization recebido:", authHeader || "Nenhum");
  console.log(
    "🔐 Token extraído:",
    token ? `${token.substring(0, 20)}...` : "Nenhum token"
  );

  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Token não fornecido." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 Token decodificado:", decoded);
    req.user = decoded; // { id, role, name }
    next();
  } catch (err) {
    console.error("❌ Erro na verificação do token:", err.message);
    return res
      .status(403)
      .json({ success: false, message: "Token inválido ou expirado." });
  }
};

// ---------- Verifica se o usuário é admin (ATUALIZADO PARA SEQUELIZE) ----------
const isAdmin = async (req, res, next) => {
  try {
    console.log("👤 Verificando se usuário é admin...");
    console.log("👤 ID do usuário do token:", req.user?.id);

    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Usuário não autenticado." });
    }

    // USANDO SEQUELIZE EM VEZ DE db.query
    const user = await User.findByPk(req.user.id);
    console.log("👤 Resultado da busca no BD (Sequelize):", user);

    if (!user) {
      console.log("❌ Usuário não encontrado no banco de dados");
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado." });
    }

    if (user.role !== "admin") {
      console.log("❌ Usuário não é admin. Role:", user.role);
      return res.status(403).json({
        success: false,
        message: "Acesso negado. Apenas administradores.",
      });
    }

    console.log("✅ Usuário é admin, permitindo acesso");
    next();
  } catch (error) {
    console.error("❌ Erro ao verificar permissão:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao verificar permissão." });
  }
};

module.exports = { verifyToken, isAdmin };
