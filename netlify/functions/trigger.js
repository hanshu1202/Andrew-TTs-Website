const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_PAT;
const ENGINE_REPO = 'hanshu1202/andrew-tts-engine';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { text, novelName, mode, outputType, resolution } = JSON.parse(event.body);

    if (!text || text.length < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Text too short (min 100 chars)' })
      };
    }

    if (!GITHUB_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GITHUB_PAT not configured in Netlify' })
      };
    }

    // Get current input.txt sha
    const fileResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/contents/input.txt`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Andrew-TTS-Dashboard'
      }
    });

    if (!fileResp.ok && fileResp.status !== 404) {
      const errData = await fileResp.json().catch(() => ({}));
      throw new Error(`GitHub API error (${fileResp.status}): ${errData.message || fileResp.statusText}`);
    }

    const fileData = fileResp.ok ? await fileResp.json() : null;

    // Update input.txt
    const updateResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/contents/input.txt`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Andrew-TTS-Dashboard'
      },
      body: JSON.stringify({
        message: `Update input.txt for ${novelName || 'new TTS run'}`,
        content: Buffer.from(text).toString('base64'),
        sha: fileData?.sha
      })
    });

    if (!updateResp.ok) {
      const errData = await updateResp.json().catch(() => ({}));
      throw new Error(`Failed to update input.txt (${updateResp.status}): ${errData.message || updateResp.statusText}`);
    }

    // Trigger workflow
    const workflowResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/workflows/TTS_Dynamic_Batch.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Andrew-TTS-Dashboard'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          novel_name: novelName || '',
          mode: mode || 'fast',
          output_type: outputType || 'audio',
          resolution: resolution || '720'
        }
      })
    });

    if (!workflowResp.ok) {
      const errData = await workflowResp.json().catch(() => ({}));
      throw new Error(`Failed to trigger workflow (${workflowResp.status}): ${errData.message || workflowResp.statusText}`);
    }

    // Wait and get run ID
    await new Promise(resolve => setTimeout(resolve, 3000));
    const runsResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/runs?event=workflow_dispatch&per_page=5`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Andrew-TTS-Dashboard'
      }
    });

    if (!runsResp.ok) {
      console.warn('Failed to fetch run ID, but workflow was triggered');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, runId: null })
      };
    }

    const runs = await runsResp.json();
    const runId = runs.workflow_runs?.[0]?.id || null;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, runId })
    };
  } catch (error) {
    console.error('Trigger error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};