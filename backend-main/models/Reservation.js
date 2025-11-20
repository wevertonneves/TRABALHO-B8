const { DataTypes, Model, Op } = require("sequelize");
const sequelize = require("../config/database");

class Reservation extends Model {
  // Método para contar reservas por lugar e data
  static async countByPlaceAndDate(placeId, date) {
    try {
      const whereClause = {
        placeId: parseInt(placeId),
      };

      if (date) {
        const targetDate = new Date(date);
        if (isNaN(targetDate)) {
          return 0;
        }

        const startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);

        whereClause.reservedAt = {
          [Op.between]: [startDate, endDate],
        };
      }

      const count = await this.count({
        where: whereClause,
      });

      return count;
    } catch (error) {
      return 0;
    }
  }

  // Método para verificar disponibilidade
  static async checkAvailability(placeId, reservedAt) {
    try {
      const Place = require("./Place");

      const place = await Place.findByPk(parseInt(placeId));
      if (!place) {
        throw new Error("Local não encontrado");
      }

      const reservedCount = await this.countByPlaceAndDate(placeId, reservedAt);
      const available = place.capacity - reservedCount;

      return {
        placeId,
        capacity: place.capacity,
        reserved: reservedCount,
        available: available > 0 ? available : 0,
      };
    } catch (error) {
      throw error;
    }
  }

  // CREATE - criar reserva
  static async createReservation({
    userId,
    placeId,
    reservedAt,
    peopleCount = 1,
  }) {
    return await this.create({
      userId,
      placeId,
      reservedAt,
      peopleCount,
    });
  }

  // READ ALL com dados do place
  static async findAllWithPlace() {
    const Place = require("./Place");
    return await this.findAll({
      include: [
        {
          model: Place,
          as: "place",
          attributes: [
            "id",
            "name",
            "location",
            "description",
            "category",
            "image",
            "capacity",
          ],
        },
      ],
      order: [["reservedAt", "DESC"]],
    });
  }

  // READ BY USER com dados do place
  static async findByUserWithPlace(userId) {
    const Place = require("./Place");
    return await this.findAll({
      where: { userId },
      include: [
        {
          model: Place,
          as: "place",
          attributes: [
            "id",
            "name",
            "location",
            "description",
            "category",
            "image",
            "capacity",
          ],
        },
      ],
      order: [["reservedAt", "DESC"]],
    });
  }

  // READ BY PLACE
  static async findByPlace(placeId) {
    return await this.findAll({
      where: { placeId },
      order: [["reservedAt", "DESC"]],
    });
  }

  // DELETE reserva
  static async deleteReservation(id) {
    const reservation = await this.findByPk(id);
    if (!reservation) {
      throw new Error("Reserva não encontrada");
    }
    await reservation.destroy();
    return { message: "Reserva deletada com sucesso" };
  }
}

// Inicialização do modelo - CORRIGIDO
Reservation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'userId' // ✅ ESPECIFIQUE O NOME EXATO DA COLUNA
    },
    placeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'placeId' // ✅ ESPECIFIQUE O NOME EXATO DA COLUNA
    },
    reservedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'reservedAt' // ✅ ESPECIFIQUE O NOME EXATO DA COLUNA
    },
    peopleCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'peopleCount' // ✅ ESPECIFIQUE O NOME EXATO DA COLUNA
    },
  },
  {
    sequelize,
    modelName: "Reservation",
    tableName: "reservations",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    // ✅ ADICIONE ESTA CONFIGURAÇÃO PARA EVITAR snake_case
    underscored: false, // Mantém camelCase
  }
);

module.exports = Reservation;