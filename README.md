# Andrew TTS Pro Dashboard

Modern web dashboard for the Andrew TTS parallel text-to-speech engine.

## Features

- **Fast Mode**: Max 20 workers for single novel (full speed)
- **Balanced Mode**: Max 10 workers (run 2 novels simultaneously)
- **Live Progress**: Real-time chunk progress + ETA
- **Worker Count**: See how many workers are active
- **Audio Library**: Browse and download all generated audiobooks

## Setup

### 1. Install dependencies
```bash
cd dashboard
npm install
```

### 2. Set environment variables
Create a `.env` file or export:
```bash
export GITHUB_PAT="ghp_your_github_personal_access_token"
export COORD_URL="https://tts-coordinator.crackedplayer1202.workers.dev"
export COORD_SECRET="hanshu_tts_secret_2024"
```

### 3. Run the server
```bash
npm start
```

Open http://localhost:3000 in your browser.

## Deployment

### Option 1: Vercel (recommended)
1. Push this folder to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Option 2: Railway/Render
1. Connect your repo
2. Set environment variables
3. Deploy

### Option 3: VPS
```bash
npm install
pm2 start server.js --name andrew-tts
```

## API Endpoints

- `POST /api/trigger` - Start a new TTS run
- `GET /api/progress/:runId` - Get live progress
- `GET /api/releases` - List all audio releases

## Security Notes

- Never commit `.env` file with real tokens
- GitHub PAT needs `repo` + `workflow` scopes
- Rate limit: 1 trigger per 5 min recommended
