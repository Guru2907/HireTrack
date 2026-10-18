# HireTrack

A full-stack MERN job application tracker with AI-powered resume matching, built to go beyond a basic CRUD tracker with real analytics, security hardening, and a tested backend.

## Features

- **Authentication**: Signup and login with JWT (7-day expiry) and bcrypt password hashing (cost factor 12). Login failures return one generic message, signup rejects duplicate emails with a 409, and passwords longer than bcrypt's 72-byte limit are refused instead of being silently truncated. All data is scoped per user at the query level: every Mongoose query filters by `user: req.user._id`, so users can only ever see or modify their own records.
- **Applications tracking**: Full CRUD with a slide-over form (company, role, status, job URL, applied date, notes):
  - Search across company, role and notes.
  - Filter by status, with live counts.
  - Sort by last update, applied date or company. "Rejected" applications always sort to the bottom.
  - Change an application's status straight from the list; the change shows immediately and reverts if the save fails.
  - A desktop table becomes stacked cards on mobile.
  - Deleting asks for confirmation.
  - Applications still in "Applied" after 10+ days get a "Follow up" badge.
- **Dashboard**: Computed client-side from the user's own applications, with no sample data:
  - Headline figures: logged, in play, interviewing, offers, and the share that heard back.
  - A pipeline bar broken down by status.
  - A "Needs a follow-up" list that links straight to each application's edit form.
  - Applications in conversation.
  - Weekly pace for the last 8 weeks.
  - A recent-activity timeline.
  - A first-run guide for new accounts and a retryable error state, so a failed request never looks like "0 applications".
- **Resume management**: Save resumes by pasting text or by uploading a text-based PDF of up to 5 MB. The PDF is parsed server-side into plain text and never written to disk. Resumes can be edited or deleted.
- **AI resume matcher**: Compares a saved resume with a job description and returns a match score (0–100), missing keywords and improvement suggestions. The score is an AI estimate of content overlap, not a prediction of ATS screening or hiring outcomes.
  - **Automatic fallback**: Google Gemini is the primary provider and Groq is the backup. One click is one request: the backend retries temporary Gemini failures a bounded number of times, then switches to Groq automatically when Gemini is overloaded, rate limited, out of quota, misconfigured or returns unusable output.
  - **Bounded time**: Each provider call has its own timeout, and the whole request is capped at about 50 seconds, with time reserved for the backup.
  - **What the browser sees**: The result shows whether the backup was used. Failures come back as a stable `errorCode` with a plain message, never raw provider errors. The page keeps your inputs after a failure and offers Retry only when retrying can help.
- **Prompt-injection hardening**: The AI's instructions go through a separate system channel (Gemini `systemInstruction`, Groq system message), completely apart from the untrusted resume and job-description text, which is wrapped in delimiters. The Gemini defence was checked with three controlled adversarial tests: a blunt "ignore your instructions" override, a disguised claim of prior approval, and a domain-mismatch case. Each was compared against the same input without the injection, to confirm the defence actually held rather than just coincidentally scoring high.
- **Output validation**: Whichever provider answers, the reply must parse as JSON with an integer score from 0 to 100 and arrays of strings. Only those three fields are returned to the browser.
- **Rate limiting** (`express-rate-limit`):
  - AI matching: 10 requests per 15 minutes per user.
  - Failed logins: 10 per 15 minutes per IP.
  - Signups: 10 per hour per IP.
  - Failed password changes: 5 per 15 minutes per user.
- **Input validation and error handling**: Zod allow-list schemas on every request body, MongoDB operator sanitising, and one central error handler. Every error is returned as `{ message, errors? }` JSON, with no stack traces or database text.
- **Centralized session handling**: One Axios instance attaches the token to every request and logs the user out (clears the token, redirects to login) on a 401 from any route except login and signup.
- **Profile management**: Change your display name or password. Changing a password requires the current password, verified server-side with `bcrypt.compare`.
- **Accessible, responsive UI**: A sidebar on desktop and a drawer on mobile. Status is always shown as text, never by colour alone. Keyboard focus is visible, dialogs trap focus, and animation respects the system's reduced-motion setting.

## Tech Stack

**Frontend:** React 18 (Vite 5), Tailwind CSS 3, React Router 6, Axios, react-hot-toast

**Backend:** Node.js, Express 4, MongoDB (Mongoose 8), Zod, JWT, bcrypt

**AI:** Google Gemini (`@google/genai`, primary) and Groq (`groq-sdk`, backup)

**File handling:** Multer (memory storage), pdf-parse

**Testing & CI:** Jest, Supertest and mongodb-memory-server (backend); Node's built-in test runner (frontend helpers); GitHub Actions

**Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas (database)

## How It Works

