const redisService = require("./redisService");

// ✅ CONFIGURAÇÃO DIRETA - SEM DEPENDÊNCIA EXTERNA
const config = {
  channels: {
    USER_CREATED: "user:created",
    USER_UPDATED: "user:updated",
    USER_DELETED: "user:deleted",
    USER_LOGGED_IN: "user:logged_in",
    RESERVATION_CREATED: "reservation:created",
    RESERVATION_CANCELLED: "reservation:cancelled",
    RESERVATION_UPDATED: "reservation:updated",
    FAVORITE_ADDED: "favorite:added",
    FAVORITE_REMOVED: "favorite:removed",
    FAVORITES_CLEARED: "favorite:cleared",
    EMAIL_NOTIFICATION: "notification:email",
    PUSH_NOTIFICATION: "notification:push",
    HEALTH_CHECK: "health:check",
  },
  queues: {
    USER_DELETED_MAIN: "queue:user_deleted_main",
    USER_CREATED_MAIN: "queue:user_created_main",
    USER_LOGGED_IN_MAIN: "queue:user_logged_in_main",
    RESERVATION_CREATED_USERS: "queue:reservation_created_users",
    RESERVATION_CANCELLED_USERS: "queue:reservation_cancelled_users",
    FAVORITE_ADDED_USERS: "queue:favorite_added_users",
    FAVORITE_REMOVED_USERS: "queue:favorite_removed_users",
    EMAIL_NOTIFICATIONS: "queue:email_notifications",
    PUSH_NOTIFICATIONS: "queue:push_notifications",
    DLQ_PREFIX: "dlq:",
  },
  getChannel: function (eventType) {
    return this.channels[eventType] || `event:${eventType.toLowerCase()}`;
  },
  getQueue: function (eventType, service) {
    const queueMap = {
      RESERVATION_CREATED: this.queues.RESERVATION_CREATED_USERS,
      RESERVATION_CANCELLED: this.queues.RESERVATION_CANCELLED_USERS,
      FAVORITE_ADDED: this.queues.FAVORITE_ADDED_USERS,
      FAVORITE_REMOVED: this.queues.FAVORITE_REMOVED_USERS,
      USER_CREATED: this.queues.USER_CREATED_MAIN,
      USER_DELETED: this.queues.USER_DELETED_MAIN,
      USER_LOGGED_IN: this.queues.USER_LOGGED_IN_MAIN,
      EMAIL_NOTIFICATION: this.queues.EMAIL_NOTIFICATIONS,
      PUSH_NOTIFICATION: this.queues.PUSH_NOTIFICATIONS,
    };
    return queueMap[eventType] || `queue:${eventType.toLowerCase()}`;
  },
  getDLQ: function (queueName) {
    return `${this.queues.DLQ_PREFIX}${queueName}`;
  },
};

class EventPublisher {
  // ✅ MÉTODO GERAL PARA TODOS OS EVENTOS - VERSÃO NÃO-BLOQUEANTE
  async publishEvent(eventType, data, options = {}) {
    try {
      const channel = config.getChannel(eventType);
      const queue = config.getQueue(eventType, options.service);

      const event = {
        eventType,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      };

      // ✅ PUBLICAÇÃO NÃO-BLOQUEANTE - SEM AWAIT
      if (options.useQueue !== false) {
        // Fire and forget - não bloqueia a resposta
        redisService
          .sendToQueue(queue, event, options)
          .then((result) => {
            if (result.success) {
              console.log(
                `📤 [EventPublisher] ${eventType} enviado para fila: ${queue}`
              );
            } else {
              console.error(
                `❌ [EventPublisher] Falha ao enviar para fila ${eventType}:`,
                result.error
              );
            }
          })
          .catch((error) => {
            console.error(
              `❌ [EventPublisher] Erro ao enviar para fila ${eventType}:`,
              error.message
            );
          });
      } else {
        // Fire and forget - não bloqueia a resposta
        redisService
          .publish(channel, event, options)
          .then((result) => {
            if (result.success) {
              console.log(
                `📤 [EventPublisher] ${eventType} publicado no canal: ${channel}`
              );
            } else {
              console.error(
                `❌ [EventPublisher] Falha ao publicar ${eventType}:`,
                result.error
              );
            }
          })
          .catch((error) => {
            console.error(
              `❌ [EventPublisher] Erro ao publicar ${eventType}:`,
              error.message
            );
          });
      }

      // ✅ RETORNA SUCESSO IMEDIATAMENTE
      return { success: true, messageId: "fire-and-forget" };
    } catch (error) {
      console.error(
        `❌ [EventPublisher] Erro crítico ao publicar ${eventType}:`,
        error
      );
      // ✅ NÃO REJEITA - retorna sucesso mesmo com erro
      return { success: true, error: error.message };
    }
  }

