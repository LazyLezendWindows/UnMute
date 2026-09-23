# Unmute

> **Connect without the pressure.**

Unmute is a social connection platform focused on helping people discover and communicate with other people based on shared interests, intentions, and conversation — not simply appearance.

Built as a **responsive web application + PWA** with Vue 3 and Node.js/Express, powered by a relational **MariaDB** database, and structured to be packaged later as native mobile applications using Capacitor.

---

## 1. Product Philosophy

* **People first**: Authentic connections over vanity metrics.
* **Conversation first**: Common interests, thoughtful bios, and shared intentions are front-and-center.
* **Safety first**: Instant blocking and reporting with zero tolerance for harassment or solicitations.
* **Privacy first**: Approximate location only (city/area level). No exact coordinates, phone numbers, or private emails are ever exposed.
* **18+ Age Policy**: Strictly enforced server-side based on date of birth.
* **Zero pressure for physical meetings**: Users independently decide whether and when they interact outside the app.

---

## 2. Architecture

```text
Unmute
│
├── Frontend
│   └── Vue 3 + Vite + TypeScript + Pinia
│       ├── PWA (Service Worker + Manifest)
│       ├── Mobile-First Responsive UI
│       └── Real-time Socket.io Client
│
├── Backend
│   └── Node.js + Express.js + TypeScript
│       ├── Layered: Routes → Controllers → Services → Models
│       ├── Real-time Socket.io Server
│       ├── Zod Input Validation & 18+ Server-side Check
│       └── Server-side sessions (HttpOnly cookie), Google ID-token verification & Rate Limiting
│
├── Database
│   └── MariaDB (InnoDB, relational schemas, foreign keys)
│       └── Tables: users, profiles, interests, user_interests, likes,
│                   passes, matches, conversations, messages, blocks, reports, sessions
│
└── Mobile (Future Phase)
    └── Capacitor (Android & iOS packaging)
```

---

## 3. Core Database Tables (MariaDB)

| Table | Description |
|---|---|
| `users` | Account identity (email, active status); no credentials |
| `profiles` | Display name, date of birth, bio, approximate location, avatar, interaction preferences |
| `interests` | Predefined categorized interest topics |
| `user_interests` | Many-to-many relationship linking users to their interests |
| `likes` | Recorded likes (authority rests solely on the backend) |
| `passes` | Recorded passes (excluded from future discovery) |
| `matches` | Mutual matches created when User A likes User B AND User B likes User A |
| `conversations` | 1-on-1 chat channels linked to matches |
| `messages` | Chat messages with timestamps and status (`sent`, `delivered`, `read`) |
| `blocks` | Immediate mutual suppression across discovery, matches, and messaging |
| `reports` | Categorized moderation reports (harassment, spam, fake profile, etc.) |
| `auth_accounts` | Sign-in methods per user: Google (`sub`) or password (bcrypt hash) |
| `sessions` | Server-side sessions (SHA-256 of the cookie token, expiry, revocation) |

---

## 4. API Design (`/api/v1`)

### Authentication & Profiles
* `POST /api/v1/auth/register` — Register user (strictly validates age $\ge$ 18 from DOB)
* `POST /api/v1/auth/login` — Login with email and password
* `POST /api/v1/auth/google` — Sign in with a Google ID token (verified server-side; new users confirm date of birth)
* `POST /api/v1/auth/logout` — Revoke the current session and clear the cookie
* `GET  /api/v1/auth/session` — Restore the session from the cookie (`authenticated: true|false`)
* `GET  /api/v1/auth/me` — Get authenticated user details
* `GET  /api/v1/users/me` — Get user profile & interests
* `PATCH /api/v1/users/me` — Update bio, location, avatar, interaction preferences & interests
* `GET  /api/v1/users/interests` — Fetch available interests

### Discovery & Interactions
* `GET  /api/v1/discover` — Fetch discovery feed (filters out self, liked, passed, and blocked users; sorts by common interests)
* `POST /api/v1/interactions/like` — Like a user (triggers mutual match and creates conversation if reciprocal)
* `POST /api/v1/interactions/pass` — Pass on a user

### Matches & Real-Time Chat
* `GET  /api/v1/matches` — Get active mutual matches
* `GET  /api/v1/conversations` — Get user conversations with latest message & unread badge
* `GET  /api/v1/conversations/:id/messages` — Get messages for conversation (auto-marks as read)
* `POST /api/v1/conversations/:id/messages` — Send message in conversation (broadcasts via Socket.io)

### Safety
* `POST   /api/v1/safety/block` — Block a user immediately
* `DELETE /api/v1/safety/block` — Unblock a user
* `GET    /api/v1/safety/blocked` — List blocked users
* `POST   /api/v1/safety/reports` — Report a user with category and details

---

## 5. Getting Started

### Prerequisites
* Node.js $\ge$ 18
* MariaDB $\ge$ 10.6

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Starting MariaDB & Backend

A helper script is provided to ensure MariaDB is running with `unmute_db` initialized:

```bash
cd backend
npm run dev
```

The backend server starts at `http://localhost:5000`.

### Starting Frontend

```bash
cd frontend
npm run dev
```

The frontend application opens at `http://localhost:5173`.

### Google Sign-In

1. In Google Cloud Console create an OAuth 2.0 **Web application** client and add `http://localhost:5173` to *Authorized JavaScript origins*.
2. Set the client ID in `backend/.env` as `GOOGLE_CLIENT_ID` and in `frontend/.env` as `VITE_GOOGLE_CLIENT_ID` (see the `.env.example` files).

The browser only ever passes Google's signed ID token to the backend, which verifies its signature and audience before creating an Unmute session.

### Database Migrations

Schema changes live in `backend/migrations/NNN_name.sql` and are applied in order (tracked in `schema_migrations`) on server start, or explicitly with `npm run migrate` (`npm run migrate:prod` against the compiled build). Never edit an applied migration; add a new one. MariaDB DDL is not transactional, so write migrations that are safe to re-run.

### Running Automated Tests

```bash
npm run test
```

Tests run against a separate `unmute_test_db` database (created automatically) and refuse to run against any database not named `*_test_db`.

### Production Build

```bash
npm run build
```

---

## 6. Demo Accounts (development only)

Demo profiles are no longer seeded automatically. To seed them into an empty development database, set `SEED_DEMO_USERS=true` in `backend/.env` (ignored when `NODE_ENV=production`).
