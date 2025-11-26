require("module-alias/register");
const express = require("express");
require("dotenv").config({ path: ".env.dev" });

const { testConnection } = require("./config/database");

const app = express();

// =========================================
// MIDDLEWARES PADRAO
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
app.get("/api/health", async (req, res) => {
  try {
    const dbHealth = await testConnection();
    
    // VERIFICAR SAUDE DO REDIS
    let redisHealth = { status: "unknown" };
    try {
      const cacheService = require("./services/cacheService");
      // Teste basico do Redis
      const testKey = "health:test:" + Date.now();
      const testResult = await cacheService.set(testKey, { test: true }, 10);
      redisHealth = { 
        status: testResult ? "connected" : "disconnected",
        test: testResult
      };
    } catch (error) {
      redisHealth = { status: "error", error: error.message };
    }

    res.json({
      service: "user-service",
      status: "healthy",
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3001,
      dependencies: {
        database: dbHealth ? "connected" : "disconnected",
        redis: redisHealth.status
      }
    });
  } catch (error) {
    res.status(500).json({
      service: "user-service",
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ROTA: STATUS DO REDIS
app.get("/api/redis-status", async (req, res) => {
  try {
    const cacheService = require("./services/cacheService");
    
    // Teste pratico do Redis
    const testKey = "status:test:" + Date.now();
    const testData = { 
      message: "Teste de cache Redis",
      timestamp: new Date().toISOString()
    };
    
    // Testar SET
    const setResult = await cacheService.set(testKey, testData, 60);
    
    // Testar GET
    const getResult = await cacheService.get(testKey);
    
    // Testar KEYS
    const patternKeys = await require("./config/redis").keys("status:test:*");
    
    res.json({
      service: "user-service",
      redis: {
        status: setResult ? "active" : "inactive",
        url: process.env.REDIS_URL || "redis://localhost:6379",
        test: {
          set: setResult,
          get: getResult !== null,
          keys_count: patternKeys.length,
          data_match: JSON.stringify(getResult) === JSON.stringify(testData)
        },
        features: {
          cache: true,
          ttl: true,
          pattern_deletion: true
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      service: "user-service",
      redis: { status: "error", error: error.message }
    });
  }
});

// ROTA: ESTATISTICAS DO CACHE
app.get("/api/cache-stats", async (req, res) => {
  try {
    const redis = require("./config/redis");
    
    const userKeys = await redis.keys("user:*");
    const usersKeys = await redis.keys("users:*");
    const allCacheKeys = await redis.keys("*");
    
    res.json({
      service: "user-service",
      cache: {
        total_keys: allCacheKeys.length,
        by_type: {
          user: userKeys.length,
          users: usersKeys.length,
          other: allCacheKeys.length - userKeys.length - usersKeys.length
        },
        keys_sample: allCacheKeys.slice(0, 10)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      service: "user-service",
      error: error.message
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    service: "user-service",
    message: "Backend Users rodando",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      redisStatus: "/api/redis-status",
      cacheStats: "/api/cache-stats",
      login: "POST /api/users/login",
      register: "POST /api/users",
      userProfile: "GET /api/users/profile"
    },
    features: {
      redis_cache: true,
      user_management: true,
      authentication: true
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
    console.log("Banco de usuarios pronto!");
    return true;
  } catch (error) {
    console.error("Erro ao inicializar banco:", error);
    throw error;
  }
}

// =========================================
// REDIS - INICIALIZACAO
// =========================================
async function initializeRedis() {
  try {
    console.log("Inicializando Redis...");
    
    const redis = require("./config/redis");
    
    // Aguarda um pouco para a conexao estabilizar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (redis.isReady) {
      console.log("Redis inicializado e pronto!");
      
      // Teste inicial do Redis
      const cacheService = require("./services/cacheService");
      const testResult = await cacheService.set("system:startup", { 
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      }, 300);
      
      if (testResult) {
        console.log("Cache Redis testado e funcionando!");
      }
      
      return true;
    } else {
      console.log("Redis disponivel mas nao conectado");
      return false;
    }
    
  } catch (error) {
    console.error("Erro ao inicializar Redis:", error.message);
    console.log("O servico continuara sem cache Redis");
    return false;
  }
}

// =========================================
// INICIAR SERVIDOR
// =========================================
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log("Iniciando User Service...");
    console.log("Ambiente:", process.env.NODE_ENV || "development");
    console.log("Porta:", PORT);
    console.log("Redis:", process.env.REDIS_URL || "redis://localhost:6379");

    // Inicializar banco de dados
    await initializeDatabase();

    // Inicializar Redis
    const redisConnected = await initializeRedis();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("USER SERVICE RODANDO!");
      console.log("=========================================");
      console.log("Local:  http://localhost:" + PORT);
      console.log("=========================================");
      
      if (redisConnected) {
        console.log("Redis Cache: ATIVO");
        console.log("   Performance: Cache em memoria");
        console.log("   Persistencia: Dados frequentes");
        console.log("   TTL: Expiracao automatica");
      } else {
        console.log("Redis Cache: MODO SIMULACAO");
        console.log("   Funcionalidades limitadas");
        console.log("   Dica: Configure o Redis para producao");
      }
      
      console.log("=========================================");
    });

    return server;

  } catch (error) {
    console.error("Falha critica ao iniciar User Service:", error);
    process.exit(1);
  }
}

// =========================================
// MIDDLEWARE FINAL DE ERRO
// =========================================
app.use((err, req, res, next) => {
  console.error("Erro:", err.message);
  res.status(500).json({
    service: "user-service",
    error: "Erro interno do servidor",
    message: process.env.NODE_ENV === "development" ? err.message : "Algo deu errado!"
  });
});

app.use((req, res) => {
  res.status(404).json({
    service: "user-service",
    error: "Rota nao encontrada",
    path: req.path
  });
});

// =========================================
// GRACEFUL SHUTDOWN
// =========================================
process.on("SIGTERM", async () => {
  console.log("SIGTERM recebido, encerrando com seguranca...");
  
  // Fechar conexao Redis se necessario
  try {
    const redis = require("./config/redis");
    if (redis.quit) {
      await redis.quit();
      console.log("Redis desconectado");
    }
  } catch (error) {
    console.log("Erro ao desconectar Redis:", error.message);
  }
  
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT recebido, encerrando com seguranca...");
  
  // Fechar conexao Redis se necessario
  try {
    const redis = require("./config/redis");
    if (redis.quit) {
      await redis.quit();
      console.log("Redis desconectado");
    }
  } catch (error) {
    console.log("Erro ao desconectar Redis:", error.message);
  }
  
  process.exit(0);
});

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

// =========================================
// INICIALIZAR
// =========================================
startServer();