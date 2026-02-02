/**
 * PM2 Ecosystem Configuration
 * Untuk deployment production dengan PM2
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      name: 'presensi-app',
      script: 'npm',
      args: 'start',
      cwd: './',
      
      // Instance configuration
      instances: 'max', // Gunakan semua CPU cores
      exec_mode: 'cluster', // Cluster mode untuk load balancing
      
      // Auto restart configuration
      watch: false,
      max_memory_restart: '500M',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      log_file: './logs/combined.log',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Restart policy
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
