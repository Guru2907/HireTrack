# HireTrack

Full-stack job application tracker with real-time updates and an AI resume-JD matcher.

## Stack
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth, Socket.io
- Frontend: React (Vite), Tailwind CSS, Recharts, Axios, React Router
- AI: Gemini API

## Structure
- `/backend` — Express API server
- `/frontend` — React app (Vite)

## Build order (matches the phase plan)
1. Backend core: models, auth, CRUD — test every route in Thunder Client before moving on
2. Frontend core: auth pages, dashboard, applications board
3. Socket.io real-time status notifications
4. AI resume-JD matcher (Gemini)
5. Deploy (Vercel + Render + Atlas)

Every `// TODO` comment in this skeleton marks a spot to fill in as you reach that phase.
Do not delete the TODO comments until you've replaced them — they're your checklist.
