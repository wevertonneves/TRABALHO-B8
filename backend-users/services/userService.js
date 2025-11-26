// backend-users/services/userService.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const cacheService = require('./cacheService');
const eventPublisher = require('../shared/messaging/eventPublisher');

class UserService {
  // ✅ Validações
  isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  isValidPassword(password) {
    return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{7,}$/.test(password);
  }

  // ✅ Configuração de email (simples)
  emailTransporter() {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // ✅ Criar usuário
  async createUser(userData) {
    const { name, email, password, role } = userData;

    // Validações básicas
    if (!name || name.length < 3) throw new Error('Nome inválido');
    if (!this.isValidEmail(email)) throw new Error('Email inválido');
    if (!this.isValidPassword(password)) throw new Error('Senha inválida');

    // Verificar email único
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new Error('Email já cadastrado');

    // Criar usuário
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'user';

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: userRole,
    });

    // Publicar evento
    try {
      await eventPublisher.userCreated(user);
    } catch (error) {
      console.error('❌ Erro ao publicar evento:', error);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

  // ✅ Login
  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Usuário não encontrado');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error('Senha incorreta');

    // Gerar token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'segredo_super_forte',
      { expiresIn: '1h' }
    );

    // Publicar evento
    try {
      await eventPublisher.userLoggedIn(user.id, user.email);
    } catch (error) {
      console.error('❌ Erro ao publicar evento:', error);
    }

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    };
  }

  // ✅ Alterar senha
  async changePassword(userId, oldPassword, newPassword) {
    if (!this.isValidPassword(newPassword)) {
      throw new Error('Senha inválida');
    }

    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuário não encontrado');

    const validOldPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validOldPassword) throw new Error('Senha atual incorreta');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    // Publicar evento
    try {
      await eventPublisher.userUpdated(userId, {}, {});
    } catch (error) {
      console.error('❌ Erro ao publicar evento:', error);
    }

    return true;
  }

  // ✅ Recuperação de senha
  async sendResetCode(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Email não encontrado');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await user.update({ reset_code: code });

    // Enviar email (simples)
    const transporter = this.emailTransporter();
    await transporter.sendMail({
      from: `"Suporte PontoCerto" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Código de recuperação de senha",
      text: `Seu código de recuperação é: ${code}`,
    });

    return true;
  }

  // ✅ Buscar usuário com cache
  async getUserById(userId) {
    const cacheKey = `user:${userId}`;
    
    const cachedUser = await cacheService.get(cacheKey);
    if (cachedUser) return cachedUser;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role', 'created_at']
    });

    if (user) {
      await cacheService.set(cacheKey, user, 1800);
    }

    return user;
  }

  // ✅ Buscar todos usuários com cache
  async getAllUsers() {
    const cacheKey = 'users:all';
    
    const cachedUsers = await cacheService.get(cacheKey);
    if (cachedUsers) return cachedUsers;

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'created_at'],
      order: [['id', 'ASC']]
    });

    await cacheService.set(cacheKey, users, 900);
    return users;
  }

  // ✅ Deletar usuário
  async deleteUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuário não encontrado');

    await User.destroy({ where: { id: userId } });

    // Invalidar cache
    await cacheService.delete(`user:${userId}`);
    await cacheService.deletePattern('users:all*');

    // Publicar evento
    try {
      await eventPublisher.userDeleted(userId, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error('❌ Erro ao publicar evento:', error);
    }

    return true;
  }
}

module.exports = new UserService();