1. A user signs up or logs in. The backend issues a JWT, which the frontend stores and attaches to every request through an Axios interceptor.
2. Every private route runs through a `protect` middleware that verifies the JWT and loads the user. Every database query is then scoped to that user's own data.
3. Request bodies are validated against Zod allow-lists before they reach a controller, and errors are formatted by one central handler.
4. The user logs applications on the Applications page. The Dashboard computes all its figures client-side from those applications.
5. The user saves one or more resumes, by pasting text or uploading a PDF that is extracted to text and never written to disk.
6. To run a match, the user picks a saved resume and pastes a job description. The backend sends the AI rules on the system channel and the resume and job text, isolated, as content. It tries Gemini first and falls back to Groq if needed, then validates the reply before returning it.

## Prerequisites

- **Node.js 24** (used by CI and for local development) and npm.
- **A MongoDB database**: a MongoDB Atlas cluster or a local MongoDB server. The test suite does not need one.
- **A Gemini API key** from Google AI Studio for the matcher. A Groq API key is optional and enables the backup.

## Installation

```bash
# Clone the repo
git clone https://github.com/<your-username>/hiretrack.git
cd hiretrack

# Backend
cd backend
npm ci
cp .env.example .env   # then fill in the values (see below)

# Frontend
cd ../frontend
npm ci
cp .env.example .env   # set VITE_API_URL
```

### Environment variables

Never commit real values. Both `.env` files are git-ignored.

**`backend/.env`**

| Variable | Required | Example / default | Purpose |
|---|---|---|---|
| `MONGO_URI` | yes | `your_mongodb_atlas_connection_string` | MongoDB connection string |
| `JWT_SECRET` | yes | `replace_with_a_long_random_string` | Signs session tokens (use 16+ random characters) |
| `PORT` | yes | `5000` | API port |
| `CLIENT_URL` | recommended | `http://localhost:5173` | Allowed CORS origin (the frontend URL) |
| `GEMINI_API_KEY` | recommended | `your_gemini_api_key` | Primary AI provider. The matcher needs at least one of `GEMINI_API_KEY` or `GROQ_API_KEY` |
| `GROQ_API_KEY` | optional | `your_groq_api_key_here` | Backup AI provider; leave empty to disable the fallback |
| `GEMINI_MODEL` | optional | `gemini-3.8-flash` | Overrides the Gemini model |
| `GROQ_MODEL` | optional | `openai/gpt-oss-20b` | Overrides the Groq model |
| `TRUST_PROXY` | deployment | unset | Number of reverse proxies in front of the API. It must be measured on the real host; see the comments in `.env.example`. Never `true`. |
| `AUTH_LOGIN_MAX` / `AUTH_SIGNUP_MAX` / `AUTH_PASSWORD_MAX` | optional | `10` / `10` / `5` | Rate-limit overrides |

The server refuses to start if a required variable is missing or malformed, and warns about missing recommended ones. Messages name the variable but never print its value.

**`frontend/.env`**

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the backend API |

## Usage

```bash
# Run the backend (from /backend), with auto-restart via nodemon
npm run dev

# Run the frontend (from /frontend), on http://localhost:5173
npm run dev
```

Production: `npm start` in `backend/`, and `npm run build` in `frontend/`, which outputs to `frontend/dist/`.

Live deployment:
- Frontend: deployed on Vercel
- Backend: deployed on Render (free tier). The first request after inactivity can take 30–50 seconds to wake up, which is why login and signup show a loading state explaining the delay.
- Database: MongoDB Atlas

### Checking the Gemini connection manually

`backend/scripts/gemini-diagnose.js` is a manual tool and is not part of the test suite. It sends up to four tiny requests with made-up text to Gemini, using the key from `backend/.env`. It reports where the key came from, the key's last four characters, and the status of each step.

```bash
cd backend
node scripts/gemini-diagnose.js
```

## Testing

```bash
# Backend: Jest + Supertest against an in-memory MongoDB (downloaded on first run)
cd backend
npm test

# Frontend: matcher error-handling helpers, using Node's built-in test runner
cd frontend
npm test
```

- **Backend tests** cover:
  - auth, including the security regressions
  - validation and rate limits
  - the error handler
  - applications and resume CRUD, including PDF upload
  - the AI matcher: retry, fallback, timeout, error-classification and log-safety cases
- **They need no credentials and make no network calls.** Each test file uses its own in-memory database, both AI SDKs are mocked, and `tests/setupEnv.js` sets dummy keys. Run them with `npm test`, not bare `npx jest`: the script adds the `--experimental-vm-modules` flag that pdf-parse needs.
- **There are no component or page tests yet.**

## CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`, on Node 24:

- **backend:** `npm ci` → `npm test`, with npm and the MongoDB test binary cached.
- **frontend:** `npm ci` → `npm test` → `npm run build`.

The workflow uses a read-only token, cancels superseded runs, and needs no secrets.

## API

