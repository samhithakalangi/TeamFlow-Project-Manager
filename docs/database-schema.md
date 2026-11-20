# Database schema and relationships

SQLite schema source of truth: `server/db.js`.

- `users` (id PK, unique email, password_hash, full_name): registered and legacy accounts.
- `sessions` (id PK, user_id FK -> users.id): login sessions with expiry.
- `projects` (id PK, user_id FK -> users.id): top-level projects; ownership linked to a user.
- `stories` (id PK, project_id FK -> projects.id ON DELETE CASCADE): user stories under projects.
- `tasks` (id PK, story_id FK -> stories.id ON DELETE CASCADE): tasks under user stories.
- `jobs` (id PK): persistent background report jobs with status, attempts and error information.
- `activity_log` (id PK, project_id FK -> projects.id ON DELETE SET NULL): event/activity history.

Hierarchy: **Project -> User Story -> Task**. Deleting a project cascades to its stories and their tasks. SQLite foreign keys are enabled and indexes support common lookups.

Migration: existing projects without a user_id are assigned to legacy owners. These legacy accounts receive random, undisclosed passwords and cannot use a common default login.
