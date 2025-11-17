const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

console.log("1. Iniciando servidor...");

// Importar modelos
const Place = require("./models/Place");
const Reservation = require("./models/Reservation");
const User = require("./models/User");
const Favorite = require("./models/FavoriteModel");

console.log("2. Modelos importados");

// ✅ CORREÇÃO: Importar do database.js (singular)
const { usersDB, mainDB } = require("./config/database");
console.log("3. Bancos de dados importados");

// Importar configuração de associações
const setupAssociations = require("./models/associations");
console.log("4. Associações importadas");

const placesRoutes = require("./routes/placesRoutes");
const usersRoutes = require("./routes/userRoutes");
const reservationsRoutes = require("./routes/reservationsRouter");
const favoriteRoutes = require("./routes/favorites");

console.log("5. Rotas importadas");

const app = express();

// 📁 Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Pasta uploads criada:", uploadsDir);
}

// 🔧 CONFIGURAÇÃO CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Servir arquivos estáticos da pasta uploads
app.use("/uploads", express.static(uploadsDir));
console.log("6. Middlewares configurados");

// Log das rotas
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reservas", reservationsRoutes);
app.use("/api/favorites", favoriteRoutes);
console.log("7. Rotas configuradas");

// Rota de health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Servidor rodando",
    timestamp: new Date().toISOString(),
  });
});

// Rota para verificar se uploads está funcionando
app.get("/api/uploads-check", (req, res) => {
  try {
    const testFiles = fs.readdirSync(uploadsDir);
    res.json({
      uploadsDirectory: uploadsDir,
      exists: fs.existsSync(uploadsDir),
      fileCount: testFiles.length,
      files: testFiles,
    });
  } catch (error) {
    res.json({
      uploadsDirectory: uploadsDir,
      exists: fs.existsSync(uploadsDir),
      fileCount: 0,
      files: [],
      error: "Erro ao ler diretório",
    });
  }
});

// Middleware de erro genérico
app.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err.stack);
  res.status(500).json({
    error: "Erro interno do servidor",
    message:
      process.env.NODE_ENV === "development" ? err.message : "Algo deu errado!",
  });
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// Função para inicializar modelos e associações
async function initializeDatabase() {
  try {
    console.log("🔄 Inicializando banco de dados...");

    // Testar conexões com ambos os bancos
    console.log("🔗 Testando conexões...");
    await require("./config/database").testConnections();

    console.log("🔗 Configurando associações...");
    setupAssociations();

    console.log("🔗 Sincronizando modelos...");
    await Place.sync({ alter: true });
    console.log("✅ Place sincronizado");

    await Reservation.sync({ alter: true });
    console.log("✅ Reservation sincronizado");

    await User.sync({ alter: true });
    console.log("✅ User sincronizado");

    await Favorite.sync({ alter: true });
    console.log("✅ Favorite sincronizado");

    console.log("🎉 Todos os modelos sincronizados com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar banco de dados:", error);
    throw error;
  }
}

const PORT = 3001;

// Inicializar banco e depois iniciar servidor
console.log("🚀 Iniciando aplicação...");
initializeDatabase()
  .then(() => {
    console.log("✅ Banco inicializado, iniciando servidor...");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🎉 Servidor rodando na porta ${PORT}`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
      console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((error) => {
    console.error("💥 Falha crítica ao inicializar:", error);
    process.exit(1);
  });

// Capturar erros não tratados
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Rejeição não tratada em:", promise, "motivo:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Exceção não capturada:", error);
  process.exit(1);
});
