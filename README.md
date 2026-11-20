# TeamFlow — Small-team project manager

TeamFlow is a full-stack project workspace for a small agile team (3–10 people). It models work explicitly as **Project → User Story → Task**, provides a responsive dashboard, exposes REST APIs, persists data in SQLite, and processes asynchronous jobs using a database-backed worker.

## Features

- Create, view, update and delete projects, user stories and tasks.
- Enforce the parent-child hierarchy with SQLite foreign keys and cascading deletes.
- Track project status, story priority/status, task status, assignees and task due dates.
- Search stories/tasks and filter stories by workflow status.
- Project metrics, task completion progress and recent activity.
- Background project-report generation with job status, bounded retries and exponential backoff.
- OpenAPI 3.0 specification served through Swagger UI.
- Sample workspace seeded on first run.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, JavaScript, CSS |
| Backend | Node.js, Express |
| Database | SQLite via better-sqlite3 |
| Async workflow | SQLite jobs table + polling worker |
| API docs | OpenAPI 3.0 + Swagger UI |

## Requirements

- Node.js 20 or later (Node 22 LTS recommended)
- npm 10+

## Run locally

```bash
# 1. Extract the project and open its root folder
cd teamflow-project-manager

# 2. Install dependencies
npm install

# 3. Optional: copy environment defaults
cp .env.example .env

# 4. Start frontend and backend together
npm run dev
```

Open:
- Frontend: http://localhost:5173
- API health: http://localhost:4000/api/health
- Interactive API documentation: http://localhost:4000/api/docs

The SQLite database is created automatically at `server/data/teamflow.db`. A sample project is seeded only when the projects table is empty.

### Production build

```bash
npm run build
npm start
```

The production build creates `dist/`. For deployment, serve the static frontend through a web server/CDN and run the API/worker as a managed Node process. Configure `CLIENT_ORIGIN`, `PORT`, `DB_PATH` and `WORKER_POLL_MS` for the environment.

## Data model

```text
Project (1) ──────── (*) UserStory (1) ──────── (*) Task
   id PK                  id PK                      id PK
   name                   project_id FK              story_id FK
   description             title                      title
   owner                   description                description
   status                  acceptance_criteria        status
   created_at              priority                   assignee
   updated_at              status                     due_date
                           assignee
                           sort_order
```

- `projects.id` is referenced by `stories.project_id`.
- `stories.id` is referenced by `tasks.story_id`.
- `ON DELETE CASCADE` removes descendants when a parent is deleted.
- Foreign-key enforcement is enabled for every SQLite connection.
- Status and priority values are constrained at the database layer and validated in the API.

## API overview

All endpoints are prefixed with `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/projects` | List projects with summary counts |
| POST | `/projects` | Create a project |
| GET | `/projects/:id` | Get project with nested stories and tasks |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project and descendants |
| POST | `/projects/:projectId/stories` | Add a story |
| PATCH | `/stories/:id` | Update a story |
| DELETE | `/stories/:id` | Delete story and its tasks |
| POST | `/stories/:storyId/tasks` | Add a task |
| PATCH | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |
| POST | `/projects/:id/reports` | Queue a project report |
| GET | `/jobs/:id` | Inspect job status/retries |
| GET | `/projects/:id/activity` | Get recent activity |

Full request/response documentation is available at `/api/docs` and in `docs/openapi.yaml`.

## Asynchronous workflow and reliability

The report endpoint responds with **202 Accepted** and a job ID instead of doing report work in the request thread.

1. The API inserts a `project_report` job into the durable SQLite `jobs` table.
2. A worker polls for due `pending` jobs.
3. It claims a job inside a short SQLite transaction by changing `pending` to `processing`. The conditional update prevents two worker processes from claiming the same row.
4. The worker computes project/story/task counts and writes the report result to the activity feed.
5. The frontend polls `GET /api/jobs/:id`, displays a visible job status panel (queued/processing/completed/failed), and refreshes activity when the job completes. If polling times out, the background job continues independently and the user can check its status again.

