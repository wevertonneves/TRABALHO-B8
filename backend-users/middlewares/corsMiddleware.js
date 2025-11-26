const cors = require("cors");

// Lista de origens permitidas
const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.1.21:3000",
  "http://localhost:8081",
  "http://192.168.1.21:8081",
  "http://localhost:8080",
  "http://192.168.1.21:8080",
  "http://localhost:3001", // User Service
  "http://192.168.1.21:3001", // User Service na rede
  "http://localhost:3003", // Main Service  
  "http://192.168.1.21:3003", // Main Service na rede
  "http://localhost:19006", // Expo
  "http://192.168.1.21:19006", // Expo na rede
];

// Configuração principal do CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Não permitido por CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

// Middleware CORS manual para garantir compatibilidade
const corsManualMiddleware = (req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range");

  // Responder a preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};

// Função principal para configurar CORS no app
const configureCORS = (app) => {
  // Aplicar configuração CORS principal
  app.use(cors(corsOptions));
  
  // Aplicar middleware CORS manual para compatibilidade
  app.use(corsManualMiddleware);

  console.log("✅ CORS configurado para múltiplas origens");
};

// Exportar configurações para uso em outros lugares se necessário
module.exports = configureCORS;
module.exports.allowedOrigins = allowedOrigins;
module.exports.corsOptions = corsOptions;