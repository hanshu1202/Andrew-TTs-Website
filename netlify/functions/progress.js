const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_PAT;
const COORD_URL = process.env.COORD_URL;
const COORD_SECRET = process.env.COORD_SECRET;
const ENGINE_REPO = 'hanshu1202/andrew-tts-engine';

exports.handler = async function(event) {
  const runId = event.path.split('/').pop();

  if (!runId || runId === 'progress') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing run ID' })
    };
  }

  try {
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_PAT not configured');
    }

    // Get GitHub run status
    const runResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Andrew-TTS-Dashboard'
      }
    });

    if (!runResp.ok) {
      throw new Error(`GitHub API error: ${runResp.status}`);
    }

    const run = await runResp.json();

    // Get jobs
    const jobsResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/runs/${runId}/jobs`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Andrew-TTS-Dashboard'
      }
    });

    const jobsData = await jobsResp.json();
    const allJobs = jobsData.jobs || [];

    // Get coordinator status
    let chunks = { done: 0, total: 0, missing: [] };
    if (COORD_URL && COORD_SECRET) {
      try {
        const coordResp = await fetch(`${COORD_URL}/status`, {
          headers: { 'x-auth': COORD_SECRET },
          timeout: 5000
        });
        if (coordResp.ok) {
          const coordStatus = await coordResp.json();
          chunks = {
            done: coordStatus.done || 0,
            total: coordStatus.total || 0,
            missing: coordStatus.missing || []
          };
        }
      } catch (e) {
        console.warn('Coordinator fetch failed:', e.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: run.status,
        conclusion: run.conclusion,
        created: run.created_at,
        updated: run.updated_at,
        url: run.html_url,
        jobs: allJobs.map(j => ({
          name: j.name,
          status: j.status,
          conclusion: j.conclusion
        })),
        chunks
      })
    };
  } catch (error) {
    console.error('Progress error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};