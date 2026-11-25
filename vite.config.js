import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fetchRiderNews } from './api/noticias.js';

function localNoticiasApiPlugin() {
  return {
    name: 'local-noticias-api',
    configureServer(server) {
      server.middlewares.use('/api/noticias', async (req, res) => {
        try {
          const data = await fetchRiderNews();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              items: [],
              error: err?.message || 'Error cargando noticias en desarrollo',
              updatedAt: new Date().toISOString(),
            })
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localNoticiasApiPlugin()],
});
