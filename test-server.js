// Simple test server that mimics Netlify Functions locally
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Load environment variables
const GITHUB_PAT = process.env.GITHUB_PAT || 'YOUR_GITHUB_TOKEN';
const COORD_URL = process.env.COORD_URL || 'https://tts-coordinator.crackedplayer1202.workers.dev';
const COORD_SECRET = process.env.COORD_SECRET || 'hanshu_tts_secret_2024';

// Import and wrap Netlify functions
async function loadFunction(name) {
  const mod = await import(`./netlify/functions/${name}.js`);
  return mod.handler;
}

// Wrap Netlify function format for Express
function wrapNetlifyFunction(handler) {
  return async (req, res) => {
    const event = {
      httpMethod: req.method,
      path: req.path,
      body: JSON.stringify(req.body),
      headers: req.headers
    };

    const result = await handler(event);
    res.status(result.statusCode).json(JSON.parse(result.body));
  };
}

// Mount functions
(async () => {
  process.env.GITHUB_PAT = GITHUB_PAT;
  process.env.COORD_URL = COORD_URL;
  process.env.COORD_SECRET = COORD_SECRET;

  app.post('/.netlify/functions/trigger', wrapNetlifyFunction(await loadFunction('trigger')));
  app.get('/.netlify/functions/progress/:runId', wrapNetlifyFunction(await loadFunction('progress')));
  app.get('/.netlify/functions/releases', wrapNetlifyFunction(await loadFunction('releases')));

  const PORT = 8080;
  app.listen(PORT, () => {
    console.log(`✅ Local test server running on http://localhost:${PORT}`);
    console.log(`📊 GitHub: ${GITHUB_PAT === 'YOUR_GITHUB_TOKEN' ? '⚠️  SET GITHUB_PAT env var' : '✅ Connected'}`);
  });
})();
