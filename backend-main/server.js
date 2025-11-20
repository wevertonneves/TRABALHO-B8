// Carregar variáveis de ambiente
require("dotenv").config({ path: ".env.dev" });

const express = require("express");
const path = require("path");
const fs = require("fs");

// Importar modelos
const Place = require("./models/Place");
const Reservation = require("./models/Reservation");
const Favorite = require("./models/FavoriteModel");

// Importar banco e associações
const { testConnection } = require("./config/database");
const setupAssociations = require("./models/associations");

// Importar rotas
const placesRoutes = require("./routes/placesRoutes");
const reservationsRoutes = require("./routes/reservationsRouter");
const favoriteRoutes = require("./routes/favorites");
const uploadRoutes = require("./routes/uploadRoutes");

// 🔥 IMPORTAR O EVENT CONSUMER DO RABBITMQ
const eventConsumer = require("./events/eventConsumer");

// 🔥 IMPORTAR O EVENT PUBLISHER PARA RESERVAS
const eventPublisher = require("./shared/messaging/eventPublisher");

const app = express();

// Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// =========================================
// 🔧 MIDDLEWARES
// =========================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir uploads
app.use("/uploads", express.static(uploadsDir));

// =========================================
// 🔧 ROTAS
// =========================================
app.use("/api/places", placesRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/upload", uploadRoutes);

// =========================================
// 🔧 ROTA HEALTH CHECK
// =========================================
app.get("/api/health", async (req, res) => {
  try {
    const dbHealth = await testConnection();
    const rabbitHealth = await eventPublisher.healthCheck();
    
    res.json({
      service: "main-service",
      status: "healthy",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth ? "connected" : "disconnected",
        rabbitmq: rabbitHealth.healthy ? "connected" : "disconnected"
      },
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    res.status(500).json({
      service: "main-service",
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =========================================
// 🔧 ROTA RABBITMQ STATUS
// =========================================
app.get("/api/rabbitmq-status", async (req, res) => {
  try {
    const health = await eventPublisher.healthCheck();
    
    res.json({
      service: "main-service",
      rabbitmq: {
        status: health.healthy ? "connected" : "disconnected",
        health: health,
        publishes: [
          "RESERVATION_CREATED",
          "RESERVATION_CANCELLED", 
          "RESERVATION_UPDATED",
          "FAVORITE_ADDED",
          "FAVORITE_REMOVED"
        ],
        consumes: [
          "USER_CREATED",
          "USER_DELETED", 
          "USER_LOGGED_IN"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      service: "main-service",
      rabbitmq: {
        status: "error",
        error: error.message
      }
    });
  }
});

// =========================================
// 🔧 ROTA RAIZ
// =========================================
app.get("/", (req, res) => {
  res.json({
    service: "main-service",
    message: "Main Service - Gerenciamento de Locais, Reservas e Favoritos",
    endpoints: {
      places: "/api/places",
      reservations: "/api/reservations",
      favorites: "/api/favorites",
      upload: "/api/upload",
      uploadMultiple: "/api/upload/multiple",
      health: "/api/health",
      rabbitmqStatus: "/api/rabbitmq-status"
    },
    rabbitmq: {
      status: "active",
      publishes: ["RESERVATION_CREATED", "RESERVATION_CANCELLED", "RESERVATION_UPDATED"],
      consumes: ["USER_CREATED", "USER_DELETED", "USER_LOGGED_IN"]
    }
  });
});

// =========================================
// 🔧 MIDDLEWARE DE ERRO
// =========================================
app.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err.message);

  res.status(500).json({
    service: "main-service",
    error: "Erro interno do servidor",
    message: process.env.NODE_ENV === "development" ? err.message : "Algo deu errado!",
  });
});

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    service: "main-service",
    error: "Rota não encontrada",
    path: req.path,
  });
});

// =========================================
// 🔧 INICIALIZAÇÃO DO BANCO
// =========================================
async function initializeDatabase() {
  try {
    console.log("🔄 Inicializando banco de dados...");
    await testConnection();
    setupAssociations();
    
    await Place.sync({ alter: false });
    await Reservation.sync({ alter: false });
    await Favorite.sync({ alter: false });

    console.log("✅ Banco de dados inicializado com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error);
    throw error;
  }
}

// =========================================
// 🔧 INICIALIZAÇÃO DO RABBITMQ
// =========================================
async function initializeRabbitMQ() {
  try {
    console.log("🔄 Inicializando RabbitMQ Consumer...");
    
    // Aguardar um pouco para garantir que a conexão do RabbitMQ esteja estável
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await eventConsumer.initialize();
    console.log("✅ RabbitMQ Consumer inicializado com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar RabbitMQ Consumer:", error);
    console.log("⚠️  O serviço continuará sem RabbitMQ. Eventos não serão consumidos.");
    return false;
  }
}

// =========================================
// 🔧 TESTAR CONEXÃO RABBITMQ
// =========================================
async function testRabbitMQConnection() {
  try {
    console.log("🔗 Testando conexão com RabbitMQ...");
    
    // ✅ CORREÇÃO: usar publishEvent em vez de publish
    const testMessage = {
      service: "main-service",
      startedAt: new Date().toISOString(),
      status: "starting"
    };

    const published = await eventPublisher.publishEvent(
      "SERVICE_STARTUP", 
      testMessage,
      "service.startup"
    );

    if (published) {
      console.log("✅ Conexão RabbitMQ (publicação) testada com sucesso!");
      return true;
    } else {
      console.log("⚠️  RabbitMQ disponível mas publicação falhou");
      return false;
    }
  } catch (error) {
    console.error("❌ Falha na conexão RabbitMQ (publicação):", error.message);
    return false;
  }
}

// =========================================
// 🔧 INICIAR SERVIDOR
// =========================================
const PORT = process.env.PORT || 3003;

async function startServer() {
  try {
    console.log("🚀 Iniciando Main Service...");
    console.log("🔍 Ambiente:", process.env.NODE_ENV || "development");
    console.log("📊 Porta:", PORT);
    console.log("🐰 RabbitMQ:", process.env.RABBITMQ_URL || "amqp://localhost:5672");

    // Inicializar banco de dados
    await initializeDatabase();

    // Testar conexão RabbitMQ (apenas teste, não bloqueante)
    await testRabbitMQConnection();

    // Inicializar RabbitMQ Consumer (não bloqueante)
    initializeRabbitMQ().then(success => {
      if (success) {
        console.log("🎉 Sistema RabbitMQ totalmente operacional!");
      } else {
        console.log("⚠️  Sistema operando sem RabbitMQ");
      }
    });

    // Iniciar servidor
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🎉 MAIN SERVICE RODANDO!`);
      console.log(`=========================================`);
      console.log(`🌐 Local:    http://localhost:${PORT}`);
      console.log(`📊 Health:   http://localhost:${PORT}/api/health`);
      console.log(`🐰 Status:   http://localhost:${PORT}/api/rabbitmq-status`);
      console.log(`=========================================`);
      console.log(`🔧 Endpoints Principais:`);
      console.log(`   📍 Places:       http://localhost:${PORT}/api/places`);
      console.log(`   📅 Reservations: http://localhost:${PORT}/api/reservations`);
      console.log(`   ⭐ Favorites:    http://localhost:${PORT}/api/favorites`);
      console.log(`   📤 Upload:       http://localhost:${PORT}/api/upload`);
      console.log(`=========================================`);
      console.log(`🐰 RabbitMQ Events:`);
      console.log(`   📤 PUBLICADOS:   RESERVATION_CREATED, RESERVATION_CANCELLED, RESERVATION_UPDATED`);
      console.log(`   📥 CONSUMIDOS:   USER_CREATED, USER_DELETED, USER_LOGGED_IN`);
      console.log(`=========================================\n`);
    });

  } catch (error) {
    console.error("💥 Falha crítica ao inicializar Main Service:", error);
    process.exit(1);
  }
}

// =========================================
// 🔧 CAPTURA DE ERROS GLOBAIS
// =========================================
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Rejeição não tratada em:", promise, "motivo:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Exceção não capturada:", error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Recebido SIGTERM, encerrando servidor graciosamente...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Recebido SIGINT, encerrando servidor graciosamente...');
  process.exit(0);
});

// =========================================
// 🔧 INICIALIZAR SERVIDOR
// =========================================
startServer();