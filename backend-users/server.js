require("module-alias/register");
const express = require("express");
require("dotenv").config({ path: ".env.dev" });

const { testConnection } = require("./config/database");

const app = express();

// =========================================
// MIDDLEWARES PADRÃO
// =========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================
// ROTAS PRINCIPAIS
// =========================================
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// =========================================
// ROTAS DE SISTEMA
// =========================================
app.get("/api/health", (req, res) => {
  res.json({
    service: "user-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001
  });
});

app.get("/api/rabbitmq-status", async (req, res) => {
  try {
    const reservationConsumer = require("./events/reservationConsumer");
    const favoriteConsumer = require("./events/FavoriteConsumer");

    const reservationHealth = await reservationConsumer.healthCheck?.() || { status: "initializing" };
    const favoriteHealth = await favoriteConsumer.healthCheck?.() || { status: "initializing" };

    res.json({
      service: "user-service",
      rabbitmq: {
        status: "active",
        url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
        consumes: [
          "RESERVATION_CREATED",
          "RESERVATION_CANCELLED",
          "FAVORITE_ADDED",
          "FAVORITE_REMOVED"
        ],
        publishes: [
          "USER_CREATED",
          "USER_LOGGED_IN",
          "USER_UPDATED",
          "USER_DELETED"
        ]
      },
      consumers: {
        reservation: reservationHealth,
        favorite: favoriteHealth
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      service: "user-service",
      rabbitmq: { status: "error", error: error.message }
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    service: "user-service",
    message: "Backend Users rodando",
    endpoints: {
      health: "/api/health",
      rabbitmqStatus: "/api/rabbitmq-status",
      login: "POST /api/users/login",
      register: "POST /api/users",
      userProfile: "GET /api/users/profile"
    }
  });
});

// =========================================
// BANCO DE DADOS
// =========================================
async function initializeDatabase() {
  try {
    await testConnection();
    const User = require("./models/User");
    await User.sync({ alter: true });
    console.log("✅ Banco de usuários pronto!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error);
    throw error;
  }
}

// =========================================
// RABBITMQ
// =========================================
async function initializeRabbitMQ() {
  try {
    console.log("🔄 Inicializando RabbitMQ...");

    const reservationConsumer = require("./events/reservationConsumer");
    const favoriteConsumer = require("./events/FavoriteConsumer");

    await reservationConsumer.initialize();
    await favoriteConsumer.initialize();

    console.log("✅ RabbitMQ inicializado!");
    return true;

  } catch (error) {
    console.error("❌ Erro ao inicializar RabbitMQ:", error);
    return false;
  }
}

// =========================================
// INICIAR SERVIDOR
// =========================================
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log("🚀 Iniciando User Service...");

    await initializeDatabase();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🎉 USER SERVICE RODANDO NA PORTA ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
      console.log(`🐰 RabbitMQ: http://localhost:${PORT}/api/rabbitmq-status`);
    });

    setTimeout(async () => {
      console.log("⏳ Inicializando RabbitMQ após delay...");
      await initializeRabbitMQ();
    }, 5000);

    return server;

  } catch (error) {
    console.error("💥 Falha crítica ao iniciar User Service:", error);
    process.exit(1);
  }
}

// =========================================
// MIDDLEWARE FINAL DE ERRO
// =========================================
app.use((err, req, res, next) => {
  console.error("❌ Erro:", err.message);
  res.status(500).json({
    service: "user-service",
    error: "Erro interno do servidor"
  });
});

app.use((req, res) => {
  res.status(404).json({
    service: "user-service",
    error: "Rota não encontrada"
  });
});

// =========================================
// GRACEFUL SHUTDOWN
// =========================================
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM recebido, encerrando com segurança...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT recebido, encerrando com segurança...");
  process.exit(0);
});

// =========================================
// INICIALIZAR
// =========================================
startServer();