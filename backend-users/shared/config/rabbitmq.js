module.exports = {
  exchanges: {
    USER_EVENTS: "user_events",
    RESERVATION_EVENTS: "reservation_events",
    NOTIFICATION_EVENTS: "notification_events",
    FAVORITE_EVENTS: "favorite_events", // ✅ NOVA EXCHANGE PARA FAVORITOS
  },

  routingKeys: {
    // User Events
    USER_CREATED: "user.created",
    USER_UPDATED: "user.updated",
    USER_DELETED: "user.deleted",
    USER_LOGGED_IN: "user.logged_in",

    // Reservation Events
    RESERVATION_CREATED: "reservation.created",
    RESERVATION_CANCELLED: "reservation.cancelled",
    RESERVATION_UPDATED: "reservation.updated",

    // ✅ FAVORITE EVENTS (NOVOS)
    FAVORITE_ADDED: "favorite.added",
    FAVORITE_REMOVED: "favorite.removed",

    // Notification Events
    EMAIL_NOTIFICATION: "notification.email",
    PUSH_NOTIFICATION: "notification.push",
  },

  queues: {
    // User Service Queues
    USER_DELETED_MAIN: "user_deleted_main_queue",
    USER_CREATED_MAIN: "user_created_main_queue",

    // Main Service Queues
    RESERVATION_CREATED_USERS: "reservation_created_users_queue",
    RESERVATION_CANCELLED_USERS: "reservation_cancelled_users_queue",

    // ✅ FAVORITE QUEUES (NOVAS)
    FAVORITE_ADDED_USERS: "favorite_added_users_queue",
    FAVORITE_REMOVED_USERS: "favorite_removed_users_queue",

    // Notification Service Queues
    EMAIL_NOTIFICATIONS: "email_notifications_queue",
    PUSH_NOTIFICATIONS: "push_notifications_queue",
  },

  // ✅ CONFIGURAÇÕES ADICIONAIS (OPCIONAL)
  settings: {
    // Configurações de retry
    maxRetries: 3,
    retryDelay: 5000, // 5 segundos
    
    // Configurações de DLQ
    dlqEnabled: true,
    dlqSuffix: ".dlq",
    
    // Timeouts
    connectionTimeout: 30000,
    heartbeat: 60,
  },

  // ✅ MÉTODOS ÚTEIS (OPCIONAL)
  getExchange: function(eventType) {
    const exchangeMap = {
      USER_CREATED: this.exchanges.USER_EVENTS,
      USER_UPDATED: this.exchanges.USER_EVENTS,
      USER_DELETED: this.exchanges.USER_EVENTS,
      USER_LOGGED_IN: this.exchanges.USER_EVENTS,
      
      RESERVATION_CREATED: this.exchanges.RESERVATION_EVENTS,
      RESERVATION_CANCELLED: this.exchanges.RESERVATION_EVENTS,
      RESERVATION_UPDATED: this.exchanges.RESERVATION_EVENTS,
      
      FAVORITE_ADDED: this.exchanges.FAVORITE_EVENTS,
      FAVORITE_REMOVED: this.exchanges.FAVORITE_EVENTS,
      
      EMAIL_NOTIFICATION: this.exchanges.NOTIFICATION_EVENTS,
      PUSH_NOTIFICATION: this.exchanges.NOTIFICATION_EVENTS,
    };
    
    return exchangeMap[eventType] || this.exchanges.USER_EVENTS;
  },

  getRoutingKey: function(eventType) {
    return this.routingKeys[eventType] || "unknown.event";
  },

  getQueue: function(eventType, service) {
    const queueMap = {
      // Backend-main publica, backend-user consome
      RESERVATION_CREATED: this.queues.RESERVATION_CREATED_USERS,
      RESERVATION_CANCELLED: this.queues.RESERVATION_CANCELLED_USERS,
      FAVORITE_ADDED: this.queues.FAVORITE_ADDED_USERS,
      FAVORITE_REMOVED: this.queues.FAVORITE_REMOVED_USERS,
      
      // Backend-user publica, backend-main consome  
      USER_CREATED: this.queues.USER_CREATED_MAIN,
      USER_DELETED: this.queues.USER_DELETED_MAIN,
    };
    
    return queueMap[eventType] || `${eventType.toLowerCase()}_queue`;
  },

  // ✅ VALIDAÇÃO DE CONFIGURAÇÃO
  validateConfig: function() {
    const required = ['exchanges', 'routingKeys', 'queues'];
    const missing = required.filter(section => !this[section]);
    
    if (missing.length > 0) {
      throw new Error(`Configuração RabbitMQ incompleta. Seções faltando: ${missing.join(', ')}`);
    }

    // Verificar se todas as routing keys têm exchanges correspondentes
    for (const [key, routingKey] of Object.entries(this.routingKeys)) {
      if (!routingKey) {
        console.warn(`⚠️ Routing key vazia para: ${key}`);
      }
    }

    console.log('✅ Configuração RabbitMQ validada com sucesso');
    return true;
  }
};