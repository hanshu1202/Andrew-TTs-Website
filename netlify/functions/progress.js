import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_PAT;
const COORD_URL = process.env.COORD_URL;
const COORD_SECRET = process.env.COORD_SECRET;
const ENGINE_REPO = 'hanshu1202/andrew-tts-engine';

export async function handler(event) {
  const runId = event.path.split('/').pop();

  try {
    // Get GitHub run status
    const runResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    const run = await runResp.json();

    // Get jobs
    const jobsResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/runs/${runId}/jobs`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    const jobs = await jobsResp.json();

    const workerJobs = jobs.jobs.filter(j => j.name === 'Worker');
    const activeWorkers = workerJobs.filter(j => j.status === 'in_progress').length;

    // Get coordinator status
    const coordResp = await fetch(`${COORD_URL}/status`, {
      headers: { 'x-auth': COORD_SECRET }
    });
    const coordStatus = coordResp.ok ? await coordResp.json() : { total: 0, done: 0 };

    // Calculate ETA
    const elapsed = (new Date() - new Date(run.created_at)) / 1000;
    const progress = coordStatus.total > 0 ? coordStatus.done / coordStatus.total : 0;
    const eta = progress > 0.1 ? Math.floor((elapsed / progress) - elapsed) : null;

    const formatTime = (sec) => `${Math.floor(sec/60)}m ${Math.floor(sec%60)}s`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: run.status,
        elapsed: formatTime(elapsed),
        workers: { active: activeWorkers, total: workerJobs.length },
        chunks: {
          done: coordStatus.done,
          total: coordStatus.total,
          missing: coordStatus.missing?.slice(0, 10) || []
        },
        eta: eta ? formatTime(eta) : 'calculating...'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}