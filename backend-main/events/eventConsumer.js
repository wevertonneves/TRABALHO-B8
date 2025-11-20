
const messagingService = require("../shared/messaging/messagingService");
const config = require("../shared/config/rabbitmq");

class EventConsumer {
  constructor() {
    this.queues = config.queues;
    this.exchanges = config.exchanges;
    this.routingKeys = config.routingKeys;
  }

  async initialize() {
    try {
      console.log("🔄 Inicializando consumidores para backend-main...");

      // Consumir eventos de usuário do backend-user
      await this.setupUserConsumers();

      console.log("✅ Todos os consumidores inicializados para backend-main");
    } catch (error) {
      console.error("❌ Erro ao inicializar consumidores:", error);
    }
  }

  async setupUserConsumers() {
    // Consumir USER_CREATED - quando usuário é criado no backend-user
    await messagingService.consume(
      this.queues.USER_CREATED_MAIN,
      this.exchanges.USER_EVENTS,
      this.routingKeys.USER_CREATED,
      this.handleUserCreated.bind(this)
    );

    // Consumir USER_DELETED - quando usuário é deletado no backend-user
    await messagingService.consume(
      this.queues.USER_DELETED_MAIN,
      this.exchanges.USER_EVENTS,
      this.routingKeys.USER_DELETED,
      this.handleUserDeleted.bind(this)
    );

    // Consumir USER_LOGGED_IN - quando usuário faz login
    await messagingService.consume(
      "user_logged_in_main_queue", // Pode criar uma queue específica
      this.exchanges.USER_EVENTS,
      this.routingKeys.USER_LOGGED_IN,
      this.handleUserLoggedIn.bind(this)
    );
  }

  // HANDLER: Quando usuário é criado no backend-user
  async handleUserCreated(message) {
    try {
      console.log("👤 [backend-main] Usuário criado recebido:", message.data);
      
      const userData = message.data;
      
      // Aqui você pode inicializar dados do usuário no backend-main:
      // - Criar lista de favoritos vazia
      // - Inicializar histórico de reservas
      // - Criar preferências padrão
      
      // EXEMPLO:
      // await Favorites.create({ userId: userData.id, places: [] });
      // await UserPreferences.create({ userId: userData.id, ... });
      
      console.log(`✅ Dados iniciais criados para usuário: ${userData.email}`);
    } catch (error) {
      console.error("❌ Erro ao processar USER_CREATED:", error);
      throw error;
    }
  }

  // HANDLER: Quando usuário é deletado no backend-user
  async handleUserDeleted(message) {
    try {
      console.log("🗑️ [backend-main] Usuário deletado recebido:", message.data);
      
      const { userId, email } = message.data;
      
      // Limpar dados do usuário no backend-main:
      // - Deletar favoritos
      // - Cancelar reservas futuras
      // - Limpar histórico
      
      // EXEMPLO:
      // await Favorites.destroy({ where: { userId } });
      // await Reservations.update({ status: 'cancelled' }, { where: { userId } });
      
      console.log(`✅ Dados removidos para usuário: ${email}`);
    } catch (error) {
      console.error("❌ Erro ao processar USER_DELETED:", error);
      throw error;
    }
  }

  // HANDLER: Quando usuário faz login
  async handleUserLoggedIn(message) {
    console.log("🔐 [backend-main] Usuário logado:", message.data);
    
    const { userId, email } = message.data;
    
    // Atualizar último login, estatísticas, etc.
    // EXEMPLO:
    // await UserStats.update({ lastLogin: new Date() }, { where: { userId } });
  }
}

module.exports = new EventConsumer();