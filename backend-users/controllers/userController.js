// backend-users/controllers/userController.js
const userService = require('../services/userService');

// ---------- CADASTRO ----------
const createUser = async (req, res) => {
  try {
    const result = await userService.createUser(req.body);
    
    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso!",
      id: result.id,
      role: result.role,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    
    const status = error.message === "Email já cadastrado" ? 409 : 400;
    res.status(status).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ---------- LOGIN ----------
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    
    res.status(200).json({
      success: true,
      message: "Login realizado com sucesso!",
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    console.error("Erro ao logar:", error);
    
    const status = error.message === "Usuário não encontrado" ? 404 : 
                   error.message === "Senha incorreta" ? 401 : 500;
    res.status(status).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ---------- ALTERAÇÃO DE SENHA ----------
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    await userService.changePassword(userId, oldPassword, newPassword);

    res.status(200).json({ 
      success: true, 
      message: "Senha alterada com sucesso!" 
    });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    
    const status = error.message === "Usuário não encontrado" ? 404 :
                   error.message === "Senha atual incorreta" ? 401 : 400;
    res.status(status).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ---------- RECUPERAÇÃO DE SENHA ----------
const checkEmail = async (req, res) => {
  try {
    const email = req.body.email.trim();
    await userService.checkEmail(email);
    
    res.status(200).json({ 
      success: true, 
      message: "Email válido" 
    });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    res.status(404).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const sendCode = async (req, res) => {
  try {
    const email = req.body.email.trim();
    await userService.sendCode(email);
    
    res.status(200).json({ 
      success: true, 
      message: "Código enviado com sucesso!" 
    });
  } catch (error) {
    console.error("Erro ao enviar código:", error);
    res.status(404).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    await userService.verifyCode(email, code);
    
    res.status(200).json({ 
      success: true, 
      message: "Código válido" 
    });
  } catch (error) {
    console.error("Erro ao verificar código:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    await userService.resetPassword(email, code, newPassword);
    
    res.status(200).json({ 
      success: true, 
      message: "Senha alterada com sucesso!" 
    });
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ---------- DELETAR CONTA ----------
const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user?.id;

    await userService.verifyPassword(userId, password);
    
    res.status(200).json({ 
      success: true, 
      message: "Senha correta" 
    });
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    
    const status = error.message === "Usuário não encontrado" ? 404 :
                   error.message === "Senha incorreta" ? 401 : 500;
    res.status(status).json({ 
      success: false, 
      message: error.message 
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user?.id;
    await userService.deleteUser(userId);
    
    res.status(200).json({ 
      success: true, 
      message: "Conta deletada com sucesso!" 
    });
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ---------- ATUALIZAR PERFIL ----------
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await userService.updateProfile(userId, req.body);
    
    res.status(200).json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      user: user,
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    
    const status = error.message === "Email já está em uso" ? 409 : 400;
    res.status(status).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ---------- LISTAR TODOS OS USUÁRIOS ----------
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    
    res.status(200).json({ 
      success: true, 
      users 
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar usuários" 
    });
  }
};

// ---------- OBTER PERFIL DO USUÁRIO ----------
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await userService.getUserProfile(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuário não encontrado" 
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao buscar perfil" 
    });
  }
};

// ---------- BUSCAR USUÁRIO POR ID (ADMIN) ----------
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
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
    const result = await userService.userExists(id);
    
    res.json(result);
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor" 
    });
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