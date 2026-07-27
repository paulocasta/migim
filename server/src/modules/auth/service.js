const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db/connection');
const config = require('../../config');

async function login(email, password) {
  const { rows } = await db.query(
    'SELECT id, nombre, email, password_hash, role, activo FROM users WHERE email=$1',
    [email]
  );
  const user = rows[0];
  if (!user) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  if (!user.activo) throw Object.assign(new Error('Usuario inactivo'), { status: 403 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });

  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

  return {
    token,
    user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
  };
}

module.exports = { login };
