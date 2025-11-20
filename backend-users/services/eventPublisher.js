const messagingService = require("./messagingService");

class EventPublisher {
  // Publicar evento de usuário criado
  async userCreated(user) {
    const event = {
      eventType: "USER_CREATED",
      timestamp: new Date().toISOString(),
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    await messagingService.publish("user_events", "user.created", event);
  }

  // Publicar evento de usuário atualizado
  async userUpdated(userId, oldData, newData) {
    const event = {
      eventType: "USER_UPDATED",
      timestamp: new Date().toISOString(),
      data: {
        userId,
        oldData,
        newData,
      },
    };

    await messagingService.publish("user_events", "user.updated", event);
  }

  // Publicar evento de usuário deletado
  async userDeleted(userId, email) {
    const event = {
      eventType: "USER_DELETED",
      timestamp: new Date().toISOString(),
      data: {
        userId,
        email,
      },
    };

    await messagingService.publish("user_events", "user.deleted", event);
  }

  // Publicar evento de login
  async userLoggedIn(userId, email) {
    const event = {
      eventType: "USER_LOGGED_IN",
      timestamp: new Date().toISOString(),
      data: {
        userId,
        email,
      },
    };

    await messagingService.publish("user_events", "user.logged_in", event);
  }
}

module.exports = new EventPublisher();
