const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.dev") });

async function createUserSyncTable() {
  let connection;

  try {
    console.log("🔄 Criando tabela de sincronização de usuários...");

    console.log("Credenciais:", {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
    });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "", // ✅ Senha vazia se não tiver
      database: process.env.DB_NAME,
    });

    console.log("✅ Conectado ao banco principal");

    // Criar tabela user_sync no banco principal
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_sync (
        user_id INT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_user_id (user_id)
      )
    `);
    console.log("✅ Tabela user_sync criada no banco principal");

    // Sincronizar usuários existentes do banco de usuários
    const usersConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database: "pontocerto_users_db",
    });

    const [users] = await usersConnection.query("SELECT * FROM users");
    console.log(`📊 ${users.length} usuários para sincronizar`);

    for (const user of users) {
      await connection.query(
        `
        INSERT INTO user_sync (user_id, email, name, role, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          email = VALUES(email), 
          name = VALUES(name), 
          role = VALUES(role),
          updated_at = VALUES(updated_at)
      `,
        [
          user.id,
          user.email,
          user.name,
          user.role,
          user.created_at,
          user.updated_at,
        ]
      );
    }

    await usersConnection.end();
    console.log("✅ Sincronização de usuários concluída");
  } catch (error) {
    console.error("❌ Erro ao criar tabela de sincronização:", error.message);
  } finally {
    if (connection) await connection.end();
  }
}

createUserSyncTable();
