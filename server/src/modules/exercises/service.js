const db = require('../../db/connection');

async function list({ categoryId } = {}) {
  const params = [];
  const where = categoryId ? (params.push(categoryId), 'WHERE e.category_id = $1') : '';
  const { rows } = await db.query(
    `SELECT e.*, c.nombre AS category_nombre
     FROM exercises e
     JOIN categories c ON e.category_id = c.id
     ${where}
     ORDER BY c.orden, c.nombre, e.nombre`,
    params
  );
  return rows;
}

async function getById(id) {
  const { rows } = await db.query(
    `SELECT e.*, c.nombre AS category_nombre
     FROM exercises e
     JOIN categories c ON e.category_id = c.id
     WHERE e.id = $1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Ejercicio no encontrado'), { status: 404 });
  return rows[0];
}

async function create({ category_id, nombre, descripcion, video_url }, createdBy) {
  const { rows } = await db.query(
    `INSERT INTO exercises(category_id, nombre, descripcion, video_url, created_by)
     VALUES($1, $2, $3, $4, $5) RETURNING *`,
    [category_id, nombre, descripcion || null, video_url || null, createdBy]
  );
  return rows[0];
}

async function update(id, { category_id, nombre, descripcion, video_url }) {
  const { rows } = await db.query(
    `UPDATE exercises SET category_id=$1, nombre=$2, descripcion=$3, video_url=$4
     WHERE id=$5 RETURNING *`,
    [category_id, nombre, descripcion || null, video_url || null, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Ejercicio no encontrado'), { status: 404 });
  return rows[0];
}

async function setVideoFile(id, filename) {
  const { rows } = await db.query(
    `UPDATE exercises SET video_file_path=$1 WHERE id=$2 RETURNING *`,
    [filename, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Ejercicio no encontrado'), { status: 404 });
  return rows[0];
}

async function clearVideoFile(id) {
  const { rows } = await db.query(
    `UPDATE exercises SET video_file_path=NULL WHERE id=$1 RETURNING *`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Ejercicio no encontrado'), { status: 404 });
  return rows[0];
}

async function remove(id) {
  const { rows: used } = await db.query(
    'SELECT id FROM routine_exercises WHERE exercise_id=$1 LIMIT 1',
    [id]
  );
  if (used.length > 0) {
    throw Object.assign(
      new Error('El ejercicio está en una o más rutinas. Quitalo de las rutinas primero.'),
      { status: 409 }
    );
  }
  const { rows } = await db.query('DELETE FROM exercises WHERE id=$1 RETURNING id', [id]);
  if (!rows[0]) throw Object.assign(new Error('Ejercicio no encontrado'), { status: 404 });
}

module.exports = { list, getById, create, update, setVideoFile, clearVideoFile, remove };
