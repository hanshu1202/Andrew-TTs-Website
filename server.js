import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// =================== CONFIG ===================
const GITHUB_TOKEN = process.env.GITHUB_PAT || 'YOUR_GITHUB_PAT_HERE';
const COORD_URL = process.env.COORD_URL || 'https://tts-coordinator.crackedplayer1202.workers.dev';
const COORD_SECRET = process.env.COORD_SECRET || 'hanshu_tts_secret_2024';
const ENGINE_REPO = 'hanshu1202/andrew-tts-engine';
const AUDIO_REPO = 'hanshu1202/andrew-tts-audio';

// =================== HELPER FUNCTIONS ===================
async function githubAPI(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function coordAPI(path, options = {}) {
  const response = await fetch(`${COORD_URL}${path}`, {
    ...options,
    headers: {
      'x-auth': COORD_SECRET,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Coordinator error: ${response.status} ${error}`);
  }

  return response.json();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb > 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

// =================== API ENDPOINTS ===================

// POST /api/trigger - Start a new TTS run
app.post('/api/trigger', async (req, res) => {
  try {
    const { text, novelName, mode } = req.body;

    if (!text || text.length < 100) {
      return res.status(400).json({ success: false, error: 'Text too short' });
    }

    // Step 1: Update input.txt in the repo
    const fileData = await githubAPI(`/repos/${ENGINE_REPO}/contents/input.txt`).catch(() => null);

    await githubAPI(`/repos/${ENGINE_REPO}/contents/input.txt`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Update input.txt for ${novelName || 'new TTS run'}`,
        content: Buffer.from(text).toString('base64'),
        sha: fileData?.sha // Required if file exists
      })
    });

    // Step 2: Trigger the workflow
    await githubAPI(`/repos/${ENGINE_REPO}/actions/workflows/TTS_Dynamic_Batch.yml/dispatches`, {
      method: 'POST',
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          novel_name: novelName || '',
          mode: mode || 'fast'
        }
      })
    });

    // Step 3: Find the run ID (newest workflow_dispatch run)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for GitHub to register it
    const runs = await githubAPI(`/repos/${ENGINE_REPO}/actions/runs?event=workflow_dispatch&per_page=5`);
    const runId = runs.workflow_runs[0]?.id;

    res.json({ success: true, runId });
  } catch (error) {
    console.error('Trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/progress/:runId - Get live progress
app.get('/api/progress/:runId', async (req, res) => {
  try {
    const { runId } = req.params;

    // Get GitHub Actions run status
    const run = await githubAPI(`/repos/${ENGINE_REPO}/actions/runs/${runId}`);
    const jobs = await githubAPI(`/repos/${ENGINE_REPO}/actions/runs/${runId}/jobs`);

    // Count active workers
    const workerJobs = jobs.jobs.filter(j => j.name === 'Worker');
    const activeWorkers = workerJobs.filter(j => j.status === 'in_progress').length;
    const totalWorkers = workerJobs.length;

    // Get coordinator status
    const coordStatus = await coordAPI('/status').catch(() => ({ total: 0, done: 0, missing: [] }));

    // Calculate ETA
    const elapsed = (new Date() - new Date(run.created_at)) / 1000;
    const progress = coordStatus.total > 0 ? coordStatus.done / coordStatus.total : 0;
    const eta = progress > 0.1 ? Math.floor((elapsed / progress) - elapsed) : null;

    res.json({
      status: run.status,
      elapsed: formatTime(elapsed),
      workers: { active: activeWorkers, total: totalWorkers },
      chunks: {
        done: coordStatus.done,
        total: coordStatus.total,
        missing: coordStatus.missing.slice(0, 10) // Only first 10
      },
      eta: eta ? formatTime(eta) : 'calculating...'
    });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/releases - Get all audio releases
app.get('/api/releases', async (req, res) => {
  try {
    const releases = await githubAPI(`/repos/${AUDIO_REPO}/releases?per_page=20`);

    const formatted = releases.map(r => ({
      title: r.name,
      date: r.created_at,
      size: r.assets[0] ? formatSize(r.assets[0].size) : 'Unknown',
      downloadUrl: r.assets[0]?.browser_download_url || '#'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Releases error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== START SERVER ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎙️ Andrew TTS Dashboard running on http://localhost:${PORT}`);
  console.log(`📊 Mode: ${GITHUB_TOKEN === 'YOUR_GITHUB_PAT_HERE' ? '⚠️  NO GITHUB TOKEN SET' : '✅ GitHub connected'}`);
});
