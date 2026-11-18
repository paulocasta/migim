require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BLOCK_TYPES = [
  { nombre: 'Entrada en calor', orden: 1 },
  { nombre: 'Potencia', orden: 2 },
  { nombre: 'Fuerza', orden: 3 },
  { nombre: 'Accesorios', orden: 4 },
  { nombre: 'Vuelta a la calma', orden: 5 },
];

const CATEGORIES = [
  { nombre: 'Piernas', orden: 1 },
  { nombre: 'Hombros', orden: 2 },
  { nombre: 'Espalda', orden: 3 },
  { nombre: 'Pecho', orden: 4 },
  { nombre: 'Brazos', orden: 5 },
  { nombre: 'Core', orden: 6 },
  { nombre: 'Glúteos', orden: 7 },
  { nombre: 'Movilidad / Elasticidad', orden: 8 },
  { nombre: 'Pliometría', orden: 9 },
];

const ADMIN = {
  nombre: 'Administrador',
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  role: 'admin',
};

if (!ADMIN.email || !ADMIN.password || ADMIN.password.length < 8) {
  console.error('ERROR: definir ADMIN_EMAIL y ADMIN_PASSWORD (mín. 8 caracteres) en .env antes de correr el seed');
  process.exit(1);
}

async function seed() {
  const client = await pool.connect();
  try {
    // block_types — idempotente
    for (const bt of BLOCK_TYPES) {
      await client.query(
        `INSERT INTO block_types(nombre, orden) VALUES($1, $2)
         ON CONFLICT DO NOTHING`,
        [bt.nombre, bt.orden]
      );
    }
    console.log('block_types OK');

    // categories — idempotente
    for (const cat of CATEGORIES) {
      await client.query(
        `INSERT INTO categories(nombre, orden) VALUES($1, $2)
         ON CONFLICT DO NOTHING`,
        [cat.nombre, cat.orden]
      );
    }
    console.log('categories OK');

    // admin user — idempotente por email
    const existing = await client.query('SELECT id FROM users WHERE email=$1', [ADMIN.email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(ADMIN.password, 10);
      await client.query(
        `INSERT INTO users(nombre, email, password_hash, role)
         VALUES($1, $2, $3, $4)`,
        [ADMIN.nombre, ADMIN.email, hash, ADMIN.role]
      );
      console.log(`Admin creado: ${ADMIN.email}`);
    } else {
      console.log('Admin ya existe, skip.');
    }

    console.log('Seed completo.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
