const db = require('../../db/connection');

async function list() {
  const { rows } = await db.query('SELECT * FROM categories ORDER BY orden, nombre');
  return rows;
}

async function create({ nombre, orden }) {
  const { rows } = await db.query(
    'INSERT INTO categories(nombre, orden) VALUES($1, $2) RETURNING *',
    [nombre, orden ?? 0]
  );
  return rows[0];
}

async function update(id, { nombre, orden }) {
  const { rows } = await db.query(
    'UPDATE categories SET nombre=$1, orden=$2 WHERE id=$3 RETURNING *',
    [nombre, orden ?? 0, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Categoría no encontrada'), { status: 404 });
  return rows[0];
}

async function remove(id) {
  const { rows: used } = await db.query(
    'SELECT id FROM exercises WHERE category_id=$1 LIMIT 1',
    [id]
  );
  if (used.length > 0) {
    throw Object.assign(
      new Error('La categoría tiene ejercicios. Eliminalos primero.'),
      { status: 409 }
    );
  }
  const { rows } = await db.query(
    'DELETE FROM categories WHERE id=$1 RETURNING id',
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Categoría no encontrada'), { status: 404 });
}

module.exports = { list, create, update, remove };
