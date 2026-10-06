import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_PAT;
const ENGINE_REPO = 'hanshu1202/andrew-tts-engine';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { text, novelName, mode } = JSON.parse(event.body);

    if (!text || text.length < 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Text too short' })
      };
    }

    // Get current input.txt sha
    const fileResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/contents/input.txt`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    const fileData = fileResp.ok ? await fileResp.json() : null;

    // Update input.txt
    await fetch(`https://api.github.com/repos/${ENGINE_REPO}/contents/input.txt`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update input.txt for ${novelName || 'new TTS run'}`,
        content: Buffer.from(text).toString('base64'),
        sha: fileData?.sha
      })
    });

    // Trigger workflow
    await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/workflows/TTS_Dynamic_Batch.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          novel_name: novelName || '',
          mode: mode || 'fast'
        }
      })
    });

    // Wait and get run ID
    await new Promise(resolve => setTimeout(resolve, 2000));
    const runsResp = await fetch(`https://api.github.com/repos/${ENGINE_REPO}/actions/runs?event=workflow_dispatch&per_page=5`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    const runs = await runsResp.json();
    const runId = runs.workflow_runs[0]?.id;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, runId })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}