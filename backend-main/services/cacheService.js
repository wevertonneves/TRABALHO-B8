// backend-main/services/cacheService.js
const redis = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hora
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo
  }

  async _executeWithRetry(operation, key, ...args) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.isReady || !redis.client) {
          console.log(`⚠️ Redis não disponível (tentativa ${attempt}/${this.maxRetries}): ${key}`);
          
          // Tentar reconectar
          await this._reconnect();
          if (attempt === this.maxRetries) return null;
          
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          continue;
        }

        return await operation(...args);
        
      } catch (error) {
        console.error(`❌ Erro no Redis (tentativa ${attempt}/${this.maxRetries}): ${error.message}`);
        
        // Marcar como desconectado
        redis.isReady = false;
        
        if (attempt === this.maxRetries) {
          console.log(`💥 Falha após ${this.maxRetries} tentativas: ${key}`);
          return null;
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }
    return null;
  }

  async _reconnect() {
    try {
      console.log('🔄 Tentando reconectar ao Redis...');
      await redis.connect();
      
      // Aguardar conexão estabilizar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (redis.isReady) {
        console.log('✅ Reconexão com Redis bem-sucedida');
        return true;
      }
    } catch (error) {
      console.error('❌ Falha na reconexão:', error.message);
    }
    return false;
  }

  get isReady() {
    return redis.isReady;
  }

  async set(key, value, ttl = this.defaultTTL) {
    const operation = async () => {
      const serializedValue = JSON.stringify(value);
      const result = await redis.setEx(key, ttl, serializedValue);
      
      if (result) {
        console.log(`Cache salvo: ${key} (TTL: ${ttl}s)`);
      } else {
        console.log(`Cache não salvo: ${key}`);
      }
      return result;
    };

    return await this._executeWithRetry(operation, key);
  }

  async get(key) {
    const operation = async () => {
      const cachedData = await redis.get(key);
      if (cachedData) {
        console.log(`Cache hit: ${key}`);
        return JSON.parse(cachedData);
      }
      console.log(`Cache miss: ${key}`);
      return null;
    };

    return await this._executeWithRetry(operation, key);
  }

  async delete(key) {
    const operation = async () => {
      const result = await redis.del(key);
      if (result) {
        console.log(`Cache deletado: ${key}`);
      } else {
        console.log(`Chave não encontrada: ${key}`);
      }
      return result;
    };

    return await this._executeWithRetry(operation, key) || false;
  }

  async deletePattern(pattern) {
    const operation = async () => {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        let deletedCount = 0;
        let failedCount = 0;
        
        for (const key of keys) {
          try {
            const result = await redis.del(key);
            if (result) deletedCount++;
          } catch (error) {
            failedCount++;
            console.error(`Erro ao deletar chave ${key}:`, error.message);
          }
        }
        
        if (deletedCount > 0) {
          console.log(`🗑️ ${deletedCount}/${keys.length} chaves deletadas: ${pattern}`);
        }
        if (failedCount > 0) {
          console.log(`⚠️ ${failedCount} chaves falharam ao deletar: ${pattern}`);
        }
        
        return deletedCount > 0;
      }
      console.log(`🔍 Nenhuma chave encontrada para o padrão: ${pattern}`);
      return true;
    };

    return await this._executeWithRetry(operation, pattern) || false;
  }

  // =========================================
  // MÉTODOS ESPECÍFICOS PARA MAIN-SERVICE
  // =========================================

  async invalidateEventCache(eventId) {
    await this.delete(`event:${eventId}`);
    await this.delete(`event:details:${eventId}`);
    await this.deletePattern(`event:${eventId}:*`);
    console.log(`Cache de evento ${eventId} invalidado`);
  }

  async invalidateAllEventsCache() {
    await this.deletePattern('events:*');
    await this.deletePattern('event:*');
    await this.delete('events:all');
    await this.delete('events:active');
    console.log('Todos os caches de eventos invalidados');
  }

  async invalidateClientCache(clientId) {
    await this.delete(`client:${clientId}`);
    await this.delete(`client:profile:${clientId}`);
    await this.deletePattern(`client:${clientId}:*`);
    console.log(`Cache de cliente ${clientId} invalidado`);
  }

  async invalidateContractCache(contractId) {
    await this.delete(`contract:${contractId}`);
    await this.delete(`contract:details:${contractId}`);
    await this.deletePattern(`contract:${contractId}:*`);
    console.log(`Cache de contrato ${contractId} invalidado`);
  }

  async invalidatePaymentCache(paymentId) {
    await this.delete(`payment:${paymentId}`);
    await this.deletePattern(`payment:${paymentId}:*`);
    console.log(`Cache de pagamento ${paymentId} invalidado`);
  }

  async setPaginatedList(key, data, page = 1, ttl = 1800) {
    const paginatedKey = `${key}:page:${page}`;
    return await this.set(paginatedKey, data, ttl);
  }

  async getPaginatedList(key, page = 1) {
    const paginatedKey = `${key}:page:${page}`;
    return await this.get(paginatedKey);
  }

  async setReport(key, reportData, ttl = 7200) {
    const reportKey = `report:${key}`;
    return await this.set(reportKey, reportData, ttl);
  }

  async getReport(key) {
    const reportKey = `report:${key}`;
    return await this.get(reportKey);
  }

  async setStats(key, statsData, ttl = 3600) {
    const statsKey = `stats:${key}`;
    return await this.set(statsKey, statsData, ttl);
  }

  async getStats(key) {
    const statsKey = `stats:${key}`;
    return await this.get(statsKey);
  }

  // =========================================
  // MÉTODOS DE SISTEMA (COMPARTILHADOS)
  // =========================================

  async invalidateUserCache(userId) {
    await this.delete(`user:${userId}`);
    await this.delete(`user:profile:${userId}`);
    await this.deletePattern(`user:${userId}:*`);
  }

  async invalidateAllUsersCache() {
    await this.deletePattern('users:*');
    await this.deletePattern('user:*');
  }

  async testConnection() {
    try {
      const testKey = 'connection:test:' + Date.now();
      const testData = { test: true, timestamp: new Date().toISOString() };
      
      const setResult = await this.set(testKey, testData, 10);
      const getResult = await this.get(testKey);
      
      return {
        success: setResult && (getResult !== null),
        set: setResult,
        get: getResult !== null,
        dataMatch: JSON.stringify(getResult) === JSON.stringify(testData)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async clearMainServiceCache() {
    const patterns = [
      'event:*',
      'events:*',
      'client:*', 
      'contract:*',
      'payment:*',
      'report:*',
      'stats:*'
    ];
    
    let totalDeleted = 0;
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      for (const key of keys) {
        const result = await this.delete(key);
        if (result) totalDeleted++;
      }
    }
    
    console.log(`Cache do main-service limpo: ${totalDeleted} chaves removidas`);
    return totalDeleted;
  }
}

module.exports = new CacheService();