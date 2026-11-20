import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const configuredPath = process.env.DB_PATH || "./server/data/teamflow.db";
const dbPath = path.resolve(configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 100),
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT 'Team',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 160),
  description TEXT NOT NULL DEFAULT '',
  acceptance_criteria TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog','in_progress','review','done')),
  assignee TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 160),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
  assignee TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  run_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_project ON stories(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_story ON tasks(story_id);
CREATE INDEX IF NOT EXISTS idx_jobs_ready ON jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id, created_at DESC);
`);

// Safe migration: Add user_id column to projects table if missing
const projectColumns = db.prepare("PRAGMA table_info(projects)").all();
const hasUserId = projectColumns.some(col => col.name === "user_id");
if (!hasUserId) {
  db.exec("ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;");
}
db.exec("CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);");

// Ensure default legacy owner account exists for historical data integrity
function ensureLegacyOwnerAccount(email, fullName) {
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    // Never create an account with a publicly known default password.
    const hash = bcrypt.hashSync(crypto.randomBytes(32).toString("hex"), 10);
    const result = db.prepare("INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)")
      .run(email, hash, fullName);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  }
  return user;
}

// Migrate any legacy projects without user_id to their creator or baseline owner
const unownedProjects = db.prepare("SELECT * FROM projects WHERE user_id IS NULL").all();
if (unownedProjects.length > 0) {
  const migrateLegacy = db.transaction(() => {
    for (const proj of unownedProjects) {
      const ownerName = (proj.owner || "").trim();
      let email = "owner@teamflow.local";
      let fullName = ownerName || "Workspace Admin";

      if (ownerName.toLowerCase().includes("alex morgan")) {
        email = "alex.morgan@teamflow.local";
        fullName = "Alex Morgan";
      } else if (ownerName.toLowerCase().includes("saiteja")) {
        email = "saiteja@teamflow.local";
        fullName = "saiteja";
      }

      const ownerUser = ensureLegacyOwnerAccount(email, fullName);
      db.prepare("UPDATE projects SET user_id = ? WHERE id = ?").run(ownerUser.id, proj.id);
    }
  });
  migrateLegacy();
}

// Seed sample project if database is completely fresh
const count = db.prepare("SELECT COUNT(*) AS n FROM projects").get().n;
if (count === 0) {
  const seed = db.transaction(() => {
    const demoUser = ensureLegacyOwnerAccount("alex.morgan@teamflow.local", "Alex Morgan");
    const project = db.prepare("INSERT INTO projects (name, description, owner, user_id) VALUES (?, ?, ?, ?)").run(
      "Website Redesign", "Refresh the customer-facing website and improve the onboarding experience.", "Alex Morgan", demoUser.id
    );
    const storyInsert = db.prepare("INSERT INTO stories (project_id, title, description, acceptance_criteria, priority, status, assignee, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const s1 = storyInsert.run(project.lastInsertRowid, "Create a responsive landing page", "As a visitor, I want a clear landing page so I can understand the product quickly.", "Hero section is responsive; primary CTA is visible; page works on mobile.", "high", "in_progress", "Alex Morgan", 1);
    const s2 = storyInsert.run(project.lastInsertRowid, "Simplify account onboarding", "As a new customer, I want a short sign-up flow so I can get started quickly.", "Form validates input; success state is shown; errors are accessible.", "medium", "backlog", "Jamie Lee", 2);
    const taskInsert = db.prepare("INSERT INTO tasks (story_id, title, description, status, assignee, due_date) VALUES (?, ?, ?, ?, ?, ?)");
    taskInsert.run(s1.lastInsertRowid, "Build hero section", "Implement the headline, supporting copy and CTA.", "done", "Alex Morgan", null);
    taskInsert.run(s1.lastInsertRowid, "Add mobile navigation", "Create the responsive navigation menu.", "in_progress", "Sam Patel", null);
    taskInsert.run(s2.lastInsertRowid, "Map sign-up fields", "Agree on the minimum required fields.", "todo", "Jamie Lee", null);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)").run(project.lastInsertRowid, "Workspace created with sample project data");
  });
  seed();
}
