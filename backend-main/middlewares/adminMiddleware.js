// middlewares/adminMiddleware.js
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso negado. Admin apenas." });
  }
  next();
}

module.exports = isAdmin;
