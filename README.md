# Universal Video Downloader — Starter Project

A responsive React/Vite frontend plus a Node/Express API for **direct, publicly accessible media files that you own or are authorized to download**.

## Important limits

This is not (and cannot honestly be) a downloader for every website. Many sites block embedding, require login, use cross-origin protections, or stream DRM-protected media. This project does not bypass DRM, paywalls, authentication, or website restrictions. It downloads direct media URLs only (for example, an authorized `.mp4` or `.webm` URL). The browser preview is best-effort: websites may refuse to load in an iframe.

## Included

- URL/search bar and browser-style tabs
- Built-in preview pane (iframe; subject to the target site's embedding policy)
- External browser button
- Direct-media URL detection
- Floating “Video detected” panel
- Quality/format display based on the actual direct file (no fake upscaling or invented qualities)
- Download manager with progress and cancel
- Responsive dark UI
- Backend URL validation and basic SSRF protections

## Requirements

- Node.js 20+
- npm

## Run locally

### 1. API

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

API runs at `http://localhost:8787`.

### 2. Frontend

In another terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Deploy

### Backend (Render)

1. Push this repository to GitHub.
2. Create a new **Web Service** on Render and select the repository.
3. Set **Root Directory** to `server`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variable `FRONTEND_ORIGIN` with your deployed frontend origin, e.g. `https://your-app.vercel.app`.
7. Deploy and copy the Render service URL.

### Frontend (Vercel)

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Add environment variable `VITE_API_BASE_URL` with your Render API URL, e.g. `https://your-api.onrender.com`.
4. Deploy.

The client includes a `vercel.json` SPA rewrite. For another host, configure its SPA fallback accordingly.

## API

- `GET /api/health` — health check
- `POST /api/inspect` — validates a direct media URL and returns metadata
- `GET /api/download?url=...` — streams a direct media file to the browser

## Production hardening checklist

Before making this public, add rate limiting, request size limits, abuse monitoring, authentication if needed, a strict outbound-host allowlist if appropriate, malware/content scanning for uploaded files (if uploads are added), and operational logging. Consider a dedicated download worker/object storage for large files. Never expose this endpoint as an unrestricted public proxy.
