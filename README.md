# HireTrack

A full-stack job application tracker with AI-powered resume matching.

**Live:** [hiretrack-black.vercel.app](https://hiretrack-black.vercel.app)
**API:** [hiretrack-kvce.onrender.com](https://hiretrack-kvce.onrender.com) (spins down when idle — first request may take up to a minute)

## What it does
Track job applications through their full lifecycle (Applied → Interview → Offer/Rejected), see real analytics on your pipeline, save multiple resume versions (pasted text or PDF upload, with server-side text extraction), and get an AI-generated match score against any job description using the Gemini API.

## Stack
- **Frontend:** React (Vite), Tailwind CSS, Recharts
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth
- **AI:** Google Gemini API
- **Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas

## Architecture
A standard client-server REST API. The React frontend talks to the Express backend exclusively over authenticated HTTP requests (JWT bearer tokens, attached automatically via a centralized Axios instance with request/response interceptors). All data is scoped per-user at the query level — every read and write filters by the authenticated user's ID, verified server-side by JWT middleware before any request reaches a controller.

## Security notes
- Rate limiting on the AI matching endpoint, scoped per authenticated user (not IP), to prevent quota abuse on a metered API
- Prompt-injection defenses on the AI matcher: instructions and untrusted user content are sent through separate channels (`systemInstruction` vs. `contents`), with output structurally validated before being trusted — tested against direct and disguised injection attempts
- Centralized 401 handling: an Axios response interceptor detects expired/invalid sessions and logs the user out automatically, app-wide, rather than relying on each page to handle it individually
- Passwords hashed with bcrypt, never stored or transmitted in plain text

## Running locally
```bash
# backend
cd backend
npm install
npm run dev

# frontend, in a separate terminal
cd frontend
npm install
npm run dev
```
Both need a `.env` file — see `.env.example` in each folder for required variables.

## Testing
```bash
cd backend
npm test
```
Covers the JWT auth middleware and the AI response validation logic.

## Known limitations / next steps
- JWT is stored in `localStorage` rather than an httpOnly cookie — a deliberate tradeoff for development speed; httpOnly cookies would be the production-hardened choice
- No frontend test suite yet
- Real-time status update notifications (Socket.io) not yet implemented