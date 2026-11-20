# Assignment notes

## Engineering choices and tradeoffs

- React + Vite frontend and Express REST API keep the code approachable for a small team.
- SQLite provides local persistence and transactions with minimal setup; a larger multi-server deployment would likely use PostgreSQL.
- Durable report jobs are persisted in SQLite and processed by a polling worker. This is simple but not a substitute for a distributed queue at scale.
- Session-based authentication is implemented; fine-grained team roles and multi-workspace authorization remain future work.

## Background processing and failures

`POST /api/projects/:id/reports` queues work, the worker processes it asynchronously, and `GET /api/jobs/:id` returns status. Failures are recorded and retries use a delay/backoff; see `README.md` and `server/worker.js`.

## AI usage

AI assistance supported drafting and reviewing implementation, API validation, forms and documentation. All changes require developer verification.

## What to improve with more time

Add automated tests and CI, more complete authorization and team roles, production-grade rate limiting and CSRF review, report history and monitoring, and robust distributed job processing.

## Security

See `SECURITY_AUDIT.md` for the current-state update and historical audit findings.
