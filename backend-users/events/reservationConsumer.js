const config = require("../shared/config/rabbitmq");

class ReservationConsumer {
  constructor() {
    this.queues = config.queues;
    this.exchanges = config.exchanges;
    this.routingKeys = config.routingKeys;
    this.messagingService = null;
    this.initialized = false;
    this.retryCount = 0;
    this.maxRetries = 10;
  }

  async getMessagingService() {
    if (this.messagingService) {
      return this.messagingService;
    }

    try {
      // Tenta carregar o módulo dinamicamente
      this.messagingService = require("../shared/messaging/messagingService");
      console.log("✅ messagingService carregado com sucesso");
      return this.messagingService;
    } catch (error) {
      this.retryCount++;
      if (this.retryCount <= this.maxRetries) {
        console.log(`⏳ Tentativa ${this.retryCount}/${this.maxRetries} - messagingService não disponível, tentando novamente em 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.getMessagingService(); // Retry recursivo
      } else {
        console.error("❌ messagingService não pôde ser carregado após várias tentativas");
        // Mock para desenvolvimento
        this.messagingService = this.createMockService();
        return this.messagingService;
      }
    }
  }

  createMockService() {
    console.log("🔄 Usando mock do messagingService");
    return {
      isConnected: false,
      connect: async () => {
        console.log("[MOCK] Conectado ao RabbitMQ");
        this.messagingService.isConnected = true;
        return true;
      },
      consume: async (queue, exchange, routingKey, handler) => {
        console.log(`[MOCK] Configurado consumer para fila: ${queue}`);
        console.log(`[MOCK] Exchange: ${exchange}, RoutingKey: ${routingKey}`);
        return true;
      },
      sendMessage: async (exchange, routingKey, message) => {
        console.log(`[MOCK] Mensagem enviada para ${exchange}::${routingKey}:`, message);
        return true;
      }
    };
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log("🔄 Inicializando consumidores de RESERVA para backend-user...");

      // Carrega o serviço de mensagens com retry
      const messagingService = await this.getMessagingService();

      // Conectar ao RabbitMQ (se não estiver conectado)
      if (!messagingService.isConnected) {
        await messagingService.connect();
      }
      
      // ✅ ESTAS CHAMADAS CRIAM AS FILAS AUTOMATICAMENTE!
      await this.setupReservationConsumers();

      this.initialized = true;
      console.log("✅ Consumidores de RESERVA inicializados para backend-user");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores de reserva:", error);
    }
  }

  async setupReservationConsumers() {
    try {
      console.log("🔧 Configurando filas de reserva...");

      const messagingService = await this.getMessagingService();

      // ✅ CRIA reservation_created_users_queue AUTOMATICAMENTE
      await messagingService.consume(
        this.queues.RESERVATION_CREATED_USERS,
        this.exchanges.RESERVATION_EVENTS,
        this.routingKeys.RESERVATION_CREATED,
        this.handleReservationCreated.bind(this)
      );

      // ✅ CRIA reservation_cancelled_users_queue AUTOMATICAMENTE  
      await messagingService.consume(
        this.queues.RESERVATION_CANCELLED_USERS,
        this.exchanges.RESERVATION_EVENTS,
        this.routingKeys.RESERVATION_CANCELLED,
        this.handleReservationCancelled.bind(this)
      );

      console.log("🎉 Filas de RESERVA criadas automaticamente:");
      console.log("   📅 " + this.queues.RESERVATION_CREATED_USERS);
      console.log("   ❌ " + this.queues.RESERVATION_CANCELLED_USERS);

    } catch (error) {
      console.error("❌ Erro ao configurar consumidores de reserva:", error);
      throw error;
    }
  }

  async handleReservationCreated(message) {
    try {
      console.log("📅 [backend-user] EVENTO: Reserva CRIADA recebida");
      console.log("📦 Dados:", message.data);
      
      // Lógica para processar reserva criada
      // - Enviar email de confirmação
      // - Atualizar estatísticas
      
    } catch (error) {
      console.error("❌ Erro ao processar RESERVATION_CREATED:", error);
      throw error;
    }
  }

  async handleReservationCancelled(message) {
    try {
      console.log("❌ [backend-user] EVENTO: Reserva CANCELADA recebida");
      console.log("📦 Dados:", message.data);
      
      // Lógica para processar cancelamento
      // - Enviar email de cancelamento
      
    } catch (error) {
      console.error("❌ Erro ao processar RESERVATION_CANCELLED:", error);
      throw error;
    }
  }
}

module.exports = new ReservationConsumer();