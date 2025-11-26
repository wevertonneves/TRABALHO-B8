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

// IMPORTAR O EVENT CONSUMER DO REDIS
const eventConsumer = require("./events/eventConsumer");

// IMPORTAR O EVENT PUBLISHER PARA RESERVAS (REDIS)
const eventPublisher = require("./shared/messaging/eventPublisher");

const app = express();

// Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// =========================================
// MIDDLEWARES
// =========================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir uploads
app.use("/api/uploads", express.static(uploadsDir));

// =========================================
// ROTAS
// =========================================
app.use("/api/places", placesRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/upload", uploadRoutes);

// =========================================
// ROTA HEALTH CHECK
// =========================================
app.get("/api/health", async (req, res) => {
  try {
    const dbHealth = await testConnection();
    
    // ✅ HEALTH CHECK MAIS TOLERANTE PARA REDIS
    let redisHealth = { healthy: false, message: "Not checked" };
    try {
      redisHealth = await eventPublisher.healthCheck();
    } catch (error) {
      redisHealth = { healthy: false, message: error.message };
    }
    
    res.json({
      service: "main-service",
      status: "healthy",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth ? "connected" : "disconnected",
        redis: redisHealth.healthy ? "connected" : "disconnected"
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
// ROTA REDIS STATUS
// =========================================
app.get("/api/redis-status", async (req, res) => {
  try {
    const health = await eventPublisher.healthCheck();
    
    res.json({
      service: "main-service",
      redis: {
        status: health.healthy ? "connected" : "disconnected",
        health: health,
        publishes: [
          "RESERVATION_CREATED",
          "RESERVATION_CANCELLED", 
          "RESERVATION_UPDATED",
          "FAVORITE_ADDED",
          "FAVORITE_REMOVED"
        ],
        subscribes: [
          "USER_CREATED",
          "USER_DELETED", 
          "USER_LOGGED_IN"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      service: "main-service",
      redis: {
        status: "error",
        error: error.message
      }
    });
  }
});

// =========================================
// ROTA RAIZ
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
      redisStatus: "/api/redis-status"
    },
    redis: {
      status: "active",
      publishes: ["RESERVATION_CREATED", "RESERVATION_CANCELLED", "RESERVATION_UPDATED"],
      subscribes: ["USER_CREATED", "USER_DELETED", "USER_LOGGED_IN"]
    }
  });
});

// =========================================
// MIDDLEWARE DE ERRO
// =========================================
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err.message);

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
    error: "Rota nao encontrada",
    path: req.path,
  });
});

// =========================================
// INICIALIZACAO DO BANCO
// =========================================
async function initializeDatabase() {
  try {
    console.log("Inicializando banco de dados...");
    await testConnection();
    setupAssociations();
    
    await Place.sync({ alter: false });
    await Reservation.sync({ alter: false });
    await Favorite.sync({ alter: false });

    console.log("Banco de dados inicializado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao inicializar banco:", error);
    throw error;
  }
}

// =========================================
// INICIALIZACAO DO REDIS
// =========================================
async function initializeRedis() {
  try {
    console.log("Inicializando Redis Consumer...");
    
    // Aguardar um pouco para garantir que a conexao do Redis esteja estavel
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await eventConsumer.initialize();
    console.log("Redis Consumer inicializado com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao inicializar Redis Consumer:", error);
    console.log("O servico continuara sem Redis. Eventos nao serao consumidos.");
    return false;
  }
}

// =========================================
// TESTAR CONEXAO REDIS (VERSÃO CORRIGIDA)
// =========================================
async function testRedisConnection() {
  try {
    console.log("Testando conexao com Redis...");

    // ✅ AGUARDAR CONEXÃO ESTABILIZAR PRIMEIRO
    console.log("Aguardando inicializacao do Redis...");
    await new Promise(resolve => setTimeout(resolve, 4000));

    // ✅ TESTE SIMPLES DE PUBLICAÇÃO PRIMEIRO
    let published = false;
    let healthCheckPassed = false;

    try {
      const testMessage = {
        service: "main-service",
        startedAt: new Date().toISOString(),
        status: "connection_test"
      };

      published = await eventPublisher.publishEvent(
        "SERVICE_STARTUP", 
        testMessage
      );

      if (published) {
        console.log("Teste de publicacao Redis: OK");
        
        // ✅ AGORA TESTAR HEALTH CHECK COM MAIS TOLERÂNCIA
        try {
          const health = await eventPublisher.healthCheck();
          healthCheckPassed = health.healthy;
          
          if (healthCheckPassed) {
            console.log("Health Check Redis: OK");
          } else {
            console.log("Health Check Redis: Falhou, mas publicacao funciona");
          }
        } catch (healthError) {
          console.log("Health Check Redis: Erro, mas publicacao funciona");
          // Considera como sucesso se a publicação funcionou
          healthCheckPassed = published;
        }
      }
    } catch (publishError) {
      console.log("Teste de publicacao Redis: Falhou -", publishError.message);
    }

    // ✅ CONSIDERA CONEXÃO BEM SUCEDIDA SE PUBLICAÇÃO FUNCIONOU
    if (published) {
      console.log("Conexao Redis estabelecida com sucesso!");
      return true;
    } else {
      console.log("Falha na conexao Redis");
      return false;
    }

  } catch (error) {
    console.error("Erro no teste de conexao Redis:", error.message);
    return false;
  }
}

// =========================================
// INICIAR SERVIDOR
// =========================================
const PORT = process.env.PORT || 3003;

async function startServer() {
  try {
    console.log("Iniciando Main Service...");
    console.log("Ambiente:", process.env.NODE_ENV || "development");
    console.log("Porta:", PORT);
    console.log("Redis:", process.env.REDIS_URL || "redis://localhost:6379");

    // Inicializar banco de dados
    await initializeDatabase();

    // Testar conexao Redis
    const redisConnected = await testRedisConnection();

    // Inicializar Redis Consumer (nao bloqueante)
    if (redisConnected) {
      initializeRedis().then(success => {
        if (success) {
          console.log("Sistema Redis totalmente operacional!");
        } else {
          console.log("Sistema operando sem Redis Consumer");
        }
      });
      
      // ✅ MENSAGEM POSITIVA MESMO SE HEALTH CHECK FALHOU INICIALMENTE
      console.log("Redis conectado e pronto para uso!");
    } else {
      console.log("Sistema operando sem Redis");
    }

    // Iniciar servidor
    app.listen(PORT, "0.0.0.0", () => {
      console.log("MAIN SERVICE RODANDO!");
      console.log("=========================================");
      console.log("Local:    http://localhost:" + PORT);  
      console.log("=========================================");
    });

  } catch (error) {
    console.error("Falha critica ao inicializar Main Service:", error);
    process.exit(1);
  }
}

// =========================================
// CAPTURA DE ERROS GLOBAIS
// =========================================
process.on("unhandledRejection", (reason, promise) => {
  console.error("Rejeicao nao tratada em:", promise, "motivo:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Excecao nao capturada:", error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando servidor graciosamente...');
  // Fechar conexoes Redis se necessario
  if (eventPublisher.disconnect) {
    await eventPublisher.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando servidor graciosamente...');
  // Fechar conexoes Redis se necessario
  if (eventPublisher.disconnect) {
    await eventPublisher.disconnect();
  }
  process.exit(0);
});

// =========================================
// INICIALIZAR SERVIDOR
// =========================================
startServer();