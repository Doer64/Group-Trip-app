# GroupTrip — Collaborative Group Trip Planner

> A collaborative, democratic web platform for planning group trips with friends and family. Create a trip session, invite members with a shareable link, search and suggest attractions via Google Places, vote in real-time, and view an automatically ranked leaderboard.

---

## Features

- **Frictionless Passwordless Identity**: Users identify with their name and email (no complex passwords or email verification delays). Sessions are securely maintained via signed HTTP-only JWT cookies.
- **Fast Destination Autocomplete**: Client-side fuzzy search across 26,000+ cities and countries with multi-language alias support (e.g. Hebrew, Japanese, English), powered by an in-memory dataset and a background Web Worker (`destination.worker.ts`) to keep UI interaction smooth.
- **Instant Invite Flow**: Shareable invite links (`/invite/[token]`) allow group members to join a trip in one click or via quick WhatsApp sharing.
- **Google Places Integration**: Search real-world places and attractions with photos, coordinates, and direct Google Maps links. Calls and image assets are proxied through server-side endpoints to keep API keys private.
- **Realtime Collaborative Voting**: Upvote (👍) or downvote (👎) proposed attractions with optimistic UI feedback and live multi-user synchronization via Supabase Realtime (WebSockets).
- **Consensus Leaderboard**: Real-time aggregated results ranking top attractions with automated tie-breaking (Score → Likes → Earliest added).

---

## Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **Database & Realtime**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime WebSockets + Row Level Security)
- **External APIs**: Google Places API (New & Legacy text search, Photo proxy)
- **Fuzzy Search & Worker**: [`fuzzysort`](https://github.com/farzher/fuzzysort) + Web Worker
- **Session & Security**: [`jose`](https://github.com/panva/jose) (HMAC SHA-256 JWT in HTTP-only cookies)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Playwright](https://playwright.dev/)

---

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

1. **Node.js**: `v20.x` or later (LTS recommended).
2. **npm**: `v10.x` or later (comes bundled with Node.js).
3. **Supabase Account**: A free account on [supabase.com](https://supabase.com) to host your PostgreSQL database.
4. **Google Cloud Account**: An account on [Google Cloud Console](https://console.cloud.google.com/) with the **Places API** enabled and an API key created (required for live attraction search and photos).

---

## Local Setup Instructions

Follow these step-by-step instructions to get the application running locally on your machine.

### 1. Clone the Repository

Clone the project from GitHub and navigate into the project directory:

```bash
git clone https://github.com/Doer64/Group-Trip-app.git
cd group-trip-app
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

---

### 3. Database Setup (Supabase)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project (e.g., `group-trip-app`).
2. Once the project is provisioned, click on **SQL Editor** from the left navigation menu.
3. Click **New query**, paste the following complete schema, and click **Run**:

```sql
-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trips Table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination TEXT NOT NULL,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    invite_token TEXT UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Trip Members Table (Many-to-Many relationship)
CREATE TABLE trip_members (
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, user_id)
);

-- 4. Attractions Table
CREATE TABLE attractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    location JSONB, -- Example: {"lat": 32.0853, "lng": 34.7818, "address": "..."}
    place_id TEXT, -- Google Places place_id to identify physical location
    added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_trip_place UNIQUE (trip_id, place_id) -- Prevents duplicate places per trip
);

-- 5. Votes Table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE, -- Denormalized for Realtime trip filtering
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_attraction_user_vote UNIQUE (attraction_id, user_id)
);

-- -------------------------------------------------------------
-- Indexes for query performance
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attractions_trip_id ON attractions(trip_id);
CREATE INDEX IF NOT EXISTS idx_votes_attraction_id ON votes(attraction_id);
CREATE INDEX IF NOT EXISTS idx_votes_trip_id ON votes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);

-- -------------------------------------------------------------
-- Supabase Realtime Publication
-- Enables live updates for attractions and votes
-- -------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE attractions;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- -------------------------------------------------------------
-- Row Level Security (RLS)
-- Server route handlers use the service role key to bypass RLS.
-- Realtime client subscriptions use the public key and require SELECT permissions.
-- -------------------------------------------------------------
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes         ENABLE ROW LEVEL SECURITY;

