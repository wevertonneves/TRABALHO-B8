const { Sequelize } = require("sequelize");

// ✅ Carrega .env.dev apenas em desenvolvimento local
if (process.env.NODE_ENV === 'development' && !process.env.DB_HOST) {
  require("dotenv").config({ path: ".env.dev" });
}

// ✅ DEBUG: Verificar qual configuração está sendo usada
console.log("🔍 Ambiente:", process.env.NODE_ENV);
console.log("🔍 DB_HOST:", process.env.DB_HOST);
console.log("🔍 DB_USER:", process.env.DB_USER);
console.log("🔍 DB_NAME:", process.env.DB_NAME);
console.log("🔍 DB_PASSWORD:", process.env.DB_PASSWORD ? "***" : "(vazio)");

const sequelize = new Sequelize(
  process.env.DB_NAME || "pontocerto_db",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "", // ✅ Vazio em dev, preenchido no Docker
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    port: process.env.DB_PORT || 3306,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com banco principal estabelecida.");
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com banco principal:", error);
    throw error;
  }
};

module.exports = sequelize;
module.exports.sequelize = sequelize;
module.exports.testConnection = testConnection;