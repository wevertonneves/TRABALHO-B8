const redisService = require("../shared/messaging/redisService");

// ✅ CONFIGURAÇÃO DIRETA
const config = {
  channels: {
    RESERVATION_CREATED: "reservation:created",
    RESERVATION_CANCELLED: "reservation:cancelled",
  },
  queues: {
    RESERVATION_CREATED_USERS: "queue:reservation_created_users",
    RESERVATION_CANCELLED_USERS: "queue:reservation_cancelled_users",
  },
  settings: {
    maxRetries: 3,
    queueTimeout: 5,
  },
};

class ReservationConsumer {
  constructor() {
    this.queues = config.queues;
    this.channels = config.channels;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log(
        "🔄 Inicializando consumidores de RESERVA para backend-user (Redis)..."
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
      console.log("✅ Consumidores de RESERVA inicializados com Redis");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores de reserva:", error);
      // Tentar reconectar após 5 segundos
      setTimeout(() => this.initialize(), 5000);
    }
  }

  async setupQueueConsumers() {
    try {
      console.log("🔧 Configurando consumidores de filas para reservas...");

      // ✅ CONSUMIR FILA: RESERVA CRIADA
      this.consumeReservationCreatedQueue();

      // ✅ CONSUMIR FILA: RESERVA CANCELADA
      this.consumeReservationCancelledQueue();

      console.log("🎉 Consumidores de filas configurados:");
      console.log("   📅 " + this.queues.RESERVATION_CREATED_USERS);
      console.log("   ❌ " + this.queues.RESERVATION_CANCELLED_USERS);
    } catch (error) {
      console.error("❌ Erro ao configurar consumidores de filas:", error);
      throw error;
    }
  }

  async setupChannelSubscriptions() {
    try {
      console.log("🔧 Configurando inscrições em canais Pub/Sub...");

      // ✅ INSCREVER EM CANAL: RESERVA CRIADA (BROADCAST)
      await redisService.subscribe(
        this.channels.RESERVATION_CREATED,
        this.handleReservationCreated.bind(this)
      );

      // ✅ INSCREVER EM CANAL: RESERVA CANCELADA (BROADCAST)
      await redisService.subscribe(
        this.channels.RESERVATION_CANCELLED,
        this.handleReservationCancelled.bind(this)
      );

      console.log("🎉 Inscrito em canais Pub/Sub:");
      console.log("   📢 " + this.channels.RESERVATION_CREATED);
      console.log("   📢 " + this.channels.RESERVATION_CANCELLED);
    } catch (error) {
      console.error("❌ Erro ao configurar inscrições em canais:", error);
    }
  }

  // ✅ CONSUMIR FILA: RESERVA CRIADA
  async consumeReservationCreatedQueue() {
    // Iniciar consumo em background
    setImmediate(async () => {
      try {
        await redisService.consumeQueue(
          this.queues.RESERVATION_CREATED_USERS,
          this.handleReservationCreated.bind(this),
          {
            maxRetries: config.settings.maxRetries,
            timeout: config.settings.queueTimeout,
          }
        );
      } catch (error) {
        console.error(
          "❌ Erro no consumidor da fila RESERVATION_CREATED:",
          error
        );
      }
    });
  }

  // ✅ CONSUMIR FILA: RESERVA CANCELADA
  async consumeReservationCancelledQueue() {
    // Iniciar consumo em background
    setImmediate(async () => {
      try {
        await redisService.consumeQueue(
          this.queues.RESERVATION_CANCELLED_USERS,
          this.handleReservationCancelled.bind(this),
          {
            maxRetries: config.settings.maxRetries,
            timeout: config.settings.queueTimeout,
          }
        );
      } catch (error) {
        console.error(
          "❌ Erro no consumidor da fila RESERVATION_CANCELLED:",
          error
        );
      }
    });
  }

