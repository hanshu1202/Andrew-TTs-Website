# Andrew TTS Dashboard - Quick Start

## Local Testing (Port 8080)

1. Set your GitHub token:
```bash
export GITHUB_PAT="ghp_your_token_here"
```

2. Install and run:
```bash
npm install
npm run dev
```

3. Open: http://localhost:8080

## Deploy to Netlify

Push this entire `dashboard` folder to GitHub, then:

1. Go to https://app.netlify.com/
2. **Add new site** → **Import from Git**
3. Select your repo
4. **Build settings**: Leave empty
5. **Environment variables**:
   - `GITHUB_PAT` = your token
   - `COORD_URL` = `https://tts-coordinator.crackedplayer1202.workers.dev`
   - `COORD_SECRET` = `hanshu_tts_secret_2024`
6. Deploy!

## Files to push:
- `index.html` - Dashboard UI
- `netlify/` - Serverless functions
- `netlify.toml` - Netlify config
- `package.json` - Dependencies
- `.gitignore` - Excludes node_modules

**DO NOT commit `.env` file** (has your token)