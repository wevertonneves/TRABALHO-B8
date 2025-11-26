const redisService = require("../shared/messaging/redisService");

// ✅ CONFIGURAÇÃO DIRETA
const config = {
  channels: {
    FAVORITE_ADDED: "favorite:added",
    FAVORITE_REMOVED: "favorite:removed",
  },
  queues: {
    FAVORITE_ADDED_USERS: "queue:favorite_added_users",
    FAVORITE_REMOVED_USERS: "queue:favorite_removed_users",
  },
  settings: {
    maxRetries: 3,
    queueTimeout: 5,
  },
};

class FavoriteConsumer {
  constructor() {
    this.queues = config.queues;
    this.channels = config.channels;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log(
        "🔄 Inicializando consumidores de FAVORITOS para backend-user (Redis)..."
      );

      // Conectar ao Redis se não estiver conectado
      if (!redisService.isConnected) {
        await redisService.connect();
      }

      // ✅ CONFIGURAR CONSUMIDORES PARA FILAS
      await this.setupQueueConsumers();

      // ✅ OPCIONAL: INSCREVER EM CANAIS PUB/SUB
      await this.setupChannelSubscriptions();

      this.initialized = true;
      console.log("✅ Consumidores de FAVORITOS inicializados com Redis");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores de favoritos:", error);
      // Tentar reconectar após 5 segundos
      setTimeout(() => this.initialize(), 5000);
    }
  }

  async setupQueueConsumers() {
    try {
      console.log("🔧 Configurando consumidores de filas para favoritos...");

      // ✅ CONSUMIR FILA: FAVORITO ADICIONADO
      this.consumeFavoriteAddedQueue();

      // ✅ CONSUMIR FILA: FAVORITO REMOVIDO
      this.consumeFavoriteRemovedQueue();

      console.log("🎉 Consumidores de filas configurados:");
      console.log("   ⭐ " + this.queues.FAVORITE_ADDED_USERS);
      console.log("   🗑️ " + this.queues.FAVORITE_REMOVED_USERS);
    } catch (error) {
      console.error("❌ Erro ao configurar consumidores de filas:", error);
      throw error;
    }
  }

  async setupChannelSubscriptions() {
    try {
      console.log("🔧 Configurando inscrições em canais Pub/Sub...");

      // ✅ INSCREVER EM CANAL: FAVORITO ADICIONADO (BROADCAST)
      await redisService.subscribe(
        this.channels.FAVORITE_ADDED,
        this.handleFavoriteAdded.bind(this)
      );

      // ✅ INSCREVER EM CANAL: FAVORITO REMOVIDO (BROADCAST)
      await redisService.subscribe(
        this.channels.FAVORITE_REMOVED,
        this.handleFavoriteRemoved.bind(this)
      );

      console.log("🎉 Inscrito em canais Pub/Sub:");
      console.log("   📢 " + this.channels.FAVORITE_ADDED);
      console.log("   📢 " + this.channels.FAVORITE_REMOVED);
    } catch (error) {
      console.error("❌ Erro ao configurar inscrições em canais:", error);
    }
  }

  // ✅ CONSUMIR FILA: FAVORITO ADICIONADO
  async consumeFavoriteAddedQueue() {
    // Iniciar consumo em background
    setImmediate(async () => {
      try {
        await redisService.consumeQueue(
          this.queues.FAVORITE_ADDED_USERS,
          this.handleFavoriteAdded.bind(this),
          {
            maxRetries: config.settings.maxRetries,
            timeout: config.settings.queueTimeout,
          }
        );
      } catch (error) {
        console.error("❌ Erro no consumidor da fila FAVORITE_ADDED:", error);
      }
    });
  }

  // ✅ CONSUMIR FILA: FAVORITO REMOVIDO
  async consumeFavoriteRemovedQueue() {
    // Iniciar consumo em background
    setImmediate(async () => {
      try {
        await redisService.consumeQueue(
          this.queues.FAVORITE_REMOVED_USERS,
          this.handleFavoriteRemoved.bind(this),
          {
            maxRetries: config.settings.maxRetries,
            timeout: config.settings.queueTimeout,
          }
        );
      } catch (error) {
        console.error("❌ Erro no consumidor da fila FAVORITE_REMOVED:", error);
      }
    });
  }

  // ===============================
  // 🎯 HANDLER: Favorito Adicionado
  // ===============================
  async handleFavoriteAdded(message) {
    try {
      console.log("\n⭐ [BACKEND-USER] EVENTO: Favorito ADICIONADO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const { userId, placeId, favoriteData } = message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. ATUALIZAR ESTATÍSTICAS DO USUÁRIO
      await this.updateUserFavoriteStats(userId, "added");

      // 2. REGISTRAR ATIVIDADE DO USUÁRIO
      await this.logUserActivity(userId, "favorite_added", {
        placeId,
        favoriteId: favoriteData?.favoriteId,
        timestamp: new Date().toISOString(),
      });

      // 3. ENVIAR NOTIFICAÇÃO (se implementado)
      // await this.sendFavoriteNotification(userId, placeId, 'added');

      // 4. ATUALIZAR RECOMENDAÇÕES
      await this.updateUserRecommendations(userId, placeId);

      console.log(
        `✅ Favorito processado: Usuário ${userId} adicionou local ${placeId} aos favoritos`
      );
    } catch (error) {
      console.error("❌ Erro ao processar FAVORITE_ADDED:", error);
      throw error;
    }
  }

  // ===============================
  // 🎯 HANDLER: Favorito Removido
  // ===============================
  async handleFavoriteRemoved(message) {
    try {
      console.log("\n🗑️ [BACKEND-USER] EVENTO: Favorito REMOVIDO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const { userId, placeId } = message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. ATUALIZAR ESTATÍSTICAS DO USUÁRIO
      await this.updateUserFavoriteStats(userId, "removed");

      // 2. REGISTRAR ATIVIDADE DO USUÁRIO
      await this.logUserActivity(userId, "favorite_removed", {
        placeId,
        timestamp: new Date().toISOString(),
      });

      // 3. ATUALIZAR RECOMENDAÇÕES
      await this.updateUserRecommendations(userId, placeId, "removed");

      console.log(
        `✅ Favorito processado: Usuário ${userId} removeu local ${placeId} dos favoritos`
      );
    } catch (error) {
      console.error("❌ Erro ao processar FAVORITE_REMOVED:", error);
      throw error;
    }
  }

  // ===============================
  // 🔧 MÉTODOS AUXILIARES
  // ===============================

  // 📊 Atualizar estatísticas de favoritos do usuário
  async updateUserFavoriteStats(userId, action) {
    try {
      console.log(`📊 [STATS] ${action.toUpperCase()} - Usuário ${userId}`);
    } catch (error) {
      console.error(
        `❌ Erro ao atualizar estatísticas do usuário ${userId}:`,
        error
      );
    }
  }

  // 📝 Registrar atividade do usuário
  async logUserActivity(userId, activityType, metadata = {}) {
    try {
      console.log(
        `📝 [ACTIVITY] ${activityType} - Usuário ${userId}`,
        metadata
      );
    } catch (error) {
      console.error(
        `❌ Erro ao registrar atividade do usuário ${userId}:`,
        error
      );
    }
  }

  // 🎯 Atualizar recomendações do usuário
  async updateUserRecommendations(userId, placeId, action = "added") {
    try {
      console.log(
        `🎯 [RECOMMENDATIONS] ${action.toUpperCase()} - Usuário ${userId}, Local ${placeId}`
      );
    } catch (error) {
      console.error(
        `❌ Erro ao atualizar recomendações do usuário ${userId}:`,
        error
      );
    }
  }

  // 🔔 Enviar notificação (exemplo)
  async sendFavoriteNotification(userId, placeId, action) {
    try {
      console.log(
        `🔔 [NOTIFICATION] ${action.toUpperCase()} - Usuário ${userId}, Local ${placeId}`
      );
    } catch (error) {
      console.error(
        `❌ Erro ao enviar notificação para usuário ${userId}:`,
        error
      );
    }
  }

  // ===============================
  // 🔧 MÉTODOS DE UTILIDADE
  // ===============================

  // Obter status do consumer
  getStatus() {
    return {
      service: "favorite-consumer",
      type: "redis",
      queues: [
        this.queues.FAVORITE_ADDED_USERS,
        this.queues.FAVORITE_REMOVED_USERS,
      ],
      channels: [this.channels.FAVORITE_ADDED, this.channels.FAVORITE_REMOVED],
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
            name: this.queues.FAVORITE_ADDED_USERS,
            status: "configured",
          },
          {
            name: this.queues.FAVORITE_REMOVED_USERS,
            status: "configured",
          },
        ],
        channels: [
          {
            name: this.channels.FAVORITE_ADDED,
            status: "subscribed",
          },
          {
            name: this.channels.FAVORITE_REMOVED,
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
      console.log("🧹 FavoriteConsumer limpo");
    } catch (error) {
      console.error("❌ Erro ao limpar FavoriteConsumer:", error);
    }
  }
}

module.exports = new FavoriteConsumer();