  // ===============================
  // 🎯 HANDLER: Reserva Criada
  // ===============================
  async handleReservationCreated(message) {
    try {
      console.log("\n📅 [BACKEND-USER] EVENTO: Reserva CRIADA recebida");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const { id, userId, placeId, reservedAt, peopleCount, status } =
        message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. ATUALIZAR ESTATÍSTICAS DO USUÁRIO
      await this.updateUserReservationStats(userId, "created");

      // 2. REGISTRAR ATIVIDADE DO USUÁRIO
      await this.logUserActivity(userId, "reservation_created", {
        reservationId: id,
        placeId,
        reservedAt,
        peopleCount,
        status,
        timestamp: new Date().toISOString(),
      });

      // 3. ENVIAR NOTIFICAÇÃO DE CONFIRMAÇÃO
      // await this.sendReservationNotification(userId, 'created', message.data);

      // 4. ATUALIZAR PREFERÊNCIAS DO USUÁRIO
      await this.updateUserPreferences(userId, placeId, "reservation");

      console.log(
        `✅ Reserva processada: Usuário ${userId} criou reserva ${id} para local ${placeId}`
      );
    } catch (error) {
      console.error("❌ Erro ao processar RESERVATION_CREATED:", error);
      throw error;
    }
  }

  // ===============================
  // 🎯 HANDLER: Reserva Cancelada
  // ===============================
  async handleReservationCancelled(message) {
    try {
      console.log("\n❌ [BACKEND-USER] EVENTO: Reserva CANCELADA recebida");
      console.log("📦 Dados recebidos:", JSON.stringify(message.data, null, 2));
      console.log("📨 Metadados:", message._metadata);

      const { reservationId, reason, cancelledAt } = message.data;

      // 🔥 AQUI VOCÊ PODE IMPLEMENTAR SUA LÓGICA:

      // 1. ATUALIZAR ESTATÍSTICAS DO USUÁRIO
      await this.updateUserReservationStats(reservationId, "cancelled");

      // 2. REGISTRAR ATIVIDADE DO USUÁRIO
      await this.logUserActivity(reservationId, "reservation_cancelled", {
        reservationId,
        reason,
        cancelledAt,
        timestamp: new Date().toISOString(),
      });

      // 3. ENVIAR NOTIFICAÇÃO DE CANCELAMENTO
      // await this.sendReservationNotification(reservationId, 'cancelled', message.data);

      console.log(
        `✅ Cancelamento processado: Reserva ${reservationId} cancelada`
      );
    } catch (error) {
      console.error("❌ Erro ao processar RESERVATION_CANCELLED:", error);
      throw error;
    }
  }

  // ===============================
  // 🔧 MÉTODOS AUXILIARES
  // ===============================

  // 📊 Atualizar estatísticas de reservas do usuário
  async updateUserReservationStats(userId, action) {
    try {
      console.log(
        `📊 [RESERVATION_STATS] ${action.toUpperCase()} - Usuário ${userId}`
      );
    } catch (error) {
      console.error(
        `❌ Erro ao atualizar estatísticas de reserva do usuário ${userId}:`,
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

  // 🎯 Atualizar preferências do usuário
  async updateUserPreferences(userId, placeId, type) {
    try {
      console.log(
        `🎯 [PREFERENCES] ${type.toUpperCase()} - Usuário ${userId}, Local ${placeId}`
      );
    } catch (error) {
      console.error(
        `❌ Erro ao atualizar preferências do usuário ${userId}:`,
        error
      );
    }
  }

  // 🔔 Enviar notificação de reserva
  async sendReservationNotification(userId, action, reservationData) {
    try {
      console.log(
        `🔔 [RESERVATION_NOTIFICATION] ${action.toUpperCase()} - Usuário ${userId}`
      );
    } catch (error) {
      console.error(
        `❌ Erro ao enviar notificação de reserva para usuário ${userId}:`,
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
      service: "reservation-consumer",
      type: "redis",
      queues: [
        this.queues.RESERVATION_CREATED_USERS,
        this.queues.RESERVATION_CANCELLED_USERS,
      ],
      channels: [
        this.channels.RESERVATION_CREATED,
        this.channels.RESERVATION_CANCELLED,
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
            name: this.queues.RESERVATION_CREATED_USERS,
            status: "configured",
          },
          {
            name: this.queues.RESERVATION_CANCELLED_USERS,
            status: "configured",
          },
        ],
        channels: [
          {
            name: this.channels.RESERVATION_CREATED,
            status: "subscribed",
          },
          {
            name: this.channels.RESERVATION_CANCELLED,
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
      console.log("🧹 ReservationConsumer limpo");
    } catch (error) {
      console.error("❌ Erro ao limpar ReservationConsumer:", error);
    }
  }
}

module.exports = new ReservationConsumer();
