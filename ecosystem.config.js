module.exports = {
  apps: [
    {
      name: 'migim-api',
      script: './server/src/index.js',
      cwd: '/var/www/migim',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/migim/error.log',
      out_file: '/var/log/migim/out.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
