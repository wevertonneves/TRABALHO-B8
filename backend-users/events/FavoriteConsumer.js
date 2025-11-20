const messagingService = require("../shared/messaging/messagingService");
const config = require("../shared/config/rabbitmq");

class FavoriteConsumer {
  constructor() {
    this.queues = config.queues;
    this.exchanges = config.exchanges;
    this.routingKeys = config.routingKeys;
  }

  async initialize() {
    try {
      console.log("🔄 Inicializando consumidores de FAVORITOS para backend-user...");

      // Conectar ao RabbitMQ se não estiver conectado
      if (!messagingService.isConnected) {
        await messagingService.connect();
      }
      
      // ✅ ESTAS CHAMADAS CRIAM AS FILAS AUTOMATICAMENTE!
      await this.setupFavoriteConsumers();

      console.log("✅ Consumidores de FAVORITOS inicializados para backend-user");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores de favoritos:", error);
    }
  }

  async setupFavoriteConsumers() {
    try {
      console.log("🔧 Configurando filas de favoritos...");

      // ✅ CRIA favorite_added_users_queue AUTOMATICAMENTE
      await messagingService.consume(
        this.queues.FAVORITE_ADDED_USERS,
        this.exchanges.FAVORITE_EVENTS,
        this.routingKeys.FAVORITE_ADDED,
        this.handleFavoriteAdded.bind(this)
      );

      // ✅ CRIA favorite_removed_users_queue AUTOMATICAMENTE
      await messagingService.consume(
        this.queues.FAVORITE_REMOVED_USERS,
        this.exchanges.FAVORITE_EVENTS,
        this.routingKeys.FAVORITE_REMOVED,
        this.handleFavoriteRemoved.bind(this)
      );

      console.log("🎉 Filas de FAVORITOS criadas automaticamente:");
      console.log("   ⭐ " + this.queues.FAVORITE_ADDED_USERS);
      console.log("   🗑️ " + this.queues.FAVORITE_REMOVED_USERS);

    } catch (error) {
      console.error("❌ Erro ao configurar consumidores de favoritos:", error);
      throw error;
    }
  }

