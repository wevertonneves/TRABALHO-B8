const { exec, spawn } = require("child_process");
const path = require("path");

class RabbitMQStarter {
  constructor() {
    this.containerName = "rabbitmq";
  }

  async start() {
    console.log("🐇 Verificando Docker...");

    try {
      // Verificar se Docker está rodando
      await this.checkDocker();

      // Verificar se container já existe
      const exists = await this.checkContainerExists();

      if (exists) {
        await this.startExistingContainer();
      } else {
        await this.createNewContainer();
      }

      await this.waitForRabbitMQ();
    } catch (error) {
      console.error("❌ Erro:", error.message);
      this.suggestFallback();
    }
  }

  checkDocker() {
    return new Promise((resolve, reject) => {
      exec("docker --version", (error) => {
        if (error) {
          reject(
            new Error("Docker não encontrado. Instale o Docker primeiro.")
          );
        } else {
          resolve();
        }
      });
    });
  }

  checkContainerExists() {
    return new Promise((resolve) => {
      exec(
        `docker ps -a --filter "name=${this.containerName}" --format "{{.Names}}"`,
        (error, stdout) => {
          resolve(stdout.trim() === this.containerName);
        }
      );
    });
  }

  startExistingContainer() {
    console.log("⚡ Iniciando container existente do RabbitMQ...");

    return new Promise((resolve, reject) => {
      exec(`docker start ${this.containerName}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Erro ao iniciar container: ${error.message}`));
        } else {
          console.log("✅ Container iniciado com sucesso!");
          resolve();
        }
      });
    });
  }

  createNewContainer() {
    console.log("🐇 Criando novo container RabbitMQ...");

    return new Promise((resolve, reject) => {
      const command = `docker run -d \
        --name ${this.containerName} \
        -p 5672:5672 \
        -p 15672:15672 \
        rabbitmq:3-management`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Erro ao criar container: ${error.message}`));
        } else {
          console.log("✅ Container criado com sucesso!");
          resolve();
        }
      });
    });
  }

  waitForRabbitMQ() {
    console.log("⏳ Aguardando RabbitMQ inicializar...");

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        exec(
          'docker logs rabbitmq 2>&1 | findstr "Server startup complete"',
          (error, stdout) => {
            if (stdout) {
              clearInterval(checkInterval);
              console.log("🎉 RabbitMQ pronto!");
              console.log("📊 Management UI: http://localhost:15672");
              console.log("🔌 AMQP: amqp://localhost:5672");
              console.log("👤 Login: guest / guest");
              resolve();
            }
          }
        );
      }, 2000);

      // Timeout após 30 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        console.log("⚠️  RabbitMQ pode estar demorando mais que o normal...");
        console.log("💡 Verifique manualmente com: docker logs rabbitmq");
        resolve();
      }, 30000);
    });
  }

  suggestFallback() {
    console.log("\n💡 Alternativas:");
    console.log("1. Instale o Docker: https://docs.docker.com/get-docker/");
    console.log("2. Ou use RabbitMQ local se instalado");
    console.log("3. Ou use um serviço cloud (CloudAMQP, etc.)");
  }
}

// Executar
const starter = new RabbitMQStarter();
starter.start().catch(console.error);
