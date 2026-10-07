const fetch = require('node-fetch');

const AUDIO_REPO = 'hanshu1202/andrew-tts-audio';

exports.handler = async function(event) {
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Andrew-TTS-Dashboard'
    };

    // Add token if available (increases rate limit)
    if (process.env.GITHUB_PAT) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_PAT}`;
    }

    const response = await fetch(`https://api.github.com/repos/${AUDIO_REPO}/releases?per_page=20`, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
    }

    const releases = await response.json();

    // Handle empty or malformed response
    if (!Array.isArray(releases)) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    const formatted = releases.map(r => ({
      title: r.name || 'Untitled',
      date: r.created_at,
      size: r.assets?.[0]?.size ? `${(r.assets[0].size / (1024*1024)).toFixed(1)} MB` : 'Unknown',
      downloadUrl: r.assets?.[0]?.browser_download_url || '#'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(formatted)
    };
  } catch (error) {
    console.error('Releases fetch error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};