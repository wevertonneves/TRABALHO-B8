const rabbitMQ = require("../config/rabbitmq");
const userSyncService = require("./userSyncService");

class UserEventConsumer {
  constructor() {
    this.queues = {
      USER_CREATED: "user_created_queue",
      USER_UPDATED: "user_updated_queue",
      USER_DELETED: "user_deleted_queue",
    };
  }

  async start() {
    try {
      const channel = await rabbitMQ.getChannel();
      if (!channel) {
        console.log("⚠️ RabbitMQ não disponível, tentando novamente em 10s...");
        setTimeout(() => this.start(), 10000);
        return;
      }

      // Declara as queues
      for (const queue of Object.values(this.queues)) {
        await channel.assertQueue(queue, { durable: true });
      }

      // Bind das queues com a exchange
      await channel.bindQueue(
        this.queues.USER_CREATED,
        "user_events",
        "user.created"
      );
      await channel.bindQueue(
        this.queues.USER_UPDATED,
        "user_events",
        "user.updated"
      );
      await channel.bindQueue(
        this.queues.USER_DELETED,
        "user_events",
        "user.deleted"
      );

      // Consumir eventos
      this.consumeUserCreated(channel);
      this.consumeUserDeleted(channel);

      console.log("✅ Consumers de usuários iniciados");
    } catch (error) {
      console.error("❌ Erro ao iniciar consumers:", error);
      setTimeout(() => this.start(), 10000);
    }
  }

  async consumeUserCreated(channel) {
    await channel.consume(this.queues.USER_CREATED, async (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());
          console.log("📥 Processando user.created:", event.data.email);

          // Sincronizar com banco principal
          await userSyncService.syncUserToMainDB(event.data);

          channel.ack(msg);
        } catch (error) {
          console.error("❌ Erro ao processar user.created:", error);
          channel.nack(msg, false, false);
        }
      }
    });
  }

  async consumeUserDeleted(channel) {
    await channel.consume(this.queues.USER_DELETED, async (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());
          console.log("📥 Processando user.deleted:", event.data.id);

          // Remover do banco principal
          await userSyncService.removeUserFromMainDB(event.data.id);

          channel.ack(msg);
        } catch (error) {
          console.error("❌ Erro ao processar user.deleted:", error);
          channel.nack(msg, false, false);
        }
      }
    });
  }
}

module.exports = new UserEventConsumer();
