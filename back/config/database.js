const path = require("path");
const { Sequelize } = require("sequelize");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.dev") });

// Banco de Dados Principal (atual - mantém compatibilidade)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// NOVO: Banco de Dados para Usuários
const usersDB = new Sequelize(
  process.env.USERS_DB_NAME || "pontocerto_users_db",
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Testar conexões
async function testConnections() {
  try {
    console.log("🔗 Testando conexões com os bancos...");

    await sequelize.authenticate();
    console.log("✅ Conexão com banco principal OK");

    await usersDB.authenticate();
    console.log("✅ Conexão com banco de usuários OK");

    return true;
  } catch (error) {
    console.error("❌ Erro nas conexões:", error.message);
    return false;
  }
}

// Mantém exportação original para compatibilidade
module.exports = sequelize;

// Exporta os dois bancos para uso nos novos arquivos
module.exports.sequelize = sequelize;
module.exports.usersDB = usersDB;
module.exports.testConnections = testConnections;
