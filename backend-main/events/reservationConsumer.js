const messagingService = require("../shared/messaging/messagingService");
const config = require("../shared/config/rabbitmq");

class ReservationConsumer {
  constructor() {
    this.queues = config.queues;
    this.exchanges = config.exchanges;
    this.routingKeys = config.routingKeys;
  }

  async initialize() {
    try {
      console.log("🔄 Inicializando consumidores de reserva para backend-user...");

      await messagingService.connect();
      
      // Consumir eventos de reserva
      await this.setupReservationConsumers();

      console.log("✅ Consumidores de reserva inicializados para backend-user");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores de reserva:", error);
    }
  }

  async setupReservationConsumers() {
    // Consumir RESERVATION_CREATED
    await messagingService.consume(
      this.queues.RESERVATION_CREATED_USERS,
      this.exchanges.RESERVATION_EVENTS,
      this.routingKeys.RESERVATION_CREATED,
      this.handleReservationCreated.bind(this)
    );

    // Consumir RESERVATION_CANCELLED
    await messagingService.consume(
      this.queues.RESERVATION_CANCELLED_USERS,
      this.exchanges.RESERVATION_EVENTS,
      this.routingKeys.RESERVATION_CANCELLED,
      this.handleReservationCancelled.bind(this)
    );

    console.log("👂 Consumidores de reserva configurados no backend-user");
  }

  // HANDLER: Quando reserva é criada no backend-main
  async handleReservationCreated(message) {
    try {
      console.log("📅 [backend-user] EVENTO: Reserva criada recebida");
      console.log("📦 Dados:", message.data);
      
      const reservationData = message.data;
      
      // Aqui você pode:
      // - Atualizar estatísticas do usuário
      // - Enviar notificação por email
      // - Atualizar dashboard admin
      // - Registrar atividade do usuário
      
      console.log(`✅ Reserva ${reservationData.id} processada para usuário: ${reservationData.userId}`);
      
    } catch (error) {
      console.error("❌ Erro ao processar RESERVATION_CREATED:", error);
      throw error;
    }
  }

  // HANDLER: Quando reserva é cancelada
  async handleReservationCancelled(message) {
    try {
      console.log("❌ [backend-user] EVENTO: Reserva cancelada recebida");
      console.log("📦 Dados:", message.data);
      
      const { reservationId, reason } = message.data;
      
      // Aqui você pode:
      // - Atualizar estatísticas
      // - Enviar email de cancelamento
      // - Registrar motivo do cancelamento
      // - Notificar administradores
      
      console.log(`✅ Reserva ${reservationId} cancelada. Motivo: ${reason}`);
      
    } catch (error) {
      console.error("❌ Erro ao processar RESERVATION_CANCELLED:", error);
      throw error;
    }
  }
}

module.exports = new ReservationConsumer();