# TripCraft Backend API

AI-powered travel planning platform — REST API built with Node.js, Express, TypeScript, and MongoDB Atlas.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — any long random string
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (OAuth 2.0 Web Client)
   - `AI_MODE=mock` — runs with built-in mock AI (no API key needed). Set to `live` + add `GEMINI_API_KEY` later to use real Gemini.

3. Run in development:
   ```bash
   npm run dev
   ```

4. Build & run in production:
   ```bash
   npm run build
   npm start
   ```

API runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

## Google OAuth Setup Notes

The frontend sends a Google **ID token** (from Google Identity Services / One Tap or the Google Sign-In button) to `POST /api/auth/google`. The backend verifies it server-side using `google-auth-library` against `GOOGLE_CLIENT_ID`. No separate OAuth redirect flow is needed on the backend — this is the recommended modern flow for SPA frontends.

## Route Summary

- **Auth:** `/api/auth/register`, `/login`, `/demo-login`, `/google`, `/logout`, `/me`, `/profile`
- **Trips:** `/api/trips` (CRUD, search/filter/sort/paginate), `/api/trips/user/mine`
- **Favorites:** `/api/favorites`
- **Bookings:** `/api/bookings`
- **Reviews:** `/api/reviews/:tripId`
- **AI:** `/api/ai/trip-planner`, `/api/ai/recommendations`, `/api/ai/chat`, `/api/ai/chat/history`
- **Dashboard:** `/api/dashboard/stats`
- **Admin:** `/api/admin/stats`, `/users`, `/trips`
