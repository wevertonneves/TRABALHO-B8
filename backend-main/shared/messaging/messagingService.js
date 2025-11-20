const amqp = require("amqplib");
const path = require("path");

class MessagingService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      console.log("🔗 Conectando ao RabbitMQ...");
      this.connection = await amqp.connect(this.rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // ✅ DECLARAR TODAS AS EXCHANGES (ATUALIZADO)
      const exchanges = [
        { name: "user_events", type: "topic", options: { durable: true } },
        { name: "reservation_events", type: "topic", options: { durable: true } },
        { name: "favorite_events", type: "topic", options: { durable: true } }, // ✅ NOVA EXCHANGE
        { name: "notification_events", type: "topic", options: { durable: true } },
      ];

      for (const exchange of exchanges) {
        try {
          await this.channel.assertExchange(exchange.name, exchange.type, exchange.options);
          console.log(`✅ Exchange "${exchange.name}" declarada`);
        } catch (exchangeError) {
          console.error(`❌ Erro ao declarar exchange "${exchange.name}":`, exchangeError.message);
          throw exchangeError;
        }
      }

      this.isConnected = true;
      console.log("✅ Conectado ao RabbitMQ");

      // Handler para reconexão
      this.connection.on("close", () => {
        console.log("❌ Conexão RabbitMQ fechada. Tentando reconectar...");
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });

      this.connection.on("error", (error) => {
        console.error("❌ Erro na conexão RabbitMQ:", error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error("❌ Erro ao conectar com RabbitMQ:", error.message);
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publish(exchange, routingKey, message, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const messageBuffer = Buffer.from(
        JSON.stringify({
          ...message,
          _metadata: {
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME || "unknown",
            version: "1.0",
          },
        })
      );

      // ✅ VERIFICAR SE A EXCHANGE EXISTE ANTES DE PUBLICAR
      try {
        await this.channel.checkExchange(exchange);
      } catch (checkError) {
        console.error(`❌ Exchange "${exchange}" não encontrada. Tentando criar...`);
        await this.channel.assertExchange(exchange, "topic", { durable: true });
        console.log(`✅ Exchange "${exchange}" criada`);
      }

      const published = this.channel.publish(
        exchange,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          ...options,
        }
      );

      if (published) {
        console.log(
          `📤 [${exchange}] Mensagem publicada: ${routingKey}`
        );
        if (process.env.NODE_ENV === 'development') {
          console.log(`   📦 Conteúdo:`, JSON.stringify(message, null, 2));
        }
      } else {
        console.error(`❌ Falha ao publicar mensagem: ${routingKey}`);
      }

      return published;
    } catch (error) {
      console.error(`❌ Erro ao publicar mensagem em ${exchange}.${routingKey}:`, error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async consume(queue, exchange, routingKey, callback, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // ✅ VERIFICAR/CRIAR EXCHANGE SE NECESSÁRIO
      try {
        await this.channel.checkExchange(exchange);
      } catch (checkError) {
        console.log(`🔧 Exchange "${exchange}" não encontrada. Criando...`);
        await this.channel.assertExchange(exchange, "topic", { durable: true });
        console.log(`✅ Exchange "${exchange}" criada`);
      }

      // Configurações da queue
      const queueOptions = {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": `${exchange}.dlx`,
          ...options.queue,
        },
      };

      // Criar queue e binding
      await this.channel.assertQueue(queue, queueOptions);
      await this.channel.bindQueue(queue, exchange, routingKey);

      // Dead letter exchange para retry
      try {
        await this.channel.assertExchange(`${exchange}.dlx`, "topic", {
          durable: true,
        });
        await this.channel.assertQueue(`${queue}.dlq`, { durable: true });
        await this.channel.bindQueue(
          `${queue}.dlq`,
          `${exchange}.dlx`,
          routingKey
        );
        console.log(`✅ DLQ configurada para: ${queue}`);
      } catch (dlqError) {
        console.error(`❌ Erro ao configurar DLQ para ${queue}:`, dlqError.message);
      }

      console.log(
        `👂 [${queue}] Aguardando mensagens: ${exchange} - ${routingKey}`
      );

      // Iniciar consumo
      this.channel.consume(
        queue,
        async (message) => {
          if (message !== null) {
            try {
              const content = JSON.parse(message.content.toString());
              
              if (process.env.NODE_ENV === 'development') {
                console.log(
                  `📥 [${queue}] Mensagem recebida: ${message.fields.routingKey}`
                );
                console.log(`   📦 Conteúdo:`, JSON.stringify(content, null, 2));
              } else {
                console.log(
                  `📥 [${queue}] Mensagem recebida: ${message.fields.routingKey}`
                );
              }

              await callback(content);

              this.channel.ack(message);
              console.log(
                `✅ [${queue}] Mensagem processada: ${message.fields.routingKey}`
              );
            } catch (error) {
              console.error(`❌ [${queue}] Erro ao processar mensagem:`, error);

              // Rejeitar mensagem para DLQ após várias tentativas
              const retryCount =
                message.properties.headers?.["x-retry-count"] || 0;
              
              if (retryCount < (options.maxRetries || 3)) {
                console.log(`🔄 [${queue}] Retry ${retryCount + 1}/${options.maxRetries || 3}`);
                // Re-publicar com contador de retry
                this.channel.nack(message, false, false);
              } else {
                console.error(`💀 [${queue}] Mensagem movida para DLQ após ${retryCount} tentativas`);
                // Mover para DLQ
                this.channel.reject(message, false);
              }
            }
          }
        },
        { 
          noAck: false,
          ...options.consume 
        }
      );

      return true;
    } catch (error) {
      console.error(`❌ Erro ao consumir mensagens de ${queue}:`, error);
      throw error;
    }
  }

  // ✅ NOVO MÉTODO: VERIFICAR SE EXCHANGE EXISTE
  async exchangeExists(exchange) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.channel.checkExchange(exchange);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ✅ NOVO MÉTODO: CRIAR EXCHANGE SE NÃO EXISTIR
  async ensureExchange(exchange, type = "topic", options = { durable: true }) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.channel.assertExchange(exchange, type, options);
      console.log(`✅ Exchange "${exchange}" garantida`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao garantir exchange "${exchange}":`, error);
      return false;
    }
  }

  // ✅ NOVO MÉTODO: HEALTH CHECK
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, error: "Not connected" };
      }

      // Testar publicando uma mensagem de health check
      const testMessage = {
        eventType: "HEALTH_CHECK",
        data: { timestamp: new Date().toISOString() }
      };

      const published = await this.publish(
        "user_events",
        "health.check",
        testMessage
      );

      return {
        healthy: published && this.isConnected,
        isConnected: this.isConnected,
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

  // ✅ NOVO MÉTODO: OBTER STATUS
  getStatus() {
    return {
      isConnected: this.isConnected,
      url: this.rabbitmqUrl,
      timestamp: new Date().toISOString()
    };
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        console.log("🔌 Canal RabbitMQ fechado");
      }
      if (this.connection) {
        await this.connection.close();
        console.log("🔌 Conexão RabbitMQ fechada");
      }
      this.isConnected = false;
    } catch (error) {
      console.error("❌ Erro ao fechar conexão RabbitMQ:", error);
    }
  }
}

// Singleton pattern
module.exports = new MessagingService();