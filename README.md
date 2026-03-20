# Personal Finance Tracker

Full-stack personal finance tracker built with ASP.NET Core, React, Tailwind CSS, and PostgreSQL.

## Structure
- `backend/`: API, application, domain, infrastructure, auth, recurring worker
- `frontend/`: React app with routing, shared API client, Tailwind, feature pages
- `deploy/`: Azure and Nginx deployment assets

## Backend setup
1. Update PostgreSQL connection if needed. Default development database:
   - Database: `pftracker_dev`
   - Username: `postgres`
   - Password: `12345678`
2. Restore and run:
   - `dotnet restore`
   - `dotnet run --project backend/src/Api`

## Frontend setup
1. Install Node.js 22+.
2. Copy `.env.example` to `.env` and adjust `VITE_API_URL` if needed.
3. Install and run:
   - `npm install`
   - `npm run dev`

## Docker
- `docker compose up --build`

## Notes
- JWT auth and refresh token flow are implemented.
- Default categories are seeded per user after migration.
- Recurring items are processed by a hosted background worker.
- Forgot password currently generates a reset token record; plug in email delivery for production.