  // USER EVENTS
  async userCreated(user) {
    return await this.publishEvent(
      "USER_CREATED",
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
      { service: "main" }
    );
  }

  async userUpdated(userId, oldData, newData) {
    return await this.publishEvent(
      "USER_UPDATED",
      {
        userId,
        oldData,
        newData,
        updatedAt: new Date().toISOString(),
      },
      { service: "main" }
    );
  }

  async userDeleted(userId, userData) {
    return await this.publishEvent(
      "USER_DELETED",
      {
        userId,
        email: userData.email,
        deletedAt: new Date().toISOString(),
      },
      { service: "main" }
    );
  }

  async userLoggedIn(userId, email) {
    return await this.publishEvent(
      "USER_LOGGED_IN",
      {
        userId,
        email,
        loginAt: new Date().toISOString(),
      },
      { service: "main" }
    );
  }

  // RESERVATION EVENTS
  async reservationCreated(reservation) {
    return await this.publishEvent(
      "RESERVATION_CREATED",
      {
        id: reservation.id,
        userId: reservation.userId,
        placeId: reservation.placeId,
        reservedAt: reservation.reservedAt,
        peopleCount: reservation.peopleCount,
        status: reservation.status || "confirmed",
        createdAt: reservation.createdAt || new Date().toISOString(),
      },
      { service: "users" }
    );
  }

  async reservationCancelled(reservationId, reason) {
    return await this.publishEvent(
      "RESERVATION_CANCELLED",
      {
        reservationId,
        reason,
        cancelledAt: new Date().toISOString(),
      },
      { service: "users" }
    );
  }

  async reservationUpdated(reservationId, updates) {
    return await this.publishEvent(
      "RESERVATION_UPDATED",
      {
        reservationId,
        updates,
        updatedAt: new Date().toISOString(),
      },
      { service: "users" }
    );
  }

  // FAVORITE EVENTS
  async favoriteAdded(userId, placeId, favoriteData = {}) {
    return await this.publishEvent(
      "FAVORITE_ADDED",
      {
        userId,
        placeId,
        favoriteData,
        addedAt: new Date().toISOString(),
      },
      { service: "users" }
    );
  }

  async favoriteRemoved(userId, placeId) {
    return await this.publishEvent(
      "FAVORITE_REMOVED",
      {
        userId,
        placeId,
        removedAt: new Date().toISOString(),
      },
      { service: "users" }
    );
  }

  async favoritesCleared(userId) {
    return await this.publishEvent(
      "FAVORITES_CLEARED",
      {
        userId,
        clearedAt: new Date().toISOString(),
      },
      { service: "users" }
    );
  }

  // NOTIFICATION EVENTS
  async sendEmailNotification(to, subject, template, data) {
    return await this.publishEvent("EMAIL_NOTIFICATION", {
      to,
      subject,
      template,
      data,
      scheduledFor: new Date().toISOString(),
    });
  }

  async sendPushNotification(userId, title, message, data) {
    return await this.publishEvent("PUSH_NOTIFICATION", {
      userId,
      title,
      message,
      data,
      sentAt: new Date().toISOString(),
    });
  }

  // ✅ HEALTH CHECK
  async healthCheck() {
    try {
      const result = await redisService.healthCheck();

      return {
        healthy: result.healthy,
        timestamp: new Date().toISOString(),
        service: "event-publisher",
        redis: result,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "event-publisher",
      };
    }
  }

  // ✅ BATCH PUBLISHING
  async publishBatch(events) {
    const results = [];

    for (const event of events) {
      try {
        const { eventType, data, options } = event;
        const result = await this.publishEvent(eventType, data, options);
        results.push({
          eventType,
          success: result.success,
          messageId: result.messageId,
        });
      } catch (error) {
        results.push({ eventType, success: false, error: error.message });
      }
    }

    return results;
  }

  // ✅ OBTER ESTATÍSTICAS
  async getStats(eventType) {
    try {
      const queue = config.getQueue(eventType);
      return await redisService.getQueueStats(queue);
    } catch (error) {
      console.error(`❌ Erro ao obter estatísticas para ${eventType}:`, error);
      return null;
    }
  }
}

module.exports = new EventPublisher();
