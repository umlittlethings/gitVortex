import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getRepoInfo, getDiff, executeGitCommand } from './gitApi.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'git-api-plugin',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, 'http://localhost');
          
          // API endpoint: /api/git/info
          if (url.pathname === '/api/git/info') {
            res.setHeader('Content-Type', 'application/json');
            const repoPath = url.searchParams.get('repoPath') || '.';
            try {
              const info = await getRepoInfo(repoPath);
              res.statusCode = 200;
              res.end(JSON.stringify(info));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ isValid: false, error: err.message }));
            }
            return;
          }

          // API endpoint: /api/git/diff
          if (url.pathname === '/api/git/diff') {
            res.setHeader('Content-Type', 'application/json');
            const repoPath = url.searchParams.get('repoPath') || '.';
            const file = url.searchParams.get('file') || '';
            const staged = url.searchParams.get('staged') === 'true';
            try {
              const diff = await getDiff(repoPath, file, staged);
              res.statusCode = 200;
              res.end(JSON.stringify(diff));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          // API endpoint: /api/git/command
          if (url.pathname === '/api/git/command' && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            
            // Read POST body
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body || '{}');
                const repoPath = data.repoPath || '.';
                const action = data.action;
                const params = data.params || {};

                if (!action) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Action is required' }));
                  return;
                }

                const result = await executeGitCommand(repoPath, action, params);
                res.statusCode = 200;
                res.end(JSON.stringify(result));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          // Pass through other requests
          next();
        });
      }
    }
  ],
})

