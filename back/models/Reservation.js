// models/Reservation.js
const { DataTypes, Model, Op } = require("sequelize");
const sequelize = require("../config/database");

class Reservation extends Model {
  // Método para contar reservas por lugar e data (CORRIGIDO)
  static async countByPlaceAndDate(placeId, date) {
    try {
      console.log("🔢 [DEBUG] countByPlaceAndDate chamado:", { placeId, date });

      const whereClause = {
        placeId: parseInt(placeId), // Garante que é número
      };

      if (date) {
        // Converte a string da data para objeto Date
        const targetDate = new Date(date);
        if (isNaN(targetDate)) {
          console.log("❌ [DEBUG] Data inválida:", date);
          return 0;
        }

        const startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);

        whereClause.reservedAt = {
          [Op.between]: [startDate, endDate],
        };

        console.log("📅 [DEBUG] Filtro de data:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
      }

      console.log(
        "🔍 [DEBUG] Where clause:",
        JSON.stringify(whereClause, null, 2)
      );

      const count = await this.count({
        where: whereClause,
      });

      console.log(
        "✅ [DEBUG] Total de reservas encontradas:",
        count,
        "para placeId:",
        placeId
      );
      return count;
    } catch (error) {
      console.error("❌ [DEBUG] Erro ao contar reservas:", error);
      return 0;
    }
  }

  // Método para verificar disponibilidade (CORRIGIDO)
  static async checkAvailability(placeId, reservedAt) {
    try {
      const Place = require("./Place");

      console.log("🔍 [DEBUG] Verificando disponibilidade para:", {
        placeId,
        reservedAt,
      });

      const place = await Place.findByPk(parseInt(placeId));
      if (!place) {
        console.log("❌ [DEBUG] Local não encontrado com ID:", placeId);
        throw new Error("Local não encontrado");
      }

      console.log("✅ [DEBUG] Local encontrado:", {
        id: place.id,
        name: place.name,
        capacity: place.capacity,
      });

      const reservedCount = await this.countByPlaceAndDate(placeId, reservedAt);
      const available = place.capacity - reservedCount;

      console.log("📊 [DEBUG] Disponibilidade calculada:", {
        placeId,
        capacity: place.capacity,
        reserved: reservedCount,
        available,
      });

      return {
        placeId,
        capacity: place.capacity,
        reserved: reservedCount,
        available: available > 0 ? available : 0,
      };
    } catch (error) {
      console.error("❌ [DEBUG] Erro em checkAvailability:", error);
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

// Inicialização do modelo
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
    },
    placeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reservedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    peopleCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: "Reservation",
    tableName: "reservations",
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);

// ❌❌❌ REMOVA COMPLETAMENTE ESTA PARTE ❌❌❌
// Os relacionamentos já estão definidos no models/associations.js
// Não defina os relacionamentos aqui para evitar conflitos

module.exports = Reservation;
