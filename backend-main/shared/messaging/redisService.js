const redis = require("redis");
const { v4: uuidv4 } = require("uuid");

class RedisMessagingService {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.config = null;
  }

  async connect() {
    if (this.isConnected) {
      console.log("✅ Redis já conectado");
      return true;
    }

    if (this.connectionPromise) {
      console.log("⏳ Conexão Redis já em andamento...");
      return this.connectionPromise;
    }

    console.log("🔗 Iniciando conexão Redis...");
    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  async _connect() {
    try {
      // ✅ CARREGAR CONFIGURAÇÃO DINAMICAMENTE
      this.config = require("../config/redis");

      console.log("🔄 Conectando ao Redis...");
      console.log("📡 Config:", {
        host: this.config.settings.host,
        port: this.config.settings.port,
        hasPassword: !!this.config.settings.password,
      });

      const redisOptions = {
        socket: {
          host: this.config.settings.host,
          port: this.config.settings.port,
          connectTimeout: this.config.settings.connectionTimeout || 30000,
          lazyConnect: false,
        },
      };

      // ✅ ADICIONAR SENHA SE EXISTIR
      if (this.config.settings.password) {
        redisOptions.password = this.config.settings.password;
      }

      console.log("📦 Criando clientes Redis...");

      // ✅ CRIAR CLIENTES
      this.publisher = redis.createClient(redisOptions);
      this.subscriber = redis.createClient(redisOptions);
      this.client = redis.createClient(redisOptions);

      // ✅ CONFIGURAR EVENTOS
      this._setupEventHandlers();

      // ✅ CONECTAR CLIENTES
      console.log("⏳ Conectando clientes...");
      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect(),
        this.client.connect(),
      ]);

      // ✅ VERIFICAR CONEXÃO
      console.log("⏳ Verificando conexão...");
      const pingResult = await this.client.ping();
      if (pingResult !== "PONG") {
        throw new Error(`PING falhou: ${pingResult}`);
      }

      this.isConnected = true;
      this.connectionPromise = null;

      console.log("🎉 Redis conectado com sucesso!");
      return true;
    } catch (error) {
      console.error("💥 Falha na conexão Redis:", error.message);
      console.error("🔍 Stack:", error.stack);
      this.isConnected = false;
      this.connectionPromise = null;

      // ✅ LIMPAR RECURSOS
      await this._safeDisconnect();
      throw error;
    }
  }

  _setupEventHandlers() {
    // ✅ PUBLISHER
    this.publisher.on("connect", () => console.log("✅ Publisher conectado"));
    this.publisher.on("error", (err) => {
      console.error("❌ Publisher error:", err.message);
      this.isConnected = false;
    });

    // ✅ SUBSCRIBER
    this.subscriber.on("connect", () => console.log("✅ Subscriber conectado"));
    this.subscriber.on("error", (err) => {
      console.error("❌ Subscriber error:", err.message);
      this.isConnected = false;
    });

    // ✅ CLIENT
    this.client.on("connect", () => console.log("✅ Client conectado"));
    this.client.on("error", (err) => {
      console.error("❌ Client error:", err.message);
      this.isConnected = false;
    });
  }

  async _safeDisconnect() {
    try {
      const clients = [this.publisher, this.subscriber, this.client];
      for (const client of clients) {
        if (client && client.isOpen) {
          await client.quit().catch(() => {});
        }
      }
    } catch (error) {
      console.error("Erro ao desconectar:", error.message);
    }
  }

  /**
   * ✅ HEALTH CHECK - MÉTODO ESSENCIAL
   */
  async healthCheck() {
    try {
      if (!this.isConnected || !this.client) {
        return {
          healthy: false,
          error: "Not connected to Redis",
          isConnected: this.isConnected,
        };
      }

      const startTime = Date.now();
      const pingResult = await this.client.ping();
      const responseTime = Date.now() - startTime;

      return {
        healthy: pingResult === "PONG",
        isConnected: this.isConnected,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        isConnected: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * ✅ PUBLICAR MENSAGEM
   */
  async publish(channel, message, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const messageId = uuidv4();
      const messageEnvelope = {
        id: messageId,
        ...message,
        _metadata: {
          timestamp: new Date().toISOString(),
          service: process.env.SERVICE_NAME || "main-service",
          channel: channel,
        },
      };

      const messageString = JSON.stringify(messageEnvelope);
      const subscribersCount = await this.publisher.publish(
        channel,
        messageString
      );

      console.log(
        `📤 [Redis] Mensagem ${messageId} publicada no canal: ${channel}`
      );

      return { success: true, messageId, subscribersCount };
    } catch (error) {
      console.error(`❌ Erro ao publicar no canal ${channel}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ ENVIAR PARA FILA
   */
  async sendToQueue(queueName, message, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const messageId = uuidv4();
      const messageEnvelope = {
        id: messageId,
        ...message,
        _metadata: {
          timestamp: new Date().toISOString(),
          service: process.env.SERVICE_NAME || "main-service",
          queue: queueName,
          retryCount: 0,
        },
      };

      const messageString = JSON.stringify(messageEnvelope);
      const queueLength = await this.client.lPush(queueName, messageString);

      console.log(
        `📤 [Redis] Mensagem ${messageId} enviada para fila: ${queueName}`
      );

      return { success: true, messageId, queueLength };
    } catch (error) {
      console.error(`❌ Erro ao enviar para fila ${queueName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ CONSUMIR FILA - MÉTODO NOVO E ESSENCIAL
   */
  async consumeQueue(queueName, callback, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const timeout =
        options.timeout || this.config?.settings.queueTimeout || 5;
      const maxRetries =
        options.maxRetries || this.config?.settings.maxRetries || 3;

      console.log(`👂 [Redis] Aguardando mensagens da fila: ${queueName}`);

      // Loop infinito para consumir mensagens
      while (true) {
        try {
          // ✅ USAR brPop PARA CONSUMIR FILA (BLOCKING)
          const result = await this.client.brPop(queueName, timeout);

          if (result) {
            const { element } = result;
            try {
              const message = JSON.parse(element);
              console.log(
                `📥 [Redis] Mensagem recebida da fila ${queueName}: ${message.id}`
              );

              // Executar callback do consumer
              await callback(message);
              console.log(
                `✅ [Redis] Mensagem ${message.id} processada com sucesso`
              );
            } catch (parseError) {
              console.error(
                `❌ Erro ao processar mensagem da fila ${queueName}:`,
                parseError
              );
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao consumir da fila ${queueName}:`, error);
          await this.sleep(1000); // Aguardar 1 segundo antes de retry
        }
      }
    } catch (error) {
      console.error(`❌ Erro fatal no consumidor da fila ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * ✅ INSCREVER EM CANAL - MÉTODO NOVO E ESSENCIAL
   */
  async subscribe(channel, callback, options = {}) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      await this.subscriber.subscribe(channel, (messageString) => {
        try {
          const message = JSON.parse(messageString);
          console.log(
            `📥 [Redis] Mensagem recebida do canal ${channel}: ${message.id}`
          );
          callback(message);
        } catch (error) {
          console.error(
            `❌ Erro ao processar mensagem do canal ${channel}:`,
            error
          );
        }
      });

      console.log(`🎧 [Redis] Inscrito no canal: ${channel}`);
    } catch (error) {
      console.error(`❌ Erro ao se inscrever no canal ${channel}:`, error);
      throw error;
    }
  }

  /**
   * ✅ OBTER ESTATÍSTICAS DA FILA
   */
  async getQueueStats(queueName) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const length = await this.client.lLen(queueName);
      const dlqName = `dlq:${queueName}`;
      let dlqLength = 0;

      try {
        dlqLength = await this.client.lLen(dlqName);
      } catch (error) {
        // DLQ pode não existir ainda
      }

      return {
        queue: queueName,
        length: length,
        dlq: dlqName,
        dlqLength: dlqLength,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `❌ Erro ao obter estatísticas da fila ${queueName}:`,
        error.message
      );
      return {
        queue: queueName,
        length: 0,
        dlq: `dlq:${queueName}`,
        dlqLength: 0,
        error: error.message,
      };
    }
  }

  /**
   * ✅ FECHAR CONEXÃO
   */
  async close() {
    try {
      console.log("🔌 Fechando conexões Redis...");
      await this._safeDisconnect();
      this.isConnected = false;
      this.connectionPromise = null;
      console.log("✅ Conexões Redis fechadas");
    } catch (error) {
      console.error("❌ Erro ao fechar conexões Redis:", error);
    }
  }

  /**
   * ✅ UTILITÁRIOS
   */
  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      timestamp: new Date().toISOString(),
    };
  }
}

// ✅ SINGLETON PATTERN
module.exports = new RedisMessagingService();
