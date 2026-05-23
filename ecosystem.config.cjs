/**
 * PM2 production process config.
 * Usage: pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: 'pm-tool-api',
      script: './backend/dist/src/main.js',
      cwd: '/var/www/pm_tool',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/pm-tool-api-error.log',
      out_file: '/var/log/pm2/pm-tool-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Restart on uncaught exception; back off after 5 restarts in 60s
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
    },
  ],
};
