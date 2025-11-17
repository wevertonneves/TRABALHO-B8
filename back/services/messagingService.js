const amqplib = require("amqplib");

class MessagingService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 segundos
  }

  async connect() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `🔗 Tentando conectar ao RabbitMQ (tentativa ${attempt}/${this.maxRetries})...`
        );

        this.connection = await amqplib.connect(
          process.env.RABBITMQ_URL || "amqp://localhost:5672"
        );
        this.channel = await this.connection.createChannel();

        // Declarar exchange
        await this.channel.assertExchange("user_events", "topic", {
          durable: true,
        });

        this.isConnected = true;
        console.log("✅ Conectado ao RabbitMQ com sucesso");
        return;
      } catch (error) {
        console.error(`❌ Falha na tentativa ${attempt}:`, error.message);

        if (attempt === this.maxRetries) {
          console.log(
            "⚠️ RabbitMQ não disponível. A aplicação continuará sem mensageria."
          );
          this.isConnected = false;
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async publishUserEvent(eventType, userData) {
    if (!this.isConnected) {
      console.log(
        `⚠️ RabbitMQ offline - Evento não enviado: ${eventType} para ${userData.email}`
      );
      return;
    }

    try {
      const message = {
        event: eventType,
        data: userData,
        timestamp: new Date().toISOString(),
        source: "user-service",
      };

      await this.channel.publish(
        "user_events",
        eventType,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
        }
      );

      console.log(`📤 Evento publicado: ${eventType} - ${userData.email}`);
    } catch (error) {
      console.error(`❌ Erro ao publicar evento ${eventType}:`, error.message);
    }
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.isConnected = false;
    console.log("🔚 Conexão RabbitMQ fechada");
  }
}

module.exports = new MessagingService();
