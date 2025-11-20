const messagingService = require("./messagingService");
const config = require("../config/rabbitmq");

class EventPublisher {
  // USER EVENTS
  async userCreated(user) {
    const event = {
      eventType: "USER_CREATED",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
    };

    return await messagingService.publish("user_events", "user.created", event);
  }

  async userUpdated(userId, oldData, newData) {
    const event = {
      eventType: "USER_UPDATED",
      data: {
        userId,
        oldData,
        newData,
        updatedAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish("user_events", "user.updated", event);
  }

  async userDeleted(userId, userData) {
    const event = {
      eventType: "USER_DELETED",
      data: {
        userId,
        email: userData.email,
        deletedAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish("user_events", "user.deleted", event);
  }

  async userLoggedIn(userId, email) {
    const event = {
      eventType: "USER_LOGGED_IN",
      data: {
        userId,
        email,
        loginAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "user_events",
      "user.logged_in",
      event
    );
  }

  // RESERVATION EVENTS
  async reservationCreated(reservation) {
    const event = {
      eventType: "RESERVATION_CREATED",
      data: {
        id: reservation.id,
        userId: reservation.userId,
        placeId: reservation.placeId,
        reservedAt: reservation.reservedAt,
        peopleCount: reservation.peopleCount,
        status: reservation.status || 'confirmed',
        createdAt: reservation.createdAt || new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "reservation_events",
      "reservation.created",
      event
    );
  }

  async reservationCancelled(reservationId, reason) {
    const event = {
      eventType: "RESERVATION_CANCELLED",
      data: {
        reservationId,
        reason,
        cancelledAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "reservation_events",
      "reservation.cancelled",
      event
    );
  }

  async reservationUpdated(reservationId, updates) {
    const event = {
      eventType: "RESERVATION_UPDATED",
      data: {
        reservationId,
        updates,
        updatedAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "reservation_events",
      "reservation.updated",
      event
    );
  }

  // ✅ FAVORITE EVENTS (NOVOS)
  async favoriteAdded(userId, placeId, favoriteData = {}) {
    const event = {
      eventType: "FAVORITE_ADDED",
      data: {
        userId,
        placeId,
        favoriteData,
        addedAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "favorite_events",
      "favorite.added",
      event
    );
  }

  async favoriteRemoved(userId, placeId) {
    const event = {
      eventType: "FAVORITE_REMOVED",
      data: {
        userId,
        placeId,
        removedAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "favorite_events",
      "favorite.removed",
      event
    );
  }

  async favoritesCleared(userId) {
    const event = {
      eventType: "FAVORITES_CLEARED",
      data: {
        userId,
        clearedAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "favorite_events",
      "favorites.cleared",
      event
    );
  }

  // NOTIFICATION EVENTS
  async sendEmailNotification(to, subject, template, data) {
    const event = {
      eventType: "EMAIL_NOTIFICATION",
      data: {
        to,
        subject,
        template,
        data,
        scheduledFor: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "notification_events",
      "notification.email",
      event
    );
  }

  async sendPushNotification(userId, title, message, data) {
    const event = {
      eventType: "PUSH_NOTIFICATION",
      data: {
        userId,
        title,
        message,
        data,
        sentAt: new Date().toISOString(),
      },
    };

    return await messagingService.publish(
      "notification_events",
      "notification.push",
      event
    );
  }

  // ✅ MÉTODOS UTILITÁRIOS (NOVOS)
  async publishEvent(eventType, data, customRoutingKey = null) {
    try {
      const exchange = config.getExchange(eventType);
      const routingKey = customRoutingKey || config.getRoutingKey(eventType);
      
      const event = {
        eventType,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      };

      const published = await messagingService.publish(exchange, routingKey, event);
      
      if (published) {
        console.log(`📤 [EventPublisher] ${eventType} publicado para: ${routingKey}`);
      } else {
        console.error(`❌ [EventPublisher] Falha ao publicar ${eventType}`);
      }

      return published;
    } catch (error) {
      console.error(`❌ [EventPublisher] Erro ao publicar ${eventType}:`, error);
      return false;
    }
  }

  // ✅ HEALTH CHECK
  async healthCheck() {
    try {
      const testEvent = {
        eventType: "HEALTH_CHECK",
        data: {
          service: "event-publisher",
          timestamp: new Date().toISOString(),
          status: "testing"
        }
      };

      const published = await messagingService.publish(
        "user_events",
        "health.check",
        testEvent
      );

      return {
        healthy: published,
        timestamp: new Date().toISOString(),
        service: "event-publisher"
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "event-publisher"
      };
    }
  }

  // ✅ BATCH PUBLISHING (para múltiplos eventos)
  async publishBatch(events) {
    const results = [];
    
    for (const event of events) {
      try {
        const { eventType, data, routingKey } = event;
        const result = await this.publishEvent(eventType, data, routingKey);
        results.push({ eventType, success: result });
      } catch (error) {
        results.push({ eventType, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new EventPublisher();