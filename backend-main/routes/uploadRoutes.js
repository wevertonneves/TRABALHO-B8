const express = require("express");
const path = require("path");
const fs = require("fs");
const { upload, handleUploadErrors } = require("../middlewares/uploadMiddleware");

const router = express.Router();

// Upload único de imagem
router.post(
  "/",
  upload.single("image"),
  handleUploadErrors,
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Nenhum arquivo enviado",
          message: "Por favor, selecione um arquivo para upload.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Upload realizado com sucesso",
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: `/uploads/${req.file.filename}`,
        },
      });
    } catch (error) {
      console.error("❌ Erro no upload:", error);
      res.status(500).json({
        error: "Erro interno no servidor",
        message: "Falha ao processar o upload",
      });
    }
  }
);

// Upload múltiplo de imagens
router.post(
  "/multiple",
  upload.array("images", 10),
  handleUploadErrors,
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: "Nenhum arquivo enviado",
          message: "Por favor, selecione arquivos para upload.",
        });
      }

      const uploadedFiles = req.files.map((file) => {
        return {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: `/uploads/${file.filename}`,
        };
      });

      res.status(200).json({
        success: true,
        message: `${req.files.length} arquivo(s) enviado(s) com sucesso`,
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("❌ Erro no upload múltiplo:", error);
      res.status(500).json({
        error: "Erro interno no servidor",
        message: "Falha ao processar o upload múltiplo",
      });
    }
  }
);

// Deletar imagem
router.delete("/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const uploadsDir = path.join(__dirname, "../uploads");
    const filePath = path.join(uploadsDir, filename);

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "Arquivo não encontrado",
        message: "O arquivo solicitado não existe.",
      });
    }

    // Deleta o arquivo
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: "Arquivo deletado com sucesso",
      filename: filename,
    });
  } catch (error) {
    console.error("❌ Erro ao deletar arquivo:", error);
    res.status(500).json({
      error: "Erro interno no servidor",
      message: "Falha ao deletar o arquivo",
    });
  }
});

// Listar arquivos de upload (opcional - para debug)
router.get("/files", (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, "../uploads");
    const files = fs.readdirSync(uploadsDir);
    const fileList = files.map((file) => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);

      return {
        filename: file,
        size: stats.size,
        created: stats.birthtime,
        url: `${req.protocol}://${req.get("host")}/uploads/${file}`,
      };
    });

    res.status(200).json({
      success: true,
      files: fileList,
      count: fileList.length,
    });
  } catch (error) {
    console.error("❌ Erro ao listar arquivos:", error);
    res.status(500).json({
      error: "Erro interno no servidor",
      message: "Falha ao listar arquivos",
    });
  }
});

module.exports = router;