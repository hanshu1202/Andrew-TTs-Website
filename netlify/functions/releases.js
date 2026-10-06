import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_PAT;
const AUDIO_REPO = 'hanshu1202/andrew-tts-audio';

export async function handler(event) {
  try {
    const response = await fetch(`https://api.github.com/repos/${AUDIO_REPO}/releases?per_page=20`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    const releases = await response.json();

    const formatted = releases.map(r => ({
      title: r.name,
      date: r.created_at,
      size: r.assets[0] ? `${(r.assets[0].size / (1024*1024)).toFixed(1)} MB` : 'Unknown',
      downloadUrl: r.assets[0]?.browser_download_url || '#'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(formatted)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}