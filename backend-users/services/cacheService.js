// backend-users/services/cacheService.js
const redis = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hora
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      
      // ✅ CORREÇÃO: setEx em vez de setex
      const result = await redis.setEx(key, ttl, serializedValue);
      
      if (result) {
        console.log(`💾 Cache salvo: ${key} (TTL: ${ttl}s)`);
      } else {
        console.log(`⚠️  Cache não salvo (Redis indisponível): ${key}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Erro ao salvar no cache:', error.message);
      return false;
    }
  }

  async get(key) {
    try {
      const cachedData = await redis.get(key);
      if (cachedData) {
        console.log(`⚡ Cache hit: ${key}`);
        return JSON.parse(cachedData);
      }
      console.log(`❌ Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar do cache:', error.message);
      return null;
    }
  }

  async delete(key) {
    try {
      const result = await redis.del(key);
      if (result) {
        console.log(`🗑️ Cache deletado: ${key}`);
      } else {
        console.log(`⚠️  Cache não deletado (Redis indisponível): ${key}`);
      }
      return result;
    } catch (error) {
      console.error('❌ Erro ao deletar do cache:', error.message);
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        let deletedCount = 0;
        for (const key of keys) {
          const result = await redis.del(key);
          if (result) deletedCount++;
        }
        console.log(`🗑️ ${deletedCount}/${keys.length} chaves deletadas: ${pattern}`);
        return deletedCount > 0;
      }
      console.log(`🔍 Nenhuma chave encontrada para o padrão: ${pattern}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar padrão:', error.message);
      return false;
    }
  }

  // ✅ Método utilitário para invalidar cache de usuário
  async invalidateUserCache(userId) {
    await this.delete(`user:${userId}`);
    await this.delete(`user:profile:${userId}`);
    await this.deletePattern(`user:${userId}:*`);
  }

  // ✅ Método utilitário para invalidar cache geral de usuários
  async invalidateAllUsersCache() {
    await this.deletePattern('users:*');
    await this.deletePattern('user:*');
  }

  // ✅ Método para testar a conexão com Redis
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
}

module.exports = new CacheService();