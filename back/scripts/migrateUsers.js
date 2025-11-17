const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.dev") });

async function migrateUsers() {
  let connectionMain, connectionUsers;

  try {
    console.log("🚀 INICIANDO MIGRAÇÃO DE USUÁRIOS...\n");

    // Configurações do seu .env
    const dbConfig = {
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    };

    console.log("📋 Configuração do banco:");
    console.log("   Host:", dbConfig.host);
    console.log("   User:", dbConfig.user);
    console.log("   Database principal:", process.env.DB_NAME);
    console.log(
      "   Database usuários:",
      process.env.USERS_DB_NAME || "pontocerto_users_db"
    );
    console.log("");

    // Conectar ao MySQL
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ Conectado ao MySQL");

    // Criar banco de usuários se não existir
    const usersDbName = process.env.USERS_DB_NAME || "pontocerto_users_db";

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${usersDbName}`);
    console.log(`✅ Banco ${usersDbName} verificado/criado`);

    await connection.end();

    // Conectar ao banco principal
    connectionMain = await mysql.createConnection({
      ...dbConfig,
      database: process.env.DB_NAME,
    });
    console.log("✅ Conectado ao banco principal");

    // Conectar ao banco de usuários
    connectionUsers = await mysql.createConnection({
      ...dbConfig,
      database: usersDbName,
    });
    console.log("✅ Conectado ao banco de usuários");

    // Criar tabela de usuários
    await connectionUsers.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        reset_code VARCHAR(6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabela users criada/verificada");

    // Buscar usuários do banco principal
    const [users] = await connectionMain.query("SELECT * FROM users");
    console.log(`\n📊 ${users.length} usuários encontrados para migração`);

    // Migrar usuários
    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Usar INSERT IGNORE para pular duplicatas
        const [result] = await connectionUsers.query(
          `INSERT IGNORE INTO users (id, name, email, password, role, reset_code, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.name,
            user.email,
            user.password,
            user.role || "user",
            user.reset_code,
            user.created_at,
            user.updated_at,
          ]
        );

        if (result.affectedRows > 0) {
          migratedCount++;
          console.log(`✅ Migrado: ${user.email} (ID: ${user.id})`);
        } else {
          console.log(`⏭️  Já existe: ${user.email}`);
        }
      } catch (error) {
        errorCount++;
        console.log(`❌ Erro em ${user.email}:`, error.message);
      }
    }

    console.log("\n📊 RESUMO DA MIGRAÇÃO:");
    console.log(`✅ Migrados com sucesso: ${migratedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📋 Total processado: ${users.length}`);
  } catch (error) {
    console.error("💥 ERRO NA MIGRAÇÃO:", error);
  } finally {
    if (connectionMain) await connectionMain.end();
    if (connectionUsers) await connectionUsers.end();
    console.log("\n🔚 Conexões fechadas");
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log("\n🎉 Migração concluída!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Erro na migração:", error);
      process.exit(1);
    });
}

module.exports = migrateUsers;
