const { DataTypes, Model } = require("sequelize");
const { usersDB } = require("../config/database"); // Mudança aqui

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [3, 255],
          msg: "Nome deve ter pelo menos 3 caracteres",
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
    reset_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
  },
  {
    sequelize: usersDB, // Mudança aqui - usa o banco de usuários
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

// Método para ocultar campos sensíveis
User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.reset_code;
  return values;
};

module.exports = User;