**Failure handling:** exceptions are captured and stored in `last_error`. A job is retried up to three times. Retry delay grows exponentially (10s, 20s, then terminal failure), capped at 60 seconds. A job ends in `failed` after its retry budget is exhausted and can be investigated through the job-status endpoint. Jobs survive API restarts because they are persisted in SQLite.

**Engineering trade-off:** this lightweight worker is suitable for a small single-node team app. For multi-instance/high-volume deployment, use a dedicated queue (for example BullMQ + Redis), add time-based job leases for recovery without a process restart, structured logging/metrics, and an idempotency key for external side effects. The current activity writer is local and deterministic; a real email/Slack adapter should be idempotent to avoid duplicate notifications on retries.

## Engineering decisions and limitations

- SQLite is sufficient for a small team and keeps local setup simple. WAL mode improves concurrent read behavior.
- SQL queries are parameterized; user-provided values are not interpolated into SQL.
- Foreign keys, indexes, validation, request-size limits and centralized error handling are included.
- The application includes signup/login/logout and SQLite-backed sessions, but full workspace/team role authorization still requires review before public deployment. Automatically created legacy/demo accounts have random, undisclosed passwords.
- The sample frontend uses lightweight polling for job status. WebSockets/SSE can replace it if live updates become necessary.
- Add automated unit/integration tests and CI before production deployment.

## Suggested manual test

1. Create a project.
2. Add two user stories with different priorities.
3. Add multiple tasks under each story.
4. Change story and task statuses; observe progress and activity.
5. Generate a report; verify the job moves from queued to completed and a report entry appears.
6. Delete a story and confirm its tasks are removed.
7. Restart the server and confirm the SQLite data remains.

## Project structure

```text
teamflow-project-manager/
├── docs/
│   └── openapi.yaml
├── server/
│   ├── auth.js
│   ├── db.js
│   ├── index.js
│   └── worker.js
├── src/
│   ├── api.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## License

For educational and portfolio use. Add a license file if redistributing under specific terms.

## AI usage

AI assistance was used to help draft and review implementation ideas, React forms, API validation, and documentation. The developer remains responsible for understanding, testing, and verifying all generated changes. This project should not be presented as independently security-audited or production-ready.

## What I would improve or build next with more time

- Extend existing authentication with workspace membership, team roles and a complete authorization review for 3–10 users.
- Add automated integration/UI tests, GitHub Actions CI and reproducible deployment.
- Add persistent structured reports and a dedicated reports history page.
- Add stronger job leases and idempotency for robust multi-instance background processing.
- Add audit trails, accessibility review and team notifications.

## Submission checklist

- [ ] Publish this project to a GitHub repository (required; cannot be completed from the ZIP).
- [ ] Run `npm install`, `npm run build`, and `npm run dev` locally.
- [ ] Verify project, story and task creation, editing, status changes and deletion using temporary data.
- [ ] Verify report generation and activity updates, including after restarting the API.
- [ ] Check Swagger API docs at `http://localhost:4000/api/docs`.
- [ ] Do not publish `.env`, SQLite data files, or real user information.

The demo URL and walkthrough video are optional in the assignment.

## Current authentication and security

- Users can register, log in and log out; passwords are hashed using bcryptjs.
- SQLite stores sessions, with HttpOnly session cookies (Secure in production).
- Authentication middleware, login throttling, CSRF checks, Helmet headers and validation are implemented.
- Automatically created legacy/demo accounts use random undisclosed passwords, not shared default credentials. Existing database users are not reset by this change.
- This internship prototype is not certified production-ready. Review CSRF header handling, authorization and deployment security before public exposure.
- Never commit `.env`, SQLite database files, `node_modules/` or `dist/`.

See `docs/SECURITY_AUDIT.md` for the current security status and archived findings.
## Project Demo Video

https://github.com/user-attachments/assets/eac5ea23-8067-44e7-9804-ba828d8c380b










