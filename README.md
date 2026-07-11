# Southern Waves

Southern Waves is a MERN student-media platform for campus reporting, editorial publishing, photo essays, moderated discussions, and real-time community updates.

The application consists of a React/Vite client and an Express/MongoDB API with Socket.IO for live chat, comment updates, account-status changes, and notifications.

## Documentation

The complete technical, operational, API, architecture, data-model, security, testing, and roadmap documentation is in [DOCUMENTATION.md](DOCUMENTATION.md).

## Quick start

1. Install the server and client dependencies: `npm run install:all`.
2. Create `server/.env` and `client/.env` using the environment-variable reference in the documentation.
3. Start both applications with `npm run dev`.
4. Open `http://localhost:5173`; the API health check is at `http://localhost:5000/api/health`.

To load the supplied demonstration content, run `npm run seed` after configuring MongoDB.

> The repository is actively being developed. Review the production-readiness checklist in the documentation before deploying it to real users.
