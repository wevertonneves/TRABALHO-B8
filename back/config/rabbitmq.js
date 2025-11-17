const amqp = require("amqplib");

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) return this.channel;

      this.connection = await amqp.connect(
        process.env.RABBITMQ_URL || "amqp://localhost:5672"
      );
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      // Declara as exchanges
      await this.channel.assertExchange("user_events", "topic", {
        durable: true,
      });

      console.log("✅ Conectado ao RabbitMQ");
      return this.channel;
    } catch (error) {
      console.error("❌ Erro ao conectar com RabbitMQ:", error);
      // Não throw error - permite que o app funcione sem RabbitMQ
      return null;
    }
  }

  async getChannel() {
    if (!this.isConnected) {
      return await this.connect();
    }
    return this.channel;
  }

  async safePublish(exchange, routingKey, content) {
    try {
      const channel = await this.getChannel();
      if (channel) {
        await channel.publish(
          exchange,
          routingKey,
          Buffer.from(JSON.stringify(content)),
          { persistent: true }
        );
        console.log(`📤 Evento publicado: ${routingKey}`);
      }
    } catch (error) {
      console.error("❌ Erro ao publicar evento (não crítico):", error);
      // Não propaga o erro - a aplicação continua funcionando
    }
  }
}

module.exports = new RabbitMQConnection();
