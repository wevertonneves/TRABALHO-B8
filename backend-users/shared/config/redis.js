// shared/config/redis.js - VERSÃO CORRIGIDA
module.exports = {
  // Channels (equivalentes às exchanges + routing keys)
  channels: {
    // User Channels
    USER_CREATED: "user:created",
    USER_UPDATED: "user:updated",
    USER_DELETED: "user:deleted",
    USER_LOGGED_IN: "user:logged_in",

    // Reservation Channels
    RESERVATION_CREATED: "reservation:created",
    RESERVATION_CANCELLED: "reservation:cancelled",
    RESERVATION_UPDATED: "reservation:updated",

    // Favorite Channels
    FAVORITE_ADDED: "favorite:added",
    FAVORITE_REMOVED: "favorite:removed",
    FAVORITES_CLEARED: "favorite:cleared",

    // Notification Channels
    EMAIL_NOTIFICATION: "notification:email",
    PUSH_NOTIFICATION: "notification:push",

    // Health Check
    HEALTH_CHECK: "health:check",
  },

  // Queues (Listas Redis)
  queues: {
    // User Service Queues
    USER_DELETED_MAIN: "queue:user_deleted_main",
    USER_CREATED_MAIN: "queue:user_created_main",
    USER_LOGGED_IN_MAIN: "queue:user_logged_in_main",

    // Main Service Queues
    RESERVATION_CREATED_USERS: "queue:reservation_created_users",
    RESERVATION_CANCELLED_USERS: "queue:reservation_cancelled_users",

    // Favorite Queues
    FAVORITE_ADDED_USERS: "queue:favorite_added_users",
    FAVORITE_REMOVED_USERS: "queue:favorite_removed_users",

    // Notification Service Queues
    EMAIL_NOTIFICATIONS: "queue:email_notifications",
    PUSH_NOTIFICATIONS: "queue:push_notifications",

    // Dead Letter Queues
    DLQ_PREFIX: "dlq:",
  },

  // ✅ CONFIGURAÇÕES REDIS CORRIGIDAS
  settings: {
    // Configurações de conexão
    host: process.env.REDIS_HOST || "redis", // ✅ CORRIGIDO: "redis" para Docker
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "senha123",

    // Configurações de retry
    maxRetries: 3,
    retryDelay: 5000,

    // Timeouts
    connectionTimeout: 30000, // ✅ Aumentado para 30 segundos
    queueTimeout: 5,

    // Prefixos
    keyPrefix: process.env.REDIS_PREFIX || "app:",
  },

  // ✅ MÉTODOS ÚTEIS
  getChannel: function (eventType) {
    return this.channels[eventType] || `event:${eventType.toLowerCase()}`;
  },

  getQueue: function (eventType, service) {
    const queueMap = {
      // Backend-main publica, backend-user consome
      RESERVATION_CREATED: this.queues.RESERVATION_CREATED_USERS,
      RESERVATION_CANCELLED: this.queues.RESERVATION_CANCELLED_USERS,
      FAVORITE_ADDED: this.queues.FAVORITE_ADDED_USERS,
      FAVORITE_REMOVED: this.queues.FAVORITE_REMOVED_USERS,

      // Backend-user publica, backend-main consome
      USER_CREATED: this.queues.USER_CREATED_MAIN,
      USER_DELETED: this.queues.USER_DELETED_MAIN,
      USER_LOGGED_IN: this.queues.USER_LOGGED_IN_MAIN,

      // Notifications
      EMAIL_NOTIFICATION: this.queues.EMAIL_NOTIFICATIONS,
      PUSH_NOTIFICATION: this.queues.PUSH_NOTIFICATIONS,
    };

    return queueMap[eventType] || `queue:${eventType.toLowerCase()}`;
  },

  getDLQ: function (queueName) {
    return `${this.queues.DLQ_PREFIX}${queueName}`;
  },

  // ✅ VALIDAÇÃO DE CONFIGURAÇÃO
  validateConfig: function () {
    const required = ["channels", "queues", "settings"];
    const missing = required.filter((section) => !this[section]);

    if (missing.length > 0) {
      throw new Error(
        `Configuração Redis incompleta. Seções faltando: ${missing.join(", ")}`
      );
    }

    console.log("✅ Configuração Redis validada com sucesso");
    return true;
  },
};