All routes are under `/api`. Everything except signup, login and health requires `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | Create an account / sign in (returns a token) |
| PUT | `/auth/profile`, `/auth/password` | Change display name / password |
| GET, POST | `/applications` | List / create applications |
| PUT, DELETE | `/applications/:id` | Update (including status-only updates) / delete |
| GET, POST | `/resumes` | List / add a pasted resume |
| POST | `/resumes/upload` | Upload a PDF resume (`multipart/form-data`) |
| PUT, DELETE | `/resumes/:id` | Edit / delete a resume |
| POST | `/match` | Run an AI match: `{ resumeText, jobDescription }` → `{ score, missingKeywords, suggestions, provider }` |
| GET | `/health` | Health check |

## Project Structure

```
hiretrack/
├── .github/workflows/ci.yml        # backend tests, frontend tests + build
├── backend/
│   ├── app.js                      # builds the Express app (importable by tests)
│   ├── server.js                   # loads .env, validates config, connects MongoDB, listens
│   ├── config/env.js               # environment validation, TRUST_PROXY parsing
│   ├── controllers/                # applications, auth, match, resumes (PDF parsing)
│   ├── middleware/                 # protect (JWT), validate (Zod), errors, rate limiters, upload
│   ├── models/                     # User (with embedded resumes), Application
│   ├── routes/
│   ├── services/aiMatcher.js       # Gemini → Groq orchestration, retries, error classification
│   ├── validation/                 # Zod schemas
│   ├── scripts/gemini-diagnose.js  # manual Gemini connectivity check
│   └── tests/                      # api/, unit/, helpers/, in-memory MongoDB setup
└── frontend/
    ├── index.html
    ├── src/
    │   ├── api/                    # axiosClient (interceptors) + one module per resource
    │   ├── components/             # Button, Input, Dialog, ApplicationForm, StatusBadge, skeletons, ...
    │   ├── context/AuthContext.jsx
    │   ├── layouts/                # AppShell (sidebar + mobile drawer), PublicLayout
    │   ├── lib/                    # status map, date helpers, matcher error messages
    │   └── pages/
    │       ├── private/            # Dashboard, Applications, Resumes, Matcher, Profile
    │       └── public/             # Landing, Login, Signup, NotFound
    └── tests/                      # Node test-runner tests for the lib helpers
```

## Key Implementation Details

- **Ownership-scoped queries**: Every controller filters by the authenticated user's ID rather than relying only on route-level protection, so there's a second layer of enforcement even if a middleware were ever misconfigured.
- **Allow-list validation**: Zod `strictObject` schemas reject unknown fields, and controllers copy only allow-listed fields into the database. Mongoose `sanitizeFilter` blocks `$`-operator injection in queries.
- **Prompt-injection defense**: Instructions and untrusted content travel on separate channels, and the model is told never to treat anything inside the resume or job description as an instruction.
- **Provider-independent output validation**: Replies from either AI provider go through the same parser and validator (`isValidMatchResult`). Malformed output from the primary triggers one backup attempt, never an endless retry.
- **Safe diagnostics**: Matcher logs record only the provider, model, attempt, failure category, status and timing. They never contain keys, prompts, resume or job text, model output, or upstream error bodies.
- **Auth failures vs. outages**: Only a bad, expired or tampered token returns 401. A database failure while loading the user returns a generic 500, so a brief outage doesn't log everyone out.
- **In-memory PDF parsing**: Uploaded resumes are processed with `multer`'s memory storage and `pdf-parse`, so the raw file is never written to disk; only the extracted text is stored.
- **Centralized Axios client**: Auth-header attachment and 401 handling live in one interceptor-based client that all API modules import.

## What I Learned

- How React's render cycle and Rules of Hooks actually work in practice — why a hook can't be called conditionally or after an early return, and what breaks when it is.
- The difference between passing a function reference and calling a function immediately in JSX event handlers.
- Async/await pitfalls: a missing `await` on `bcrypt.compare` silently returns a Promise (which is always truthy), which was a real security bug caught during development — not a hypothetical one.
- Mongoose's array update operators (`$push`/`$pull`) versus plain field updates, and when each is needed.
- That "prompt injection defense" isn't something you finish — it's layered and has to be tested with actual adversarial inputs and controlled comparisons, not just assumed to work because the output looks reasonable.
- Why file uploads need `multipart/form-data` and `FormData` on the client, instead of a normal JSON body.
- How to reason about ownership/authorization at the database-query level, not just at the route level.

## Known Limitations

- **Rate-limit counters are kept in memory.** They reset when the server restarts and aren't shared between instances. That's fine for one Render instance; scaling out would need a shared store such as Redis.
- **The JWT is stored in `localStorage`.** This was a deliberate choice; see Future Improvements.
- **`npm audit` still lists some advisories.** Every one remaining needs a major upgrade: React Router 7, Vite 8, Tailwind 4, or a newer nodemon or Jest dependency chain. They're deferred rather than force-upgraded. All except the React Router ones are in build, dev or test tooling that isn't shipped to users.

## Future Improvements

- Move the JWT from `localStorage` to an httpOnly cookie to reduce XSS exposure (considered, deliberately deferred due to time).
- Add component and page tests for the frontend. Only the helper modules are tested today.
- Real-time notifications (e.g. via Socket.io) — considered as a possible addition, not implemented.
- A browser extension for one-click application capture from job posting pages.

## Author

**Gurpreet Singh**
