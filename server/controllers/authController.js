'use strict';

const UserModel = require('../models/userModel');
const { hashPassword, verifyPassword, signToken } = require('../utils/security');
const { ApiError, asyncHandler } = require('../middleware/errors');
const { automation } = require('../utils/n8n');
const config = require('../config');
const logger = require('../utils/logger');

function setAuthCookie(res, token) {
  res.cookie(config.auth.cookieName, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (UserModel.findByEmail(email)) throw ApiError.conflict('Email is already registered');

  const passwordHash = await hashPassword(password);
  const user = UserModel.create({ name, email, passwordHash, phone });

  const token = signToken(user);
  setAuthCookie(res, token);
  logger.info('User registered', { userId: user.id, email: user.email });

  automation.userRegistered({ id: user.id, name: user.name, email: user.email });

  res.status(201).json({ user: publicUser(user), token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = UserModel.findByEmail(email);

  // Run the hash comparison even when the user is missing to blunt timing attacks.
  const ok = user ? await verifyPassword(password, user.password_hash) : await verifyPassword(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv');

  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.is_active) throw ApiError.forbidden('Account is disabled');

  const token = signToken(user);
  setAuthCookie(res, token);
  logger.info('User logged in', { userId: user.id });

  res.json({ user: publicUser(user), token });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(config.auth.cookieName);
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = UserModel.findById(req.user.id);
  if (!user) throw ApiError.unauthorized();
  res.json({ user: publicUser(user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = UserModel.update(req.user.id, { name, phone });
  res.json({ user: publicUser(user) });
});

module.exports = { register, login, logout, me, updateProfile };
