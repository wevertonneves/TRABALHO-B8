const { mainDB } = require("../config/database");

class UserSyncService {
  // Sincronizar usuário no banco principal (para referências)
  async syncUserToMainDB(userData) {
    try {
      // Cria uma tabela de sincronização no banco principal
      await mainDB.query(`
        CREATE TABLE IF NOT EXISTS user_sync (
          user_id INT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role ENUM('user', 'admin') DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Insere ou atualiza o usuário na tabela de sincronização
      await mainDB.query(
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
          userData.id,
          userData.email,
          userData.name,
          userData.role,
          new Date(),
          new Date(),
        ]
      );

      console.log(
        `✅ Usuário ${userData.email} sincronizado com banco principal`
      );
    } catch (error) {
      console.error("❌ Erro ao sincronizar usuário:", error);
    }
  }

  // Remover usuário do banco principal
  async removeUserFromMainDB(userId) {
    try {
      await mainDB.query("DELETE FROM user_sync WHERE user_id = ?", [userId]);
      console.log(`✅ Usuário ${userId} removido da sincronização`);
    } catch (error) {
      console.error("❌ Erro ao remover usuário da sincronização:", error);
    }
  }
}

module.exports = new UserSyncService();
