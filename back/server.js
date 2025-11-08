// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const placesRoutes = require("./routes/placesRoutes");
const usersRoutes = require("./routes/userRoutes");
const reservationsRoutes = require("./routes/reservationsRouter");
const favoriteRoutes = require("./routes/favorites");

// Importar modelos
const Place = require("./models/Place");
const Reservation = require("./models/Reservation");
const User = require("./models/User");
const Favorite = require("./models/FavoriteModel");

// Importar configuração de associações
const setupAssociations = require("./models/associations");

console.log("✅ Rotas de favoritos carregadas:", favoriteRoutes);

const app = express();

// 📁 Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Pasta uploads criada:", uploadsDir);
}

// 🔧 CONFIGURAÇÃO CORS SIMPLIFICADA E CORRIGIDA
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
console.log("✅ Servindo arquivos estáticos da pasta uploads");

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

// Rota de health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Servidor rodando",
    features: {
      uploads: "Disponível",
      static_files: "Disponível",
    },
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

  // Erro específico do Multer
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "Arquivo muito grande",
      message: "O arquivo deve ter no máximo 5MB",
    });
  }

  if (err.message && err.message.includes("apenas arquivos de imagem")) {
    return res.status(400).json({
      error: "Tipo de arquivo inválido",
      message: "Apenas arquivos de imagem são permitidos",
    });
  }

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
    console.log("🔄 Inicializando modelos...");

    // Configurar associações PRIMEIRO
    setupAssociations();

    console.log("✅ Associações configuradas");

    // Sincronizar modelos DEPOIS das associações
    await Place.sync({ alter: true });
    await Reservation.sync({ alter: true });
    await User.sync({ alter: true });
    await Favorite.sync({ alter: true });

    console.log("✅ Todos os modelos sincronizados com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inicializar banco de dados:", error);
  }
}

const PORT = 3001;

// Inicializar banco e depois iniciar servidor
initializeDatabase().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Uploads disponível em: http://localhost:${PORT}/uploads/`);
    console.log(`🌐 Acessível via IP: http://192.168.1.16:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Uploads check: http://localhost:${PORT}/api/uploads-check`);
  });
});
