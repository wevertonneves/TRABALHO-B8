// middlewares/uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Garante que a pasta uploads existe
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Extrai o nome do arquivo sem extensão
    const originalName = path.parse(file.originalname).name;

    // Remove caracteres especiais e espaços, substitui por hífens
    const cleanName = originalName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-zA-Z0-9]/g, "-") // Substitui caracteres especiais por hífens
      .replace(/-+/g, "-") // Remove hífens consecutivos
      .toLowerCase();

    // Gera timestamp no formato YYYYMMDD-HHMMSS
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      "-" +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");

    // Mantém a extensão original (convertida para minúsculas)
    const extension = path.extname(file.originalname).toLowerCase();

    // Nome final do arquivo: nome-limpo-timestamp.extensao
    const finalFilename = `${cleanName}-${timestamp}${extension}`;

    console.log(`📁 Nome original: ${file.originalname}`);
    console.log(`📁 Nome processado: ${finalFilename}`);

    cb(null, finalFilename);
  },
});

// Filtro para aceitar apenas imagens JPG e PNG
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png"];

  const allowedExtensions = [".jpg", ".jpeg", ".png"];

  // Verifica pelo MIME type
  if (allowedMimes.includes(file.mimetype)) {
    // Verifica também pela extensão do arquivo
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Tipo de arquivo não permitido. Apenas ${allowedExtensions.join(
            ", "
          )} são aceitos.`
        ),
        false
      );
    }
  } else {
    cb(
      new Error(
        `Tipo de arquivo não permitido. Apenas ${allowedMimes.join(
          ", "
        )} são aceitos.`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limite
  },
});

// Middleware de tratamento de erros para upload
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Arquivo muito grande",
        message: "O arquivo deve ter no máximo 5MB.",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Campo de arquivo inválido",
        message: "Campo de upload inválido.",
      });
    }

    return res.status(400).json({
      error: "Erro no upload",
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      error: "Erro no upload",
      message: err.message,
    });
  }

  next();
};

module.exports = {
  upload,
  handleUploadErrors,
};
