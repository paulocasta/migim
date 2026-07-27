const bcrypt = require('bcrypt');
const db = require('../../db/connection');

async function list({ filterRole, requesterRole }) {
  const params = [];
  const conditions = [];

  if (requesterRole === 'profesor') {
    conditions.push(`u.role = 'alumno'`);
  } else if (filterRole) {
    params.push(filterRole);
    conditions.push(`u.role = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT u.id, u.nombre, u.email, u.role, u.activo, u.created_at,
            cb.nombre AS created_by_nombre
     FROM users u
     LEFT JOIN users cb ON u.created_by = cb.id
     ${where}
     ORDER BY u.role, u.nombre`,
    params
  );
  return rows;
}

async function getById(id) {
  const { rows } = await db.query(
    `SELECT id, nombre, email, role, activo, created_by, created_at FROM users WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  return rows[0];
}

async function create({ nombre, email, password, role }, createdBy) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users(nombre, email, password_hash, role, created_by)
     VALUES($1, $2, $3, $4, $5)
     RETURNING id, nombre, email, role, activo, created_at`,
    [nombre, email, hash, role, createdBy]
  );
  return rows[0];
}

async function update(id, { nombre, email, password }) {
  const sets = ['nombre = $1', 'email = $2'];
  const params = [nombre, email];

  if (password && password.trim()) {
    const hash = await bcrypt.hash(password, 10);
    sets.push(`password_hash = $${params.length + 1}`);
    params.push(hash);
  }

  params.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, nombre, email, role, activo`,
    params
  );
  if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  return rows[0];
}

async function setActivo(id, activo) {
  const { rows } = await db.query(
    `UPDATE users SET activo = $1 WHERE id = $2
     RETURNING id, nombre, email, role, activo`,
    [activo, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  return rows[0];
}

module.exports = { list, getById, create, update, setActivo };