  // ===============================
  // 🎯 HANDLER: Favorito Adicionado
  // ===============================
  async handleFavoriteAdded(message) {
    try {
      console.log("\n⭐ [BACKEND-USER] EVENTO: Favorito ADICIONADO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      
      const { userId, placeId, favoriteData } = message.data;
      
      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:
      
      // 1. ATUALIZAR ESTATÍSTICAS DO USUÁRIO
      await this.updateUserFavoriteStats(userId, 'added');
      
      // 2. REGISTRAR ATIVIDADE DO USUÁRIO
      await this.logUserActivity(userId, 'favorite_added', {
        placeId,
        favoriteId: favoriteData?.favoriteId,
        timestamp: new Date().toISOString()
      });
      
      // 3. ENVIAR NOTIFICAÇÃO (se implementado)
      // await this.sendFavoriteNotification(userId, placeId, 'added');
      
      // 4. ATUALIZAR RECOMENDAÇÕES
      await this.updateUserRecommendations(userId, placeId);
      
      console.log(`✅ Favorito processado: Usuário ${userId} adicionou local ${placeId} aos favoritos`);
      
    } catch (error) {
      console.error("❌ Erro ao processar FAVORITE_ADDED:", error);
      throw error; // Isso fará retry ou moverá para DLQ
    }
  }

  // ===============================
  // 🎯 HANDLER: Favorito Removido
  // ===============================
  async handleFavoriteRemoved(message) {
    try {
      console.log("\n🗑️ [BACKEND-USER] EVENTO: Favorito REMOVIDO recebido");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      
      const { userId, placeId } = message.data;
      
      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:
      
      // 1. ATUALIZAR ESTATÍSTICAS DO USUÁRIO
      await this.updateUserFavoriteStats(userId, 'removed');
      
      // 2. REGISTRAR ATIVIDADE DO USUÁRIO
      await this.logUserActivity(userId, 'favorite_removed', {
        placeId,
        timestamp: new Date().toISOString()
      });
      
      // 3. ATUALIZAR RECOMENDAÇÕES
      await this.updateUserRecommendations(userId, placeId, 'removed');
      
      console.log(`✅ Favorito processado: Usuário ${userId} removeu local ${placeId} dos favoritos`);
      
    } catch (error) {
      console.error("❌ Erro ao processar FAVORITE_REMOVED:", error);
      throw error; // Isso fará retry ou moverá para DLQ
    }
  }

  // ===============================
  // 🔧 MÉTODOS AUXILIARES
  // ===============================

  // 📊 Atualizar estatísticas de favoritos do usuário
  async updateUserFavoriteStats(userId, action) {
    try {
      // Exemplo: Incrementar/Decrementar contador de favoritos no perfil do usuário
      // const user = await User.findByPk(userId);
      // if (user) {
      //   if (action === 'added') {
      //     user.favorite_count = (user.favorite_count || 0) + 1;
      //   } else if (action === 'removed') {
      //     user.favorite_count = Math.max(0, (user.favorite_count || 1) - 1);
      //   }
      //   await user.save();
      //   console.log(`📊 Estatísticas atualizadas para usuário ${userId}`);
      // }
      
      console.log(`📊 [STATS] ${action.toUpperCase()} - Usuário ${userId}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar estatísticas do usuário ${userId}:`, error);
    }
  }

  // 📝 Registrar atividade do usuário
  async logUserActivity(userId, activityType, metadata = {}) {
    try {
      // Exemplo: Salvar em uma tabela de atividades
      // await UserActivity.create({
      //   user_id: userId,
      //   activity_type: activityType,
      //   metadata: JSON.stringify(metadata),
      //   created_at: new Date()
      // });
      
      console.log(`📝 [ACTIVITY] ${activityType} - Usuário ${userId}`, metadata);
    } catch (error) {
      console.error(`❌ Erro ao registrar atividade do usuário ${userId}:`, error);
    }
  }

  // 🎯 Atualizar recomendações do usuário
  async updateUserRecommendations(userId, placeId, action = 'added') {
    try {
      // Exemplo: Atualizar algoritmo de recomendações baseado nos favoritos
      // if (action === 'added') {
      //   await RecommendationEngine.addToUserPreferences(userId, placeId);
      // } else {
      //   await RecommendationEngine.removeFromUserPreferences(userId, placeId);
      // }
      
      console.log(`🎯 [RECOMMENDATIONS] ${action.toUpperCase()} - Usuário ${userId}, Local ${placeId}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar recomendações do usuário ${userId}:`, error);
    }
  }

  // 🔔 Enviar notificação (exemplo)
  async sendFavoriteNotification(userId, placeId, action) {
    try {
      // Exemplo: Enviar email ou push notification
      // const user = await User.findByPk(userId);
      // if (user && user.notification_preferences.favorites) {
      //   await NotificationService.send({
      //     to: user.email,
      //     type: 'favorite_' + action,
      //     data: { placeId, userId }
      //   });
      // }
      
      console.log(`🔔 [NOTIFICATION] ${action.toUpperCase()} - Usuário ${userId}, Local ${placeId}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar notificação para usuário ${userId}:`, error);
    }
  }

  // ===============================
  // 🔧 MÉTODOS DE UTILIDADE
  // ===============================

  // Obter status do consumer
  getStatus() {
    return {
      service: 'favorite-consumer',
      queues: [
        this.queues.FAVORITE_ADDED_USERS,
        this.queues.FAVORITE_REMOVED_USERS
      ],
      exchanges: [this.exchanges.FAVORITE_EVENTS],
      status: 'active',
      timestamp: new Date().toISOString()
    };
  }

  // Health check
  async healthCheck() {
    try {
      return {
        healthy: messagingService.isConnected,
        queues: [
          {
            name: this.queues.FAVORITE_ADDED_USERS,
            status: 'configured'
          },
          {
            name: this.queues.FAVORITE_REMOVED_USERS,
            status: 'configured'
          }
        ],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new FavoriteConsumer();