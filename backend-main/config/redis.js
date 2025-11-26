// backend-users/config/redis.js (VERSÃO ATUALIZADA)
const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.connect();
  }

  async connect() {
    try {
      const redisOptions = {
        socket: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          connectTimeout: 10000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            this.connectionAttempts = retries;
            if (retries > this.maxRetries) {
              console.log('❌ Máximo de tentativas de conexão atingido');
              return false;
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 Tentativa ${retries + 1} de reconexão em ${delay}ms`);
            return delay;
          }
        },
        // ✅ CONFIGURAÇÃO DE AUTENTICAÇÃO
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || undefined,
        database: parseInt(process.env.REDIS_DB) || 1
      };

      // Remove undefined values to avoid connection issues
      if (!redisOptions.password) delete redisOptions.password;
      if (!redisOptions.username) delete redisOptions.username;

      console.log('🔗 Inicializando Redis...');
      console.log(`📡 Conectando em: ${redisOptions.socket.host}:${redisOptions.socket.port}`);
      
      this.client = redis.createClient(redisOptions);

      // Event listeners para monitoramento
      this.client.on('error', (err) => {
        console.error('❌ Redis Error:', err.message);
        this.isReady = false;
        
        // Tratamento específico para erro de autenticação
        if (err.message.includes('AUTH') || err.message.includes('authentication')) {
          console.error('🔐 Erro de autenticação - Verifique REDIS_PASSWORD no .env');
        }
      });

      this.client.on('connect', () => {
        console.log('🔗 Conectando ao Redis...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis conectado e pronto!');
        this.isReady = true;
        this.connectionAttempts = 0;
      });

      this.client.on('end', () => {
        console.log('🔴 Conexão Redis fechada');
        this.isReady = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Reconectando ao Redis...');
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('❌ Falha crítica ao conectar Redis:', error.message);
      this.isReady = false;
      
      // Dicas específicas baseadas no erro
      if (error.message.includes('AUTH') || error.message.includes('authentication')) {
        console.log('💡 DICA: Configure REDIS_PASSWORD no arquivo .env');
        console.log('💡 DICA: Ou execute: redis-cli -> CONFIG SET requirepass ""');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('💡 DICA: Verifique se o servidor Redis está rodando');
        console.log('💡 COMANDO: sudo systemctl start redis');
      }
    }
  }

  // ✅ CORREÇÃO: setEx em vez de setex
  async setEx(key, ttl, value) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando setEx:', key);
      return false;
    }
    try {
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      console.error('❌ Erro no Redis setEx:', error.message);
      
      // Reconectar em caso de erro de conexão
      if (error.message.includes('Connection')) {
        this.isReady = false;
        setTimeout(() => this.connect(), 2000);
      }
      return false;
    }
  }

  async set(key, value, options = {}) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando set:', key);
      return false;
    }
    try {
      await this.client.set(key, value, options);
      return true;
    } catch (error) {
      console.error('❌ Erro no Redis set:', error.message);
      return false;
    }
  }

  async get(key) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando get:', key);
      return null;
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('❌ Erro no Redis get:', error.message);
      return null;
    }
  }

  async del(key) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando del:', key);
      return false;
    }
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Erro no Redis del:', error.message);
      return false;
    }
  }

  async keys(pattern) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando keys:', pattern);
      return [];
    }
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('❌ Erro no Redis keys:', error.message);
      return [];
    }
  }

  async exists(key) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando exists:', key);
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Erro no Redis exists:', error.message);
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando expire:', key);
      return false;
    }
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('❌ Erro no Redis expire:', error.message);
      return false;
    }
  }

  async ttl(key) {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando ttl:', key);
      return -2;
    }
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('❌ Erro no Redis ttl:', error.message);
      return -2;
    }
  }

  async flushAll() {
    if (!this.isReady || !this.client) {
      console.log('⚠️  Redis não disponível, ignorando flushAll');
      return false;
    }
    try {
      await this.client.flushAll();
      console.log('🗑️  Todos os dados do Redis foram limpos');
      return true;
    } catch (error) {
      console.error('❌ Erro no Redis flushAll:', error.message);
      return false;
    }
  }

  async getStatus() {
    return {
      isReady: this.isReady,
      connectionAttempts: this.connectionAttempts,
      maxRetries: this.maxRetries,
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck() {
    if (!this.isReady || !this.client) {
      return { status: 'disconnected', message: 'Redis não conectado' };
    }
    
    try {
      const startTime = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        message: 'Redis está funcionando corretamente',
        responseTime: `${responseTime}ms`,
        database: this.client.options?.database || 0
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        responseTime: null
      };
    }
  }

  async quit() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('🔴 Conexão Redis fechada gracefuly');
      } catch (error) {
        console.error('❌ Erro ao fechar conexão Redis:', error.message);
      } finally {
        this.isReady = false;
        this.client = null;
      }
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('🔴 Redis desconectado');
      } catch (error) {
        console.error('❌ Erro ao desconectar Redis:', error.message);
      } finally {
        this.isReady = false;
      }
    }
  }
}

module.exports = new RedisClient();