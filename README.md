# Smart Queue Management System

Academic + real-world project suitable for BCA final year, internships, and technical interviews.

## Tech Stack
- Frontend: React (Vite), React Router DOM, Axios, responsive CSS
- Backend: Node.js, Express.js, MongoDB (Mongoose), JWT (Admin only)
- Realtime: Polling every 5 seconds
- Deployment: Frontend (Vercel/Netlify), Backend (Render), DB (MongoDB Atlas)

## Features
- User (no login): select service, get token, see status (current serving, waiting count, estimated wait time). Auto-refresh via polling.
- Admin (login): dashboard with overview, move to next token, reset queue, analytics, waiting list, and timing stats. JWT-protected.
- Optional time controls: per-token assigned time and per-service default time to improve wait estimates.

## Project Structure
smart-queue-system/
- backend/
  - config/, models/, controllers/, routes/, middleware/
  - server.js
  - .env.example
- frontend/
  - src/pages, src/components, src/services
  - App.jsx, main.jsx, index.css
  - vite.config.js, index.html
- README.md

## Environment Variables
Create `backend/.env` using `backend/.env.example`:
```
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
PORT=5000
```

For frontend deployment, set `VITE_API_URL` to your backend base URL (e.g., `https://your-render.onrender.com/api`).

## Running Locally
Backend (in `smart-queue-system/backend`):
```bash
npm install
npm run dev
```
Frontend (in `smart-queue-system/frontend`):
```bash
npm install
npm run dev
```
Open `http://localhost:5173`. The frontend uses `http://localhost:5000/api` when `VITE_API_URL` is not set.

## API Endpoints
User APIs:
- POST `/api/queue/token` — generate token `{ serviceType }`
- GET `/api/queue/status?tokenNumber=123` — currentServingToken, waitingCount, estimatedWaitTime, userToken, userTokenEstimatedWaitTime

Admin APIs:
- POST `/api/admin/login`
- POST `/api/admin/next`
- POST `/api/admin/reset`
- GET  `/api/admin/analytics`
- GET  `/api/admin/waiting` (for dashboard list)
- GET  `/api/admin/timings` (timing stats)
- GET  `/api/admin/all-tokens` (admin selection list)
- POST `/api/admin/assign-time` (per-token assigned minutes)
- GET  `/api/admin/service-times` (per-service defaults)
- POST `/api/admin/service-times` (set/clear defaults)

## Design Notes (Interview-ready)
- Auto-increment tokens use a `Counter` collection with `findOneAndUpdate($inc)` to avoid race conditions.
- Only one `serving` token at a time: admin `next` marks current `serving` as `served`, then promotes earliest `waiting`.
- Estimated wait time: per-token assigned time overrides service defaults; otherwise average of historical served durations (fallback to 5 minutes).
- Admin seeding: optional seed on startup from `.env` for demo simplicity.
- Clean MVC: models/controllers/routes/middleware with async/await and centralized error handling.

## Deployment Tips
- Backend on Render: set environment variables from `.env`; use `node server.js` as start command.
- Frontend on Vercel/Netlify: set `VITE_API_URL` to your Render URL + `/api`.
- MongoDB Atlas: whitelist Render IPs or use VPC peering where applicable.
