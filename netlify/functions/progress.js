const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_PAT;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
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

    // Get run status via Supabase RPC
    let chunks = { done: 0, total: 0, missing: [] };
    if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
      try {
        const supResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_status`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SECRET_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          timeout: 5000
        });
        if (supResp.ok) {
          const status = await supResp.json();
          chunks = {
            done: status.done || 0,
            total: status.total || 0,
            missing: status.missing || []
          };
        }
      } catch (e) {
        console.warn('Supabase run_status fetch failed:', e.message);
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
