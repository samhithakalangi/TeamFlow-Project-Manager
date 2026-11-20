# Architecture notes

## Request flow

### 1. Synchronous Entity Mutations (Projects, Stories, Tasks)

Entity mutations write to their primary tables and `activity_log` inside the **same SQLite transaction**, guaranteeing immediate consistency without polling delays or race conditions:

```text
React UI ─── HTTP Request ───► Express REST API ─── Transaction ───► SQLite
                                                       ├── Entity Mutation (projects/stories/tasks)
                                                       └── Synchronous activity_log entry
React UI ◄── HTTP Response ─── Returns updated record ─┴─────────────────────────────┘
```

### 2. Asynchronous Job Processing (Background Worker)

Heavyweight operations (e.g. `project_report`) are decoupled into asynchronous background jobs managed by `server/worker.js`:

```text
React UI ─── POST /reports ──► Express API (Rate-limited, Deduplication check)
                                  │
                                  └── Atomic insert ──► jobs table
                                                          │
                                                    Background worker (server/worker.js)
                                                          │ (claims job transactionally)
                                                          ▼
                                                    Process report metrics
                                                          │
                                                          ├── UPDATE jobs (status='completed')
                                                          └── INSERT INTO activity_log
                                                                  │
React UI ◄── Polling ───────── GET /api/jobs/:id ─────────────────┘
```

## Boundaries

- `src/` contains UI and HTTP client only.
- `server/index.js` owns HTTP routing, input validation, security headers (Helmet), error handling, and orchestration.
- `server/db.js` owns connection setup, schema migration, and seed data.
- `server/worker.js` owns asynchronous job claiming, processing, retries, and graceful shutdown.
- `docs/openapi.yaml` is the API contract used by Swagger UI at `/api/docs`.

## Job lifecycle

`pending → processing → completed`

On a processing error: `processing → pending` with an exponential backoff delay `run_at = datetime('now', '+<seconds> seconds')` (where `<seconds> = min(60, 2^attempts * 5)`), until `attempts` reaches `max_attempts`; then `processing → failed`.

### Concurrency and Reliability Guarantees
- **Atomic job claiming**: Claims pending jobs inside a transaction with `UPDATE jobs SET status = 'processing', attempts = attempts + 1 WHERE id = ? AND status = 'pending'`.
- **Deduplication**: `POST /api/projects/:id/reports` checks atomically for active (`pending` or `processing`) jobs for the same project. If found, it returns the existing job (HTTP 200) instead of queuing a duplicate.
- **Queue protection**: Report generation is rate-limited to 5 requests per minute per IP.
- **Graceful shutdown**: On `SIGTERM` or `SIGINT`, the Express server stops accepting new connections, `stopWorker()` stops polling and awaits in-flight job completion (up to 5 seconds), and the SQLite database connection is closed cleanly.
- **Crash recovery**: On restart, any jobs left in `processing` state from an unexpected process kill are recovered back to `pending` (or marked `failed` if `attempts >= max_attempts`).
