const Place = require("../models/Place");
const Reservation = require("../models/Reservation");
const path = require("path");
const fs = require("fs");

class PlacesController {
  // 📤 UPLOAD DE IMAGEM
  static async uploadImage(req, res) {
    try {
      if (!req.file)
        return res.status(400).json({ error: "Nenhuma imagem enviada." });

      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;

      res.json({
        success: true,
        message: "Imagem uploadada com sucesso!",
        imageUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao fazer upload da imagem." });
    }
  }

  // 🗑️ DELETAR IMAGEM
  static async deleteImage(req, res) {
    const { imageUrl } = req.body;

    try {
      if (!imageUrl)
        return res.status(400).json({ error: "URL da imagem é obrigatória." });

      const filename = path.basename(imageUrl);
      const filePath = path.join(__dirname, "../uploads", filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Imagem deletada com sucesso!" });
      } else {
        res.status(404).json({ error: "Imagem não encontrada." });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar imagem." });
    }
  }

  // 📋 LISTAR TODOS OS LOCAIS
  static async getAllPlaces(req, res) {
    try {
      const places = await Place.findAll({ order: [["id", "ASC"]] });
      res.json(places);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar locais." });
    }
  }

  // 🔍 BUSCAR UM LOCAL POR ID
  static async getPlaceById(req, res) {
    const { id } = req.params;
    try {
      const place = await Place.findByPk(id);
      if (!place)
        return res.status(404).json({ error: "Local não encontrado." });
      res.json(place);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar local." });
    }
  }

  // ➕ CRIAR NOVO LOCAL (ADMIN)
  static async createPlace(req, res) {
    const {
      name,
      location,
      description,
      category = "Bar",
      image,
      latitude,
      longitude,
      capacity = 10,
    } = req.body;

    if (!name || !location) {
      return res
        .status(400)
        .json({ error: "Nome e localização são obrigatórios." });
    }

    try {
      const newPlace = await Place.create({
        name,
        location,
        description: description || null,
        category,
        image: image || null,
        latitude: latitude || null,
        longitude: longitude || null,
        capacity,
      });

      res.status(201).json(newPlace);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar local." });
    }
  }

  // ✏️ ATUALIZAR LOCAL (ADMIN)
  static async updatePlace(req, res) {
    const { id } = req.params;
    
    const {
      name,
      location,
      description,
      category,
      image,
      latitude,
      longitude,
      capacity,
    } = req.body;

    try {
      const place = await Place.findByPk(id);
      if (!place) {
        return res.status(404).json({ error: "Local não encontrado." });
      }

      // Deleta imagem antiga se houver uma nova
      if (image && place.image && place.image !== image) {
        const oldFilename = path.basename(place.image);
        const oldFilePath = path.join(__dirname, "../uploads", oldFilename);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await place.update({
        name: name ?? place.name,
        location: location ?? place.location,
        description: description ?? place.description,
        category: category ?? place.category,
        image: image ?? place.image,
        latitude: latitude ?? place.latitude,
        longitude: longitude ?? place.longitude,
        capacity: capacity ?? place.capacity,
      });

      const updatedPlace = await Place.findByPk(id);
      res.json(updatedPlace);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar local." });
    }
  }

  // 🗑️ DELETAR LOCAL (ADMIN)
  static async deletePlace(req, res) {
    const { id } = req.params;
    
    try {
      const place = await Place.findByPk(id);
      if (!place) {
        return res.status(404).json({ error: "Local não encontrado." });
      }

      if (place.image) {
        const filename = path.basename(place.image);
        const filePath = path.join(__dirname, "../uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await place.destroy();
      res.json({ message: "Local deletado com sucesso." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar local." });
    }
  }

  // 📊 CAPACIDADE DISPONÍVEL CONSIDERANDO RESERVAS
  static async getAvailableCapacity(req, res) {
    const { id, placeId, reservedAt } = req.query;
    const finalPlaceId = id || placeId;

    if (!finalPlaceId) {
      return res.status(400).json({ error: "ID do local é obrigatório." });
    }

    try {
      const place = await Place.findByPk(finalPlaceId);
      if (!place) {
        return res.status(404).json({ error: "Local não encontrado." });
      }

      const capacityTotal = place.capacity;
      const reserved = await Reservation.countByPlaceAndDate(
        finalPlaceId,
        reservedAt ? reservedAt.split("T")[0] : null
      );

      const available = capacityTotal - reserved;

      res.json({
        placeId: finalPlaceId,
        capacity: capacityTotal,
        reserved,
        available: available > 0 ? available : 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao calcular capacidade disponível." });
    }
  }

  // 🧩 REDUZIR CAPACIDADE AO FAZER RESERVA
  static async reduceCapacity(placeId) {
    try {
      const place = await Place.findByPk(placeId);
      if (!place) throw new Error("Local não encontrado.");

      if (place.capacity <= 0) {
        throw new Error("Capacidade esgotada.");
      }

      place.capacity -= 1;
      await place.save();

      return place.capacity;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PlacesController;