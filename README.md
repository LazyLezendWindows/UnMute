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
| `profiles` | Display name, date of birth, bio, avatar, interaction preferences (plus a legacy free-text location) |
| `places` | Location hierarchy shaped like LGD: state → district → sub-district → village, and district → city/town |
| `pincodes` | 6-digit PIN codes with their district, state and approximate centre |
| `user_locations` | A member's area: place, optional PIN code, coarsened (~1 km grid) coordinates, and label precision |
| `institutions` | Universities, colleges and standalone institutions (AISHE-shaped) |
| `user_education` | A member's institution, course and years |
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
* `PATCH /api/v1/users/me` — Update bio, avatar, interaction preferences & interests
* `GET  /api/v1/users/interests` — Fetch available interests

### Location & Education
* `PUT    /api/v1/users/me/location` — Set your area: `{mode: "place", placeId}`, `{mode: "pincode", pincode}` or `{mode: "device", latitude, longitude}`, each with optional `precision` (`locality` | `city` | `state`). Rate-limited per account.
* `PATCH  /api/v1/users/me/location` — Change how much of your area others see (`{precision}`)
* `DELETE /api/v1/users/me/location` — Remove your area
* `PUT    /api/v1/users/me/education` — Set your institution (`{institutionId, course?, startYear?, endYear?}`)
* `DELETE /api/v1/users/me/education` — Remove it
* `GET    /api/v1/locations/states` — All states and union territories
* `GET    /api/v1/locations/:id/children` — Districts of a state, settlements of a district, … (`?q=` narrows)
* `GET    /api/v1/locations/search?q=&kinds=&stateId=` — Name-prefix search across the hierarchy
* `GET    /api/v1/locations/pincodes/:pincode` — The area a PIN code covers
* `GET    /api/v1/education/institutions?q=&stateId=&districtId=&kind=` — Institution search
* `GET    /api/v1/education/institutions/:id` — One institution

**Location privacy.** Device positions are snapped to a ~1 km grid before they are stored, and no endpoint ever returns coordinates, not even your own. Others see only an area label at the precision you choose, plus a bucketed distance ("within 10 km", "about 45 km away"; never below 2 km). The radius filter accepts only 5, 10, 25, 50, 100 or 200 km, and changing your area is rate-limited, so repeated searches cannot be used to pinpoint anyone. PIN codes are never shown to other members.

### Discovery & Interactions
* `GET  /api/v1/discover` — Fetch discovery feed (filters out self, liked, passed, and blocked users; sorts by common interests, then distance). Optional filters, all applied in SQL and combined with AND: `radiusKm` (needs your own area), `placeId` (any level: state, district, sub-district, city, town or village), `pincode`, `institutionId` or `sameInstitution=true`, `minAge` / `maxAge`.
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

### Location & Education Data

A small, real sample (all 36 states and union territories with LGD codes, major cities, a few towns and villages, some PIN codes and 48 well-known institutions) is loaded on every start, so the app works out of the box. For production, import the complete official datasets; imports upsert over the sample and can be re-run with newer releases:

```bash
cd backend
# 1. LGD (https://lgdirectory.gov.in → Download Directory): states, districts, sub-districts,
#    villages and urban local bodies, as CSV. Import each file; order does not matter.
npm run import:data -- places path/to/villages.csv
# 2. India Post "All India Pincode Directory" (data.gov.in). Import after places.
npm run import:data -- pincodes path/to/pincode_directory.csv
# 3. AISHE (https://aishe.gov.in) university / college / standalone lists. Import after places.
npm run import:data -- institutions path/to/colleges.csv [--kind college]
```

Use `npm run import:data:prod -- …` against the compiled build. Header names are matched loosely (e.g. `State Name (In English)` or `statename`); each importer's accepted columns are documented at the top of `backend/src/importers/`. LGD itself has no coordinates, so an imported village borrows its sub-district's or district's where one is known (the sample districts have them); members whose area has no coordinates at all still appear in area, PIN code and college filters, but not in distance filters. The PIN code import averages post-office coordinates per PIN code, so setting your area by PIN code usually gives accurate distances, and "Near me" always does. Sample districts are named, not coded, so an LGD import adopts matching names; a district whose official name differs (e.g. `Mumbai` vs `Mumbai City`) remains alongside the imported one.

### Running Automated Tests & Lint

```bash
npm run lint        # ESLint, backend + frontend
npm test            # backend API/integration tests + frontend unit tests (Vitest)
npm run test:e2e    # Playwright end-to-end smoke tests (needs MariaDB running)
```

Backend tests run against a separate `unmute_test_db` database (created automatically) and refuse to run against any database not named `*_test_db`. The end-to-end suite starts its own backend (port 5100, database `unmute_e2e_db`, dropped and recreated each run) and Vite (port 5174), and drives the installed Google Chrome; set `PW_CHANNEL=` after `npx playwright install chromium` to use Playwright's browser instead.

### PWA & Native Apps (Capacitor)

The web build is an installable PWA: the app shell is cached for offline start, while `/api` and `/socket.io` always go to the network (personal data is never cached), and an offline banner appears when the connection drops.

Android and iOS apps wrap the same build with Capacitor (`frontend/capacitor.config.ts`):

```bash
cd frontend
VITE_API_URL=https://api.example.com/api/v1 npm run cap:sync   # build + copy into native projects
npx cap add android    # first time only (needs Android Studio); likewise `npx cap add ios` on macOS
npm run cap:android    # open in Android Studio
```

The native apps run on their own origin, so the backend must be served over HTTPS with `SESSION_COOKIE_SAMESITE=none` and `CORS_ORIGIN` including `https://localhost` (Android) and `capacitor://localhost` (iOS). Google Identity Services does not run inside native WebViews; native Google sign-in needs a Capacitor Google-auth plugin that returns an ID token to `POST /auth/google` (not yet added).

### Production Build

```bash
npm run build
```

---

## 6. Demo Accounts (development only)

Demo profiles are no longer seeded automatically. To seed them into an empty development database, set `SEED_DEMO_USERS=true` in `backend/.env` (ignored when `NODE_ENV=production`).
