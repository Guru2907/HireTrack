# HireTrack

A full-stack MERN job application tracker with AI-powered resume matching, built to go beyond a basic CRUD tracker with real analytics, security hardening, and a tested backend.

**Live:** [hiretrack-black.vercel.app](https://hiretrack-black.vercel.app)

**API:** [hiretrack-kvce.onrender.com](https://hiretrack-kvce.onrender.com) 
(spins down when idle — first request may take up to a minute)
## Features

- **Authentication** — Signup/login with JWT (7-day expiry) and bcrypt password hashing (cost factor 12). All data is scoped per-user at the query level (every Mongoose query filters by `user: req.user._id`), so users can only ever see or modify their own records.
- **Applications tracking** — Full CRUD on job applications with inline add/edit (no modals — the edit form appears directly below the row being edited). Applications with a "Rejected" status are automatically sorted to the bottom of the list, and applications stuck in "Applied" status for 10+ days are flagged with an animated "Stale" badge.
- **Dashboard analytics** — Multiple chart types built with Recharts, all computed client-side from the user's own application data using `.filter()`/`.reduce()`:
  - Pie chart of applications by status
  - Line chart of applications over time (running total)
  - Funnel conversion rates (Applied → Interview, Interview → Offer)
  - Application pace bar chart with average applications per week
  - Pipeline Health radial gauge showing percentage of stale applications, with a color threshold (turns red above 40%)
  - Outcome Breakdown chart comparing Offers vs. Rejections, plus average response time
- **Resume management** — Save resumes either by pasting text directly or by uploading a PDF, which is parsed server-side into plain text (never persisted to disk). Resumes can be edited or deleted after saving.
- **AI resume matcher** — Submits a saved resume and a job description to the Google Gemini API and returns a match score (0–100), a list of missing keywords, and specific improvement suggestions.
- **Prompt-injection hardening** — The AI's instructions are sent through Gemini's `systemInstruction` channel, completely separate from the untrusted resume/job-description text (sent via `contents`, wrapped in delimiters). This was verified with three controlled adversarial tests (a blunt "ignore your instructions" override, a disguised claim of prior approval, and a domain-mismatch case), each compared against the same input without the injection to confirm the defense actually held rather than just coincidentally scoring high.
- **Rate limiting** — The AI matching endpoint is rate-limited per-user (not per-IP) using `express-rate-limit` with a custom key generator based on the authenticated user's ID.
- **Centralized session handling** — A single Axios instance with request/response interceptors automatically attaches the auth token to every request and automatically logs the user out (clears token, redirects to login) on any 401 response, replacing duplicated auth logic that used to live in every API file.
- **Profile management** — Users can change their display name or password from a dedicated profile page. Changing a password requires re-entering the current password, verified server-side with `bcrypt.compare` before the change is allowed.
- **Loading states** — Custom skeleton screens matching each page's real layout (Dashboard, Applications, Resumes, Matcher), shown for a guaranteed minimum duration so fast responses don't cause a jarring flash.

## Tech Stack

**Frontend:** React (Vite), Tailwind CSS, Recharts, Axios, React Router

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcrypt

**AI:** Google Gemini API (`@google/genai`)

**File handling:** Multer, pdf-parse

**Testing & CI:** Jest, GitHub Actions

**Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas (database)

## How It Works

1. A user signs up or logs in; the backend issues a JWT that the frontend stores and attaches to every subsequent request via an Axios interceptor.
2. Every backend route runs through a `protect` middleware that verifies the JWT and attaches the user to the request; every database query is then scoped to that user's own data.
3. The user logs applications through the Applications page. That data feeds the Dashboard, where all charts and stats are computed client-side from the applications the user has fetched.
4. The user saves one or more resumes, either by pasting text or uploading a PDF (extracted to text on the backend and never written to disk).
5. To run a match, the user picks a saved resume and pastes a job description. The backend builds a Gemini request with the AI's rules in the system-instruction channel and the resume/job text isolated in the content channel, then validates the shape of the AI's response before returning it.

## Installation

```bash
# Clone the repo
git clone https://github.com/<your-username>/hiretrack.git
cd hiretrack

# Backend
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY

# Frontend
cd ../frontend
npm install
cp .env.example .env   # fill in VITE_API_URL
```

## Usage

```bash
# Run the backend (from /backend)
npm run dev

# Run the frontend (from /frontend)
npm run dev
```

Live deployment:
- Frontend: deployed on Vercel
- Backend: deployed on Render (free tier — the first request after inactivity can take 30–50 seconds to wake up, which is why login/signup show a loading state explaining the delay)
- Database: MongoDB Atlas

## Project Structure

```
hiretrack/
├── .github/workflows/
│   └── ci.yml                     # GitHub Actions: backend tests + frontend build
├── backend/
│   ├── controllers/
│   │   ├── __tests__/
│   │   │   └── match.test.js      # tests AI response validation logic
│   │   ├── applications.js
│   │   ├── auth.js
│   │   ├── match.js                # Gemini integration + prompt-injection defenses
│   │   └── resumes.js              # includes PDF parsing
│   ├── middleware/
│   │   ├── __tests__/
│   │   │   └── protect.test.js    # tests JWT auth middleware
│   │   ├── matchLimiter.js         # per-user rate limiting
│   │   ├── protect.js              # JWT verification
│   │   └── upload.js               # multer config for PDF uploads
│   ├── models/
│   │   ├── Application.js
│   │   └── User.js
│   ├── routes/
│   └── server.js
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── axiosClient.js      # centralized instance + interceptors
│       │   ├── applications.js
│       │   ├── auth.js
│       │   ├── match.js
│       │   └── resumes.js
│       ├── components/
│       │   ├── ApplicationCard.jsx
│       │   ├── Navbar.jsx
│       │   ├── StatusBadge.jsx
│       │   └── Skeleton*.jsx       # loading-state components
│       ├── context/
│       │   └── AuthContext.jsx
│       └── pages/
│           ├── private/            # Dashboard, Applications, Resumes, Matcher, Profile
│           └── public/             # Landing, Login, Signup
└── README.md
```

## Key Implementation Details

- **Ownership-scoped queries**: Every controller filters by the authenticated user's ID rather than relying only on route-level protection, so there's a second layer of enforcement even if a middleware were ever misconfigured.
- **Prompt-injection defense**: Gemini's `systemInstruction` and `contents` are separate channels — the model is told, in the system instruction, to never treat anything inside the resume/job-description content as an instruction. This was tested, not just assumed: three adversarial inputs were run against the live API and compared to their non-adversarial counterparts to confirm the score/output didn't change in a way that indicated a bypass.
- **Structural output validation**: After the AI responds, the backend checks that `score` is a number in range, and that `missingKeywords`/`suggestions` are arrays, before returning anything to the client — an independent safety net in case the prompt-level defenses ever fail.
- **In-memory PDF parsing**: Uploaded resumes are processed with `multer`'s memory storage and `pdf-parse`, so the raw file is never written to disk — only the extracted text is stored.
- **Centralized Axios client**: Auth-header attachment and 401 handling used to be duplicated across every API file; they now live in one interceptor-based client that all API modules import.
- **Tested security-critical paths**: Jest tests cover the JWT auth middleware and the AI response validator, using mocked `jsonwebtoken` and Mongoose models so tests never touch a real database or make a real API call.
- **CI on every push**: A GitHub Actions workflow runs the backend test suite and the frontend build on every push, catching breakages before they reach deployment.

## What I Learned

- How React's render cycle and Rules of Hooks actually work in practice — why a hook can't be called conditionally or after an early return, and what breaks when it is.
- The difference between passing a function reference and calling a function immediately in JSX event handlers.
- Async/await pitfalls: a missing `await` on `bcrypt.compare` silently returns a Promise (which is always truthy), which was a real security bug caught during development — not a hypothetical one.
- Mongoose's array update operators (`$push`/`$pull`) versus plain field updates, and when each is needed.
- That "prompt injection defense" isn't something you finish — it's layered and has to be tested with actual adversarial inputs and controlled comparisons, not just assumed to work because the output looks reasonable.
- Why file uploads need `multipart/form-data` and `FormData` on the client, instead of a normal JSON body.
- How to reason about ownership/authorization at the database-query level, not just at the route level.

## Future Improvements

- Move the JWT from `localStorage` to an httpOnly cookie to reduce XSS exposure (considered, deliberately deferred due to time).
- Add a frontend test suite (none currently exists — only backend Jest tests are in place).
- Real-time notifications (e.g. via Socket.io) — considered as a possible addition, not implemented.
- A browser extension for one-click application capture from job posting pages.

## Author

**Gurpreet Singh**
