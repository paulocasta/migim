require('dotenv').config();

const config = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.databaseUrl) {
  console.error('ERROR: DATABASE_URL no está configurado en .env');
  process.exit(1);
}

module.exports = config;
