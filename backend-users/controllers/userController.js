// controllers/userController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

// ✅ IMPORTAR EVENT PUBLISHER REAL (CORRIGIDO)


const eventPublisher = require("../shared/messaging/eventPublisher");

// ---------- Configuração para envio de email ----------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------- Funções auxiliares ----------
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const isValidPassword = (password) =>
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{7,}$/.test(
    password
  );

// ---------- CADASTRO ----------
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || name.length < 3)
      return res.status(400).json({ success: false, message: "Nome inválido" });
    if (!isValidEmail(email))
      return res
        .status(400)
        .json({ success: false, message: "Email inválido" });
    if (!isValidPassword(password))
      return res.status(400).json({
        success: false,
        message:
          "Senha inválida. Deve ter mínimo 7 caracteres, 1 maiúscula, 1 número e 1 caractere especial.",
      });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      return res
        .status(409)
        .json({ success: false, message: "Email já cadastrado" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === "admin" ? "admin" : "user";

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
    });

    console.log(`✅ Usuário criado: ${user.email}`);

    // ✅ PUBLICAR EVENTO DE USUÁRIO CRIADO NO RABBITMQ
    try {
      await eventPublisher.userCreated(user);
      console.log(`📤 Evento USER_CREATED publicado para: ${user.email}`);
    } catch (eventError) {
      console.error("❌ Erro ao publicar evento USER_CREATED:", eventError);
      // Não falha a criação do usuário se o evento falhar
    }

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso!",
      id: user.id,
      role: userRole,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ success: false, message: "Erro ao criar usuário" });
  }
};

// ---------- LOGIN ----------
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res
        .status(401)
        .json({ success: false, message: "Senha incorreta" });

    // 🔑 Gera o token JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "segredo_super_forte",
      { expiresIn: "1h" }
    );

    console.log(`✅ Login realizado: ${user.email}`);

    // ✅ PUBLICAR EVENTO DE LOGIN NO RABBITMQ
    try {
      await eventPublisher.userLoggedIn(user.id, user.email);
      console.log(`📤 Evento USER_LOGGED_IN publicado para: ${user.email}`);
    } catch (eventError) {
      console.error("❌ Erro ao publicar evento USER_LOGGED_IN:", eventError);
    }

    res.status(200).json({
      success: true,
      message: "Login realizado com sucesso!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Erro ao logar:", error);
    res.status(500).json({ success: false, message: "Erro ao logar" });
  }
};

// ---------- ALTERAÇÃO DE SENHA ----------
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Preencha todos os campos" });

    if (!isValidPassword(newPassword))
      return res.status(400).json({
        success: false,
        message:
          "Senha inválida. Deve ter mínimo 7 caracteres, 1 maiúscula, 1 número e 1 caractere especial.",
      });

    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });

    const validOldPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validOldPassword)
      return res
        .status(401)
        .json({ success: false, message: "Senha atual incorreta" });

    const oldData = {
      password: user.password, // hash atual
      updated_at: user.updated_at,
    };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    console.log(`✅ Senha alterada: ${user.email}`);

    // ✅ PUBLICAR EVENTO DE USUÁRIO ATUALIZADO NO RABBITMQ
    try {
      await eventPublisher.userUpdated(userId, oldData, {
        password: hashedPassword,
        updated_at: user.updated_at,
      });
      console.log(`📤 Evento USER_UPDATED publicado para: ${user.email}`);
    } catch (eventError) {
      console.error("❌ Erro ao publicar evento USER_UPDATED:", eventError);
    }

    res
      .status(200)
      .json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    res.status(500).json({ success: false, message: "Erro ao alterar senha" });
  }
};

// ---------- RECUPERAÇÃO DE SENHA ----------
const checkEmail = async (req, res) => {
  try {
    const email = req.body.email.trim();
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Email não encontrado" });

    res.status(200).json({ success: true, message: "Email válido" });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao verificar email" });
  }
};

