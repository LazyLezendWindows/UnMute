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
* `POST /api/v1/auth/register` — Register with email and password (strictly validates age $\ge$ 18 from DOB). Disabled in production unless `ALLOW_PASSWORD_SIGNUP=true`: it then answers `403 PASSWORD_SIGNUP_DISABLED` for every email, and new members sign up with Google
* `POST /api/v1/auth/login` — Login with email and password (always available to existing password accounts)
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

### Push notifications
* `GET    /api/v1/push/config` — Whether push is available, and the VAPID public key
* `PUT    /api/v1/push/subscription` — Register this device's browser push subscription (one per signed-in session; replaces the previous one)
* `DELETE /api/v1/push/subscription` — Stop notifications to this device

### Safety
* `POST   /api/v1/safety/block` — Block a user immediately
* `DELETE /api/v1/safety/blocks/:userId` — Unblock a user (the old `DELETE /safety/block` with a JSON body is deprecated)
* `GET    /api/v1/safety/blocked` — List blocked users
* `POST   /api/v1/safety/reports` — Report a user; a snapshot of the reported profile and your latest messages with them is kept as evidence, and repeat reports within 24 hours are folded into the open one

### Account
* `POST   /api/v1/users/me/photo/upload` — A signed, one-time permission to upload a profile photo directly to Cloudinary
* `PUT    /api/v1/users/me/photo` — Confirm an upload (`{ publicId, version, signature }` from Cloudinary's response); it becomes the profile photo
* `DELETE /api/v1/users/me/photo` — Remove the profile photo
* `GET    /api/v1/users/me/export` — Download everything Unmute stores about you (JSON)
* `POST   /api/v1/users/me/deactivate` — Hide your account and sign out everywhere; signing in again reactivates it
* `DELETE /api/v1/users/me` — Permanently delete your account (body `{ "confirm": "DELETE" }`, requires a sign-in within `RECENT_AUTH_MINUTES`); reports stay as moderation records without your account reference

### Moderation (staff only; everyone else gets 404)
* `GET    /api/v1/moderation/reports?status=pending|reviewed|resolved|rejected` — The report queue
* `GET    /api/v1/moderation/reports/:id` — A report with its evidence snapshot and the member's moderation history
* `POST   /api/v1/moderation/reports/:id/decision` — `{ status, note, suspendUser }`
* `POST   /api/v1/moderation/users/:id/suspend` / `unsuspend` — `{ note }`; every action is recorded in `moderation_actions`

Staff roles are granted only from the command line (there is no API for it):

```bash
cd backend
npm run grant-role -- moderator@example.com moderator   # or admin, or member to revoke
npm run grant-role:prod -- moderator@example.com moderator   # against the compiled build (e.g. a Render shell)
```

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

1. In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials), configure the OAuth consent screen (External; add your Google account as a test user while in testing), then **Create credentials → OAuth client ID → Web application**.
2. Under *Authorized JavaScript origins* add `http://localhost:5173` (plus your production origin later). No redirect URIs are needed.
3. Put the client ID (`…apps.googleusercontent.com`) in `backend/.env` as `GOOGLE_CLIENT_ID` and restart the backend. The frontend reads it from `GET /api/v1/auth/config`, so `VITE_GOOGLE_CLIENT_ID` is optional (it only overrides that at build time).

The browser only ever passes Google's signed ID token to the backend, which verifies its signature and audience before creating an Unmute session.

**Sign-up is Google-only in production.** Unmute sends no email, so it cannot verify the address of an email-and-password sign-up; Google sign-in comes with a verified one. New accounts are therefore created with Google (plus the 18+ date-of-birth step), while existing password accounts keep signing in with their password (and can link Google by signing in with it). Development keeps the email form for convenience; set `ALLOW_PASSWORD_SIGNUP` to override either way.

**Troubleshooting:** "Google sign-in is not available right now" means `GOOGLE_CLIENT_ID` is not set (or the backend was not restarted). *"The given origin is not allowed for the given client ID"* in the browser console means the page's origin is missing from *Authorized JavaScript origins* (changes can take a few minutes to apply). *"The given client ID is not found"* means the ID is mistyped. A 401 after choosing an account means the backend's `GOOGLE_CLIENT_ID` differs from the one the button used.

### Profile Photos (Cloudinary)

Members upload a profile photo in **Profile → Upload photo**. It is free on Cloudinary's free plan (no card): about 25 GB of storage and delivery combined per month.

