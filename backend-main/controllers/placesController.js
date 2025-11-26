const placeService = require("../services/placeService");
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
        return res.status(400).json({ error: "URL da imagem e obrigatoria." });

      const filename = path.basename(imageUrl);
      const filePath = path.join(__dirname, "../uploads", filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: "Imagem deletada com sucesso!" });
      } else {
        res.status(404).json({ error: "Imagem nao encontrada." });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar imagem." });
    }
  }

  // 📋 LISTAR TODOS OS LOCAIS
  static async getAllPlaces(req, res) {
    try {
      const places = await placeService.getAllPlaces();
      res.json(places);
    } catch (error) {
      console.error("Erro ao buscar locais:", error);
      res.status(500).json({ error: "Erro ao buscar locais." });
    }
  }

  // 🔍 BUSCAR UM LOCAL POR ID
  static async getPlaceById(req, res) {
    const { id } = req.params;
    try {
      const place = await placeService.getPlaceById(id);
      res.json(place);
    } catch (error) {
      console.error("Erro ao buscar local:", error);
      if (error.message === "Local nao encontrado") {
        return res.status(404).json({ error: "Local nao encontrado." });
      }
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

    try {
      const newPlace = await placeService.createPlace({
        name,
        location,
        description,
        category,
        image,
        latitude,
        longitude,
        capacity,
      });

      res.status(201).json(newPlace);
    } catch (error) {
      console.error("Erro ao criar local:", error);
      if (error.message === "Nome e localizacao sao obrigatorios") {
        return res.status(400).json({ error: "Nome e localizacao sao obrigatorios." });
      }
      res.status(500).json({ error: "Erro ao criar local." });
    }
  }

  // ✏️ ATUALIZAR LOCAL (ADMIN)
  static async updatePlace(req, res) {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const updatedPlace = await placeService.updatePlace(id, updateData);
      res.json(updatedPlace);
    } catch (error) {
      console.error("Erro ao atualizar local:", error);
      if (error.message === "Local nao encontrado") {
        return res.status(404).json({ error: "Local nao encontrado." });
      }
      res.status(500).json({ error: "Erro ao atualizar local." });
    }
  }

  // 🗑️ DELETAR LOCAL (ADMIN)
  static async deletePlace(req, res) {
    const { id } = req.params;
    
    try {
      const result = await placeService.deletePlace(id);
      res.json(result);
    } catch (error) {
      console.error("Erro ao deletar local:", error);
      if (error.message === "Local nao encontrado") {
        return res.status(404).json({ error: "Local nao encontrado." });
      }
      res.status(500).json({ error: "Erro ao deletar local." });
    }
  }

  // 📊 CAPACIDADE DISPONÍVEL CONSIDERANDO RESERVAS
  static async getAvailableCapacity(req, res) {
    const { id, placeId, reservedAt } = req.query;
    const finalPlaceId = id || placeId;

    if (!finalPlaceId) {
      return res.status(400).json({ error: "ID do local e obrigatorio." });
    }

    try {
      const capacityInfo = await placeService.getAvailableCapacity(finalPlaceId, reservedAt);
      res.json(capacityInfo);
    } catch (error) {
      console.error("Erro ao calcular capacidade disponivel:", error);
      if (error.message === "Local nao encontrado") {
        return res.status(404).json({ error: "Local nao encontrado." });
      }
      res.status(500).json({ error: "Erro ao calcular capacidade disponivel." });
    }
  }

  // 🗂️ BUSCAR LOCAIS POR CATEGORIA
  static async getPlacesByCategory(req, res) {
    const { category } = req.params;
    
    try {
      const places = await placeService.getPlacesByCategory(category);
      res.json(places);
    } catch (error) {
      console.error("Erro ao buscar locais por categoria:", error);
      res.status(500).json({ error: "Erro ao buscar locais por categoria." });
    }
  }
}

module.exports = PlacesController;