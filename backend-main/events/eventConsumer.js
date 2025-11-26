// backend-main/events/eventConsumer.js - VERSÃO CORRIGIDA
const redisService = require("../shared/messaging/redisService");
const config = require("../shared/config/redis");

class EventConsumer {
  constructor() {
    this.queues = config.queues;
    this.channels = config.channels;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log("🔄 Inicializando consumidores para backend-main (Redis)...");

      // Conectar ao Redis se não estiver conectado
      if (!redisService.isConnected) {
        await redisService.connect();
      }

      // Consumir eventos de usuário do backend-user
      await this.setupUserConsumers();

      // Opcional: Inscrever em canais Pub/Sub
      await this.setupChannelSubscriptions();

      this.initialized = true;
      console.log("✅ Todos os consumidores inicializados para backend-main");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores:", error);
      // Tentar reconectar após 5 segundos
      setTimeout(() => this.initialize(), 5000);
    }
  }

  async setupUserConsumers() {
    try {
      console.log("🔧 Configurando consumidores de usuário...");

      // ✅ CONSUMIR USER_CREATED - quando usuário é criado no backend-user
      this.consumeUserCreatedQueue();

      // ✅ CONSUMIR USER_DELETED - quando usuário é deletado no backend-user
      this.consumeUserDeletedQueue();

      // ✅ CONSUMIR USER_LOGGED_IN - quando usuário faz login
      this.consumeUserLoggedInQueue();

      console.log("🎉 Consumidores de usuário configurados:");
      console.log("   👤 " + this.queues.USER_CREATED_MAIN);
      console.log("   🗑️ " + this.queues.USER_DELETED_MAIN);
      console.log("   🔐 " + this.queues.USER_LOGGED_IN_MAIN);
    } catch (error) {
      console.error("❌ Erro ao configurar consumidores de usuário:", error);
      throw error;
    }
  }

  async setupChannelSubscriptions() {
    try {
      console.log("🔧 Configurando inscrições em canais Pub/Sub...");

      // ✅ VERIFICAR SE OS MÉTODOS EXISTEM ANTES DE CHAMAR .bind()
      if (typeof this.handleUserCreated === "function") {
        await redisService.subscribe(
          this.channels.USER_CREATED,
          this.handleUserCreated.bind(this)
        );
      }

      if (typeof this.handleUserDeleted === "function") {
        await redisService.subscribe(
          this.channels.USER_DELETED,
          this.handleUserDeleted.bind(this)
        );
      }

      if (typeof this.handleUserLoggedIn === "function") {
        await redisService.subscribe(
          this.channels.USER_LOGGED_IN,
          this.handleUserLoggedIn.bind(this)
        );
      }

      console.log("🎉 Inscrito em canais Pub/Sub:");
      console.log("   📢 " + this.channels.USER_CREATED);
      console.log("   📢 " + this.channels.USER_DELETED);
      console.log("   📢 " + this.channels.USER_LOGGED_IN);
    } catch (error) {
      console.error("❌ Erro ao configurar inscrições em canais:", error);
    }
  }

  // ✅ CONSUMIR FILA: USER_CREATED
  async consumeUserCreatedQueue() {
    setImmediate(async () => {
      try {
        // ✅ VERIFICAR SE O MÉTODO EXISTE ANTES DE CHAMAR .bind()
        if (typeof this.handleUserCreated === "function") {
          await redisService.consumeQueue(
            this.queues.USER_CREATED_MAIN,
            this.handleUserCreated.bind(this),
            {
              maxRetries: config.settings.maxRetries,
              timeout: config.settings.queueTimeout,
            }
          );
        } else {
          console.warn(
            "⚠️ handleUserCreated não está definido, pulando fila USER_CREATED"
          );
        }
      } catch (error) {
        console.error("❌ Erro no consumidor da fila USER_CREATED:", error);
      }
    });
  }

  // ✅ CONSUMIR FILA: USER_DELETED
  async consumeUserDeletedQueue() {
    setImmediate(async () => {
      try {
        // ✅ VERIFICAR SE O MÉTODO EXISTE ANTES DE CHAMAR .bind()
        if (typeof this.handleUserDeleted === "function") {
          await redisService.consumeQueue(
            this.queues.USER_DELETED_MAIN,
            this.handleUserDeleted.bind(this),
            {
              maxRetries: config.settings.maxRetries,
              timeout: config.settings.queueTimeout,
            }
          );
        } else {
          console.warn(
            "⚠️ handleUserDeleted não está definido, pulando fila USER_DELETED"
          );
        }
      } catch (error) {
        console.error("❌ Erro no consumidor da fila USER_DELETED:", error);
      }
    });
  }

  // ✅ CONSUMIR FILA: USER_LOGGED_IN
  async consumeUserLoggedInQueue() {
    setImmediate(async () => {
      try {
        // ✅ VERIFICAR SE O MÉTODO EXISTE ANTES DE CHAMAR .bind()
        if (typeof this.handleUserLoggedIn === "function") {
          await redisService.consumeQueue(
            this.queues.USER_LOGGED_IN_MAIN,
            this.handleUserLoggedIn.bind(this),
            {
              maxRetries: config.settings.maxRetries,
              timeout: config.settings.queueTimeout,
            }
          );
        } else {
          console.warn(
            "⚠️ handleUserLoggedIn não está definido, pulando fila USER_LOGGED_IN"
          );
        }
      } catch (error) {
        console.error("❌ Erro no consumidor da fila USER_LOGGED_IN:", error);
      }
    });
  }

  // ===============================
  // 🎯 HANDLER: Quando usuário é criado no backend-user
  // ===============================
  async handleUserCreated(message) {
    try {
      console.log("\n👤 [BACKEND-MAIN] EVENTO: Usuário CRIADO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const userData = message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. CRIAR DADOS INICIAIS DO USUÁRIO NO MAIN-SERVICE
      await this.initializeUserData(userData);

      // 2. CRIAR LISTA DE FAVORITOS VAZIA
      await this.createEmptyFavorites(userData.id);

      // 3. INICIALIZAR HISTÓRICO DE RESERVAS
      await this.initializeReservationHistory(userData.id);

      // 4. CRIAR PREFERÊNCIAS PADRÃO
      await this.createDefaultPreferences(userData.id);

      console.log(`✅ Dados iniciais criados para usuário: ${userData.email}`);
    } catch (error) {
      console.error("❌ Erro ao processar USER_CREATED:", error);
      throw error;
    }
  }

  // ===============================
  // 🎯 HANDLER: Quando usuário é deletado no backend-user
  // ===============================
  async handleUserDeleted(message) {
    try {
      console.log("\n🗑️ [BACKEND-MAIN] EVENTO: Usuário DELETADO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const { userId, email } = message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. DELETAR FAVORITOS DO USUÁRIO
      await this.deleteUserFavorites(userId);

      // 2. CANCELAR RESERVAS FUTURAS
      await this.cancelFutureReservations(userId);

      // 3. LIMPAR HISTÓRICO
      await this.clearUserHistory(userId);

      // 4. REMOVER PREFERÊNCIAS
      await this.removeUserPreferences(userId);

      console.log(`✅ Dados removidos para usuário: ${email}`);
    } catch (error) {
      console.error("❌ Erro ao processar USER_DELETED:", error);
      throw error;
    }
  }

  // ===============================
  // 🎯 HANDLER: Quando usuário faz login
  // ===============================
  async handleUserLoggedIn(message) {
    try {
      console.log("\n🔐 [BACKEND-MAIN] EVENTO: Usuário LOGADO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const { userId, email } = message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. ATUALIZAR ÚLTIMO LOGIN
      await this.updateLastLogin(userId);

      // 2. ATUALIZAR ESTATÍSTICAS
      await this.updateUserStats(userId);

      // 3. REGISTRAR ATIVIDADE
      await this.logUserActivity(userId, "login");

      console.log(`✅ Login registrado para usuário: ${email}`);
    } catch (error) {
      console.error("❌ Erro ao processar USER_LOGGED_IN:", error);
      // Não throw error aqui, pois login é menos crítico
    }
  }

  // ===============================
  // 🔧 MÉTODOS AUXILIARES (STUBS - IMPLEMENTE CONFORME SUA LÓGICA)
  // ===============================

  async initializeUserData(userData) {
    console.log(`📝 [INIT] Dados iniciais criados para usuário ${userData.id}`);
    // Implemente sua lógica aqui
  }

  async createEmptyFavorites(userId) {
    console.log(
      `⭐ [FAVORITES] Lista de favoritos criada para usuário ${userId}`
    );
    // Implemente sua lógica aqui
  }

  async initializeReservationHistory(userId) {
    console.log(
      `📅 [RESERVATIONS] Histórico inicializado para usuário ${userId}`
    );
    // Implemente sua lógica aqui
  }

  async createDefaultPreferences(userId) {
    console.log(
      `⚙️ [PREFERENCES] Preferências padrão criadas para usuário ${userId}`
    );
    // Implemente sua lógica aqui
  }

  async deleteUserFavorites(userId) {
    console.log(`🗑️ [FAVORITES] Favoritos removidos para usuário ${userId}`);
    // Implemente sua lógica aqui
  }

  async cancelFutureReservations(userId) {
    console.log(
      `❌ [RESERVATIONS] Reservas futuras canceladas para usuário ${userId}`
    );
    // Implemente sua lógica aqui
  }

  async clearUserHistory(userId) {
    console.log(`📊 [HISTORY] Histórico limpo para usuário ${userId}`);
    // Implemente sua lógica aqui
  }

  async removeUserPreferences(userId) {
    console.log(
      `⚙️ [PREFERENCES] Preferências removidas para usuário ${userId}`
    );
    // Implemente sua lógica aqui
  }

  async updateLastLogin(userId) {
    console.log(`🔐 [STATS] Último login atualizado para usuário ${userId}`);
    // Implemente sua lógica aqui
  }

  async updateUserStats(userId) {
    console.log(`📈 [STATS] Estatísticas atualizadas para usuário ${userId}`);
    // Implemente sua lógica aqui
  }

  async logUserActivity(userId, activityType) {
    console.log(
      `📝 [ACTIVITY] ${activityType} registrado para usuário ${userId}`
    );
    // Implemente sua lógica aqui
  }

  // ===============================
  // 🔧 MÉTODOS DE UTILIDADE
  // ===============================

  getStatus() {
    return {
      service: "event-consumer",
      type: "redis",
      queues: [
        this.queues.USER_CREATED_MAIN,
        this.queues.USER_DELETED_MAIN,
        this.queues.USER_LOGGED_IN_MAIN,
      ],
      channels: [
        this.channels.USER_CREATED,
        this.channels.USER_DELETED,
        this.channels.USER_LOGGED_IN,
      ],
      status: this.initialized ? "active" : "inactive",
      redisConnected: redisService.isConnected,
      timestamp: new Date().toISOString(),
    };
  }

  // Health check
  async healthCheck() {
    try {
      const redisHealth = await redisService.healthCheck();

      return {
        healthy: redisHealth.healthy && this.initialized,
        redis: redisHealth,
        queues: [
          {
            name: this.queues.USER_CREATED_MAIN,
            status: "configured",
          },
          {
            name: this.queues.USER_DELETED_MAIN,
            status: "configured",
          },
          {
            name: this.queues.USER_LOGGED_IN_MAIN,
            status: "configured",
          },
        ],
        channels: [
          {
            name: this.channels.USER_CREATED,
            status: "subscribed",
          },
          {
            name: this.channels.USER_DELETED,
            status: "subscribed",
          },
          {
            name: this.channels.USER_LOGGED_IN,
            status: "subscribed",
          },
        ],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Limpar recursos
  async cleanup() {
    try {
      await redisService.close();
      this.initialized = false;
      console.log("🧹 EventConsumer limpo");
    } catch (error) {
      console.error("❌ Erro ao limpar EventConsumer:", error);
    }
  }
}

module.exports = new EventConsumer();