1. Create a free account at [cloudinary.com](https://cloudinary.com/users/register_free).
2. In the Cloudinary console, open **Settings → API Keys** (or the dashboard) and copy the **API environment variable**: `cloudinary://<api key>:<api secret>@<cloud name>`.
3. Set it as `CLOUDINARY_URL` in `backend/.env` or Render's environment and restart. Without it, uploads are off and members keep their Google photo.

How it works: the browser shrinks the photo and re-encodes it as JPEG (dropping GPS and camera metadata), asks the backend for a signed upload permission, and uploads straight to Cloudinary, so photos never pass through the server. The signature fixes where the photo goes (a new ID in the member's own folder), the allowed formats and an incoming transformation that scales it to at most 1600px and re-encodes it before Cloudinary stores it. The backend then checks Cloudinary's response signature and builds the photo URL itself (a 512px face-centred square), so members can only ever use their own uploads. Replaced or removed photos and those of deleted accounts are deleted from Cloudinary. The CSP allows images and uploads for your Cloudinary account only.

Photos are not moderated automatically; members can report inappropriate photos, and moderators can suspend the account.

### Push Notifications (Web Push)

Members can turn on notifications for new messages and matches in **Settings → Notifications**. They arrive while the app is closed or in the background (not while it is on screen, where the chat updates live). It is free: the browser vendors' push services (Google FCM for Chrome/Edge/Android, Mozilla, Apple, Microsoft) deliver them, and no third-party account is needed.

1. Generate a key pair once: `npx web-push generate-vapid-keys` (from `backend/`).
2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (secret) and `VAPID_SUBJECT` (e.g. `mailto:you@example.com`) in `backend/.env` or the platform's environment, and restart. With any of them empty, push is off and the Settings switch says it is unavailable.
3. Keep the keys: new keys invalidate every existing subscription (members would have to turn notifications on again).

Details: push needs HTTPS (or `localhost`) and the production build (the service worker is not built in development). On iPhone/iPad it only works for the app added to the Home Screen (iOS 16.4+); Settings explains this. Notifications are generic ("You have a new message") and never show names or message text on the lock screen. Each subscription belongs to a session, so signing out stops that device's notifications, and a shared browser never receives the previous member's. The native Capacitor apps do not use Web Push (they would need FCM/APNs).

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

**Data sources and licences.** Check each source's current terms before a production import, and keep attribution in the app's About/credits:
* India Post PIN code directory on data.gov.in is published under the Government Open Data License – India (GODL-India), which permits reuse with attribution.
* LGD (Ministry of Panchayati Raj) directory downloads are public government data; confirm the licence shown on the portal (data.gov.in mirrors fall under GODL-India).
* AISHE (Ministry of Education) lists are publicly downloadable, but the portal does not state an open licence explicitly; confirm reuse terms before importing them for a commercial service.

Imports are reproducible: run the same files again (or newer releases) and rows are matched on official codes (LGD code, PIN code, AISHE code), updated in place and never duplicated.

### Running Automated Tests & Lint

```bash
npm run lint        # ESLint, backend + frontend
npm test            # backend API/integration tests + frontend unit tests (Vitest)
npm run test:e2e    # Playwright end-to-end smoke tests (needs MariaDB running)
```

Backend tests run against a separate `unmute_test_db` database (created automatically) and refuse to run against any database not named `*_test_db`. The end-to-end suite starts its own backend (port 5100, database `unmute_e2e_db`, dropped and recreated each run) and Vite (port 5174), and drives the installed Google Chrome; set `PW_CHANNEL=` after `npx playwright install chromium` to use Playwright's browser instead.

### PWA & Native Apps (Capacitor)

The web build is an installable PWA: the app shell is cached for offline start, while `/api` and `/socket.io` always go to the network (personal data is never cached), and an offline banner appears when the connection drops.

Android and iOS apps wrap the same Vue build with Capacitor 8 (`frontend/capacitor.config.ts`, native projects in `frontend/android` and `frontend/ios`). Platform-specific code lives only in `frontend/src/platform/`; everything else is shared with the web and PWA.

**How native sign-in works.** Google Identity Services does not run inside native WebViews, so the apps use the device's own Google account picker (`@capgo/capacitor-social-login`: Credential Manager on Android, Google Sign-In on iOS). It returns a Google ID token that goes to the same `POST /auth/google` and is verified by the backend exactly like the web button's. iOS WebViews also block the cross-site session cookie, so requests from the app origins listed in `NATIVE_APP_ORIGINS` additionally receive the session token; the app keeps it in the Keychain / Android Keystore (`capacitor-secure-storage-plugin`) and sends it as `Authorization: Bearer` (and as the Socket.IO `auth.token`). Web pages never receive the token.

One-time setup (the Capacitor 8 CLI needs Node 22+; building needs Android Studio / Xcode):

1. **Backend** (HTTPS): `NATIVE_APP_ORIGINS=https://localhost,capacitor://localhost` (added to CORS automatically). Keep `SESSION_COOKIE_SAMESITE=lax`.
2. **Google Cloud Console → Credentials** (same project as the web client):
   * **Android** OAuth client: package `app.unmute.social` + the SHA-1 of your debug and release signing keys. No value goes into the app; the token is issued for the web client ID.
   * **iOS** OAuth client: bundle ID `app.unmute.social`. Set it as the backend's `GOOGLE_IOS_CLIENT_ID`, and add its *reversed* client ID (`com.googleusercontent.apps.…`) to `ios/App/App/Info.plist` under `CFBundleURLTypes → CFBundleURLSchemes` (Xcode → App target → Info → URL Types).
3. **Build and open**:

```bash
cd frontend
VITE_API_URL=https://your-api.example.com/api/v1 npm run cap:sync   # build + copy into both native projects
npm run cap:android    # Android Studio
npm run cap:ios        # Xcode (macOS)
```

"Near me" asks for approximate location only (`ACCESS_COARSE_LOCATION`; `NSLocationWhenInUseUsageDescription` on iOS).

### Production Build & Operations

```bash
npm install        # also installs backend/ and frontend/ (root postinstall); Node 20+ (22+ for the Capacitor CLI)
npm run build      # backend → backend/dist, frontend → frontend/dist
npm run start      # one process serves the API, Socket.IO and the built web app
```

Deployment files: `render.yaml` (Render), `Dockerfile` + `fly.toml` (Fly.io or any container host). Both run the same single process.

* **Required environment**: `NODE_ENV=production`, `DATABASE_URL` (MySQL/MariaDB over TLS), `GOOGLE_CLIENT_ID`, `TRUST_PROXY=1` behind the platform's proxy. Optional: `VAPID_*` for push notifications, `CLOUDINARY_URL` for photo uploads. `CORS_ORIGIN` defaults to Render's external URL; set it to your domain if you use a custom one. Everything else has safe defaults (see `backend/.env.example`). Secrets go in the platform's secret settings, never in the repo.
* **HTTPS, cookies, headers**: the platform terminates TLS; the session cookie is `__Host-` prefixed, `Secure`, `HttpOnly`, `SameSite=Lax`. Helmet sends HSTS and a Content Security Policy that allows only Google sign-in, Google Fonts and profile photos from `AVATAR_URL_HOSTS`.
* **Migrations** run automatically on start (with a lock, so concurrent starts are safe), or explicitly with `npm --prefix backend run migrate:prod`.
* **Health**: `GET /health` (used by Render's health check and the Docker `HEALTHCHECK`).
* **Graceful shutdown**: on `SIGTERM` (every deploy/restart) the server stops accepting connections, disconnects realtime clients (they reconnect to the new instance and catch up), finishes in-flight requests and closes the database pool, within 10 s.
* **Logging**: structured prefixes (`[Auth]`, `[Moderation]`, `[Error]`, …) to stdout, collected by the platform. Unexpected errors are logged server-side with details; clients only ever see a generic message in production.
* **Scaling**: rate limits are in memory, correct for one instance. Before running several instances, plug a shared store into `sharedStore()` in `backend/src/middleware/rateLimiter.ts` and a Socket.IO adapter (e.g. Redis) so realtime events reach every instance.

**Backups.** Confirm your database plan's automatic backup retention (managed providers differ, and free tiers may keep few or none), and take a logical backup before any deploy that adds a migration:

```bash
mysqldump --single-transaction --routines --set-gtid-purged=OFF -h <host> -P <port> -u <user> -p <database> > unmute-$(date +%F).sql
```

**Rollback.** Code: redeploy the previous build (Render → Events → *Rollback*; Fly: `fly deploy --image <previous image>`). This is safe when the deploy added no migration. Migrations are forward-only, and older builds are not guaranteed to work against a newer schema (for example, builds before migration 008 write `users.is_active`, which is now generated), so to roll back across a migration, restore the pre-deploy backup together with the previous build.

---

## 6. Demo Accounts (development only)

Demo profiles are no longer seeded automatically. To seed them into an empty development database, set `SEED_DEMO_USERS=true` in `backend/.env` (ignored when `NODE_ENV=production`).