const sendCode = async (req, res) => {
  try {
    const email = req.body.email.trim();
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Email não encontrado" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await user.update({ reset_code: code });

    await transporter.sendMail({
      from: `"Suporte PontoCerto" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Código de recuperação de senha",
      text: `Seu código de recuperação é: ${code}`,
    });

    console.log(`✅ Código enviado para ${email}: ${code}`);

    res
      .status(200)
      .json({ success: true, message: "Código enviado com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar código:", error);
    res.status(500).json({ success: false, message: "Erro ao enviar código" });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ where: { email, reset_code: code } });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Código inválido" });

    res.status(200).json({ success: true, message: "Código válido" });
  } catch (error) {
    console.error("Erro ao verificar código:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao verificar código" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!isValidPassword(newPassword))
      return res.status(400).json({
        success: false,
        message:
          "Senha inválida. Deve ter mínimo 7 caracteres, 1 maiúscula, 1 número e 1 caractere especial.",
      });

    const user = await User.findOne({ where: { email, reset_code: code } });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Código inválido" });

    const oldData = {
      password: user.password,
      reset_code: user.reset_code,
      updated_at: user.updated_at,
    };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword, reset_code: null });

    console.log(`✅ Senha resetada: ${user.email}`);

    // ✅ PUBLICAR EVENTO DE USUÁRIO ATUALIZADO NO RABBITMQ
    try {
      await eventPublisher.userUpdated(user.id, oldData, {
        password: hashedPassword,
        reset_code: null,
        updated_at: user.updated_at,
      });
      console.log(`📤 Evento USER_UPDATED publicado para: ${user.email}`);
    } catch (eventError) {
      console.error("❌ Erro ao publicar evento USER_UPDATED:", eventError);
    }

    res
      .status(200)
      .json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    res.status(500).json({ success: false, message: "Erro ao resetar senha" });
  }
};

// ---------- DELETAR CONTA ----------
const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user?.id;

    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Senha incorreta" });

    res.status(200).json({ success: true, message: "Senha correta" });
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao verificar senha" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    console.log(`✅ Usuário deletado: ${user.email}`);

    await User.destroy({ where: { id: userId } });

    // ✅ PUBLICAR EVENTO DE USUÁRIO DELETADO NO RABBITMQ
    try {
      await eventPublisher.userDeleted(userId, userData);
      console.log(`📤 Evento USER_DELETED publicado para: ${user.email}`);
    } catch (eventError) {
      console.error("❌ Erro ao publicar evento USER_DELETED:", eventError);
    }

    res
      .status(200)
      .json({ success: true, message: "Conta deletada com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    res.status(500).json({ success: false, message: "Erro ao deletar conta" });
  }
};

// ---------- ATUALIZAR PERFIL ----------
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, email } = req.body;

    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });

    // Salvar dados antigos para o evento
    const oldData = {
      name: user.name,
      email: user.email,
      updated_at: user.updated_at,
    };

    // Verificar se o email já existe em outro usuário
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser)
        return res
          .status(409)
          .json({ success: false, message: "Email já está em uso" });
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
    });

    console.log(`✅ Perfil atualizado: ${user.email}`);

    // ✅ PUBLICAR EVENTO DE USUÁRIO ATUALIZADO NO RABBITMQ
    try {
      await eventPublisher.userUpdated(userId, oldData, {
        name: user.name,
        email: user.email,
        updated_at: user.updated_at,
      });
      console.log(`📤 Evento USER_UPDATED publicado para: ${user.email}`);
    } catch (eventError) {
      console.error("❌ Erro ao publicar evento USER_UPDATED:", eventError);
    }

    res.status(200).json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao atualizar perfil" });
  }
};

// ---------- LISTAR TODOS OS USUÁRIOS ----------
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role"],
      order: [["id", "ASC"]],
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao buscar usuários" });
  }
};

// ---------- OBTER PERFIL DO USUÁRIO ----------
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "role", "created_at"],
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado" });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    res.status(500).json({ success: false, message: "Erro ao buscar perfil" });
  }
};

// ---------- BUSCAR USUÁRIO POR ID (ADMIN) ----------
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: ["id", "name", "email", "role", "created_at"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar usuário",
    });
  }
};

// ---------- VERIFICAR SE USUÁRIO EXISTE (para microserviços) ----------
const userExists = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ["id", "name", "email", "role"],
    });

    if (!user) {
      return res.status(404).json({ exists: false });
    }

    res.json({
      exists: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

module.exports = {
  createUser,
  loginUser,
  changePassword,
  checkEmail,
  sendCode,
  verifyCode,
  resetPassword,
  verifyPassword,
  deleteAccount,
  getAllUsers,
  updateProfile,
  getUserProfile,
  getUserById,
  userExists,
};