/**
 * PM2 da API Voneka Projectos no alojamento get.co.mz.
 *
 * Porta 3020: store usa 3000, mobility usa 3010-3012.
 * O .htaccess de projects.get.co.mz proxia /api para 127.0.0.1:3020.
 */
module.exports = {
  apps: [
    {
      name: 'voneka-api',
      cwd: '/home/voneka/apps/projects.get.co.mz/apps/api',
      script: './src/server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
    },
  ],
};
