# ChatPulse v2 (Lab Edition)

## What Changed
- Database switched to Neon PostgreSQL via `DATABASE_URL` (SSL-ready).
- File upload switched from local disk to Cloudinary.
- Moderation upgraded: LLM-based (Groq) + regex fallback for troll/sensitive-content detection.
- Socket message flow hardened with better validation and secure confirm-send checks.
- Chat access checks improved in controllers (membership and partner validation).
- Frontend redesigned with a minimalist, professional light theme.
- Real-time message/typing updates now scoped to active room/DM (fixed cross-chat leak bug).
- Docker Compose simplified: removed local Postgres service.

## New Required Env (Backend)
- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Optional Env
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `FRONTEND_URL`
