const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME, // pontocerto_users_db
  process.env.DB_USER, // root
  process.env.DB_PASSWORD, // string vazia
  {
    host: process.env.DB_HOST, // localhost
    dialect: "mysql",
    port: 3306,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com banco de usuários estabelecida.");
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com banco de usuários:", error.message);
    throw error;
  }
};

// ✅ Exportar sequelize (não usersDB)
module.exports = {
  sequelize,
  testConnection,
};