-- attractions / votes: allow read-only access for Realtime listeners
CREATE POLICY "Allow read access" ON attractions FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON votes       FOR SELECT USING (true);
```

4. Verify table creation in **Table Editor** (you should see 5 tables: `users`, `trips`, `trip_members`, `attractions`, and `votes`).

---

### 4. Configure Environment Variables (`.env.local`)

Create a `.env.local` file in the root of the project:

```bash
cp .env.example .env.local    # or create .env.local manually
```

Populate `.env.local` with the following variables:

```env
# -------------------------------------------------------------
# Supabase Configuration
# Found in Supabase Dashboard -> Project Settings -> API Keys
# -------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-secret-service-role-key

# -------------------------------------------------------------
# Google Places API Configuration
# Google Cloud Console -> APIs & Services -> Credentials
# -------------------------------------------------------------
GOOGLE_PLACES_API_KEY=AIzaSy...your-google-places-key

# -------------------------------------------------------------
# Authentication / JWT Session Secret (Must be 32+ characters)
# -------------------------------------------------------------
SESSION_SECRET=your-random-32-byte-hex-string
```

#### Explanation of Environment Variables

| Variable                        | Scope                    | Purpose                                                                              | Where to find                                                    |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public (Client + Server) | Base URL for your Supabase project instance                                          | Supabase Project Settings → API                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Client-side publishable key used for Supabase Realtime subscriptions                 | Supabase Project Settings → API Keys (`anon` / `publishable`)    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Private (Server only)    | High-privilege secret key that bypasses RLS for trusted route handlers in `app/api/` | Supabase Project Settings → API Keys (`service_role` / `secret`) |
| `GOOGLE_PLACES_API_KEY`         | Private (Server only)    | Used exclusively on the server to query Places Text Search and proxy photo streams   | Google Cloud Console → APIs & Services → Credentials             |
| `SESSION_SECRET`                | Private (Server only)    | Secret key used by `jose` to sign and verify session JWT cookies                     | Generated by developer (see command below)                       |

> [!IMPORTANT]
> **Enforced Startup Security Gate**:
> `next.config.ts` enforces that `SESSION_SECRET` must exist and be at least **32 characters long**. If this variable is missing or too short, `npm run dev` and `npm run build` will immediately crash on startup to prevent running with an insecure secret.
>
> Generate a cryptographically secure random secret using Node.js:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
>
> Paste the generated string into your `.env.local` as `SESSION_SECRET`.

---

### 5. Start the Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser. You should see the GroupTrip homepage with the flight destination search.

---

## Verifying the Setup & Manual Testing

Follow this quick smoke test to verify all layers of the application are operating properly:

1. **Create a Trip**:
   - On the homepage [http://localhost:3000](http://localhost:3000), enter an email and your name.
   - In the destination field, type a destination (e.g. `Rome`, `Paris`, or `Tokyo`). Test the fuzzy autocomplete suggestions.
   - Click **Create Trip**. You will be redirected to the trip board (`/trip/<tripId>`).
2. **Invite a Participant (Multi-User Simulation)**:
   - Click **Invite Friends** on the trip board to copy the invite link.
   - Open a private/incognito browser window (or a different browser) and paste the invite link (`/invite/<token>`).
   - Enter a different email and name (e.g., `Alex`, `alex@example.com`) and click **Join Trip**.
3. **Search & Suggest Attractions**:
   - Use the search bar on the trip board to search for places (e.g., `Colosseum` or `Eiffel Tower`).
   - Click **Pitch Spot** to add an attraction to the shared board.
4. **Real-time Voting**:
   - In one browser window, click 👍 or 👎 on an attraction.
   - Watch the other browser window: the vote count and rating bar should update automatically in real-time via WebSocket without refreshing the page!
5. **View Results**:
   - Navigate to the **Results** tab (`/trip/<tripId>/results`) to see the podium rankings (Gold / Silver / Bronze) and the full consensus ranking sorted by net score.

---

## Automated Tests

The repository includes end-to-end tests written with [Playwright](https://playwright.dev/):

1. **Install Playwright Browsers** (first time only):
   ```bash
   npx playwright install --with-deps
   ```
2. **Run Playwright Tests**:
   ```bash
   npx playwright test
   ```
3. **View Test Report**:
   ```bash
   npx playwright show-report
   ```

---

## Project Structure Overview

```
group-trip-app/
├── app/                                  # Next.js App Router
│   ├── page.tsx                          # Homepage: Trip creation form & destination picker
│   ├── layout.tsx                        # Global root layout & AuthProvider
│   ├── loading.tsx                       # Global loading indicator
│   ├── login/page.tsx                    # User identification page
│   ├── invite/[token]/page.tsx           # Invite landing & trip join flow
│   ├── trip/[tripId]/
│   │   ├── page.tsx                      # Main trip board (attractions, voting, members)
│   │   └── results/page.tsx              # Final results leaderboard & stats
│   └── api/                              # Backend Route Handlers (Server-only)
│       ├── users/identify/route.ts       # POST: Find or create user, issue session cookie
│       ├── users/me/route.ts             # GET: Current user session, POST: Logout
│       ├── places/photo/route.ts         # GET: Secure photo proxy for Google Places photos
│       └── trips/
│           ├── route.ts                  # POST: Create trip & invite token
│           ├── by-invite/[token]/route.ts# GET: Fetch trip metadata by invite token
│           └── [tripId]/
│               ├── route.ts              # GET: Trip details, DELETE: Creator-only delete
│               ├── members/route.ts      # POST: Add member to trip
│               ├── places/route.ts       # GET: Google Places search proxy
│               ├── results/route.ts      # GET: Calculate and fetch ranked results
│               └── attractions/
│                   ├── route.ts          # GET: List attractions, POST: Add attraction
│                   └── [attractionId]/
│                       ├── route.ts      # DELETE: Delete attraction (organizer or proposer)
│                       └── votes/route.ts# POST: Cast, toggle, or switch vote
├── components/
│   ├── Navbar.tsx                        # Sticky header with authentication status
│   ├── PageTransition.tsx                # Page transition wrapper
│   ├── trip/                             # Feature-specific components (AttractionCard, VoteButtons, etc.)
│   └── ui/                               # Reusable UI primitives (Button, Modal, Toast, Skeleton, etc.)
├── contexts/
│   └── AuthContext.tsx                   # Client-side user auth state & synchronizer
├── hooks/
│   ├── useTrip.ts                        # Realtime subscription for trip updates
│   ├── useAttractions.ts                 # Realtime subscription for attractions & votes
│   ├── useDestinationSuggestions.ts      # Fuzzy destination suggestion hook
│   └── destination.worker.ts             # Background Web Worker running fuzzysort
├── lib/
│   ├── session.ts                        # Signed JWT session handling (jose)
│   ├── apiResponse.ts                    # Standardized API response formatters
│   ├── services/placesService.ts         # Google Places API client wrapper
│   ├── validations/schemas.ts            # Centralized Zod validation schemas
│   └── supabase/
│       ├── client.ts                     # Client Supabase instance (anon key for Realtime)
│       └── server.ts                     # Server Supabase instance (service role key)
├── public/data/destinations.json         # Static database of worldwide cities and countries
├── tests/                                # Playwright End-to-End test suites
├── next.config.ts                        # Next.js config with SESSION_SECRET startup gate
└── package.json
```

---

## Available npm Scripts

- `npm run dev`: Starts the Next.js development server on port 3000.
- `npm run build`: Compiles and builds the application for production (evaluates `next.config.ts` security gates).
- `npm run start`: Runs the compiled production server.
- `npm run lint`: Runs ESLint across the codebase.
- `npx playwright test`: Runs all end-to-end test scenarios.
