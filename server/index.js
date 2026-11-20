import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { startWorker, stopWorker } from "./worker.js";
import {
  authMiddleware,
  requireAuth,
  csrfProtection,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
  hashPassword,
  comparePassword,
  createSession,
  destroySession,
  setAuthCookies,
  clearAuthCookies,
  generateToken,
  parseCookies
} from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4000);

// Disable Express identification banner
app.disable("x-powered-by");

// Security headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

// Dedicated body-parser error handler
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && ("body" in err || err.type === "entity.parse.failed")) {
    return res.status(400).json({ error: "Malformed JSON payload." });
  }
  if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
    return res.status(413).json({ error: "Payload too large. Maximum size is 1MB." });
  }
  next(err);
});

// Central route parameter ID validator: enforces positive safe integers (1, 2, 3...)
const validateIdParam = (_req, res, next, val) => {
  if (!/^[1-9]\d*$/.test(val) || !Number.isSafeInteger(Number(val))) {
    return res.status(400).json({ error: "Invalid ID parameter. Must be a positive integer." });
  }
  next();
};

app.param("id", validateIdParam);
app.param("projectId", validateIdParam);
app.param("storyId", validateIdParam);

// Session & Authentication resolution
app.use(authMiddleware);

// Workspace API Gatekeeper: Protects all workspace endpoints against unauthenticated access
app.use((req, res, next) => {
  const p = (req.originalUrl || req.path || "").split("?")[0];
  if (!p.startsWith("/api")) {
    return next();
  }
  if (
    p === "/api/health" ||
    p.startsWith("/api/docs") ||
    p === "/api/auth/login" ||
    p === "/api/auth/signup" ||
    p === "/api/auth/logout" ||
    p === "/api/auth/me"
  ) {
    return next();
  }

  // ALL other workspace endpoints require an authenticated session
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  next();
});

// CSRF Protection for state-changing requests
app.use(csrfProtection);

const openapi = YAML.parse(fs.readFileSync(path.join(__dirname, "../docs/openapi.yaml"), "utf8"));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "teamflow-api" }));

const statuses = {
  project: ["active", "completed", "archived"],
  story: ["backlog", "in_progress", "review", "done"],
  task: ["todo", "in_progress", "done"]
};
const priorities = ["low", "medium", "high", "critical"];
const optionalText = (value, max = 2000) => typeof value === "string" && value.length <= max;
const validDate = value => value === null || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
const fail = (res, status, message) => res.status(status).json({ error: message });
const requiredText = (value, min = 2, max = 160) =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max;

const isPlainObject = val => typeof val === "object" && val !== null && !Array.isArray(val);
const findUnknownField = (body, allowed) => {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(body)) {
    if (!allowedSet.has(key)) return key;
  }
  return null;
};

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// POST /api/auth/signup
app.post("/api/auth/signup", async (req, res) => {
  if (!isPlainObject(req.body)) return fail(res, 400, "Request body must be a valid JSON object.");

  const { email, password, fullName } = req.body;

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return fail(res, 400, "Please provide a valid work email address.");
  }

  if (typeof fullName !== "string" || fullName.trim().length < 2 || fullName.trim().length > 80) {
    return fail(res, 400, "Full name must be between 2 and 80 characters.");
  }

  if (typeof password !== "string" || password.length < 8) {
    return fail(res, 400, "Password must be at least 8 characters.");
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasUpperCase || !hasNumberOrSymbol) {
    return fail(res, 400, "Password must include an uppercase letter and a number or symbol.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check for duplicate account
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return fail(res, 409, "An account with this email address already exists.");
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = db.prepare("INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)")
      .run(normalizedEmail, passwordHash, fullName.trim());

    const userId = Number(result.lastInsertRowid);
    const user = {
      id: userId,
      email: normalizedEmail,
      full_name: fullName.trim()
    };

    const { sessionId } = createSession(userId);
    const csrfToken = generateToken(24);
    setAuthCookies(res, sessionId, csrfToken);

    return res.status(201).json({ user, csrfToken });
  } catch (err) {
    console.error("Signup error:", err);
    return fail(res, 500, "Failed to create account. Please try again.");
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const rateCheck = checkLoginRateLimit(ip);
  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", String(rateCheck.retryAfterSeconds));
    return res.status(429).json({
      error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
      retryAfter: rateCheck.retryAfterSeconds
    });
  }

  if (!isPlainObject(req.body)) return fail(res, 400, "Request body must be a valid JSON object.");
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return fail(res, 400, "Email and password are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);

  if (!user) {
    recordFailedLogin(ip);
    return fail(res, 401, "Invalid email or password.");
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    recordFailedLogin(ip);
    return fail(res, 401, "Invalid email or password.");
  }

  clearLoginRateLimit(ip);

  const { sessionId } = createSession(user.id);
  const csrfToken = generateToken(24);
  setAuthCookies(res, sessionId, csrfToken);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      created_at: user.created_at
    },
    csrfToken
  });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  if (req.sessionId) {
    destroySession(req.sessionId);
  }
  clearAuthCookies(res);
  return res.status(204).end();
});

// GET /api/auth/me
app.get("/api/auth/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const cookies = parseCookies(req);
  let csrfToken = cookies["tf_csrf"];
  if (!csrfToken) {
    csrfToken = generateToken(24);
    setAuthCookies(res, req.sessionId, csrfToken);
  }

  return res.json({
    user: req.user,
    csrfToken
  });
});

// ============================================================================
// WORKSPACE AUTHORIZATION & DATA ACCESS HELPERS
// ============================================================================

function enqueue(type, payload) {
  return db.prepare("INSERT INTO jobs (type, payload) VALUES (?, ?)").run(type, JSON.stringify(payload)).lastInsertRowid;
}
function activity(projectId, message) {
  enqueue("activity_notification", { projectId, message });
}

// Scoped database retrieval: Only returns items belonging to the requesting user
function getProject(id, userId) {
  return db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(id, userId);
}
function getStory(id, userId) {
  return db.prepare(`
    SELECT s.*
    FROM stories s
    JOIN projects p ON p.id = s.project_id
    WHERE s.id = ? AND p.user_id = ?
  `).get(id, userId);
}
function getTask(id, userId) {
  return db.prepare(`
    SELECT t.*, s.project_id
    FROM tasks t
    JOIN stories s ON s.id = t.story_id
    JOIN projects p ON p.id = s.project_id
    WHERE t.id = ? AND p.user_id = ?
  `).get(id, userId);
}

// ============================================================================
// PROTECTED WORKSPACE APIS
// ============================================================================

// Projects
app.get("/api/projects", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM stories s WHERE s.project_id = p.id) AS story_count,
      (SELECT COUNT(*) FROM tasks t JOIN stories s ON s.id=t.story_id WHERE s.project_id=p.id) AS task_count,
      (SELECT COUNT(*) FROM tasks t JOIN stories s ON s.id=t.story_id WHERE s.project_id=p.id AND t.status='done') AS completed_tasks
    FROM projects p
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC, p.id DESC
  `).all(req.user.id);
  res.json(rows);
});

app.post("/api/projects", requireAuth, (req, res) => {
  if (!isPlainObject(req.body)) return fail(res, 400, "Request body must be a valid JSON object.");
  const unknown = findUnknownField(req.body, ["name", "description", "owner"]);
  if (unknown) return fail(res, 400, `Unknown or protected field: ${unknown}`);
  const { name, description = "", owner = req.user.full_name } = req.body;
  if (typeof name !== "string" || !requiredText(name, 2, 100)) return fail(res, 400, "Project name must be 2–100 characters.");
  if (typeof description !== "string" || !optionalText(description) || typeof owner !== "string" || !optionalText(owner, 80))
    return fail(res, 400, "Invalid project description or owner.");

  const createProjectTx = db.transaction(() => {
    const result = db.prepare("INSERT INTO projects (name, description, owner, user_id) VALUES (?, ?, ?, ?)")
      .run(name.trim(), String(description).slice(0, 2000), String(owner).slice(0, 80), req.user.id);
    const projectId = Number(result.lastInsertRowid);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(projectId, `Project created: ${name.trim()}`);
    return projectId;
  });

  const projectId = createProjectTx();
  res.status(201).json(getProject(projectId, req.user.id));
});

app.get("/api/projects/:id", requireAuth, (req, res) => {
  const project = getProject(Number(req.params.id), req.user.id);
  if (!project) return fail(res, 404, "Project not found.");
  const stories = db.prepare("SELECT * FROM stories WHERE project_id = ? ORDER BY sort_order, id").all(project.id);
  const tasks = db.prepare("SELECT t.* FROM tasks t JOIN stories s ON s.id=t.story_id WHERE s.project_id = ? ORDER BY t.id").all(project.id);
  const byStory = new Map(stories.map(s => [s.id, { ...s, tasks: [] }]));
  for (const task of tasks) byStory.get(task.story_id)?.tasks.push(task);
  res.json({ ...project, stories: [...byStory.values()] });
});

app.patch("/api/projects/:id", requireAuth, (req, res) => {
  const project = getProject(Number(req.params.id), req.user.id);
  if (!project) return fail(res, 404, "Project not found.");

  if (!isPlainObject(req.body) || Object.keys(req.body).length === 0) {
    return fail(res, 400, "Update body cannot be empty.");
  }

  const unknown = findUnknownField(req.body, ["name", "description", "owner", "status"]);
  if (unknown) {
    return fail(res, 400, `Unknown or protected field: ${unknown}`);
  }

  const { name, description, owner, status } = req.body;

  if (name !== undefined && (typeof name !== "string" || !requiredText(name, 2, 100))) {
    return fail(res, 400, "Project name must be a string between 2 and 100 characters.");
  }
  if (description !== undefined && (typeof description !== "string" || !optionalText(description, 2000))) {
    return fail(res, 400, "Project description must be a string up to 2000 characters.");
  }
  if (owner !== undefined && (typeof owner !== "string" || !optionalText(owner, 80))) {
    return fail(res, 400, "Project owner must be a string up to 80 characters.");
  }
  if (status !== undefined && (typeof status !== "string" || !statuses.project.includes(status))) {
    return fail(res, 400, "Invalid project status. Allowed: " + statuses.project.join(", "));
  }

  const next = {
    name: name !== undefined ? name.trim() : project.name,
    description: description !== undefined ? description : project.description,
    owner: owner !== undefined ? owner : project.owner,
    status: status !== undefined ? status : project.status
  };

  const updateProjectTx = db.transaction(() => {
    db.prepare("UPDATE projects SET name=?, description=?, owner=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?")
      .run(next.name, next.description, next.owner, next.status, project.id, req.user.id);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(project.id, `Project updated: ${next.name}`);
  });
  updateProjectTx();
  res.json(getProject(project.id, req.user.id));
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
  const project = getProject(Number(req.params.id), req.user.id);
  if (!project) return fail(res, 404, "Project not found.");
  db.transaction(() => {
    db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(project.id, req.user.id);
  })();
  res.status(204).end();
});

// Stories
app.post("/api/projects/:projectId/stories", requireAuth, (req, res) => {
  const project = getProject(Number(req.params.projectId), req.user.id);
  if (!project) return fail(res, 404, "Project not found.");
  if (!isPlainObject(req.body)) return fail(res, 400, "Request body must be a valid JSON object.");
  const unknown = findUnknownField(req.body, [
    "title", "description", "acceptanceCriteria", "acceptance_criteria", "priority", "status", "assignee"
  ]);
  if (unknown) return fail(res, 400, `Unknown or protected field: ${unknown}`);
  const { title, description = "", priority = "medium", status = "backlog", assignee = "" } = req.body;
  const acceptanceCriteria = req.body.acceptanceCriteria ?? req.body.acceptance_criteria ?? "";
  if (typeof title !== "string" || !requiredText(title)) return fail(res, 400, "Story title must be 2–160 characters.");
  if (typeof priority !== "string" || !priorities.includes(priority) || typeof status !== "string" || !statuses.story.includes(status))
    return fail(res, 400, "Invalid priority or story status.");
  if (typeof description !== "string" || !optionalText(description, 2000) || typeof acceptanceCriteria !== "string" || !optionalText(acceptanceCriteria, 2000) || typeof assignee !== "string" || !optionalText(assignee, 80))
    return fail(res, 400, "Invalid story text fields.");

  const createStoryTx = db.transaction(() => {
    const max = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM stories WHERE project_id=?").get(project.id).n;
    const result = db.prepare(`INSERT INTO stories (project_id,title,description,acceptance_criteria,priority,status,assignee,sort_order)
      VALUES (?,?,?,?,?,?,?,?)`).run(project.id, title.trim(), description, acceptanceCriteria, priority, status, assignee, max + 1);
    const storyId = Number(result.lastInsertRowid);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(project.id, `Story created: ${title.trim()}`);
    return storyId;
  });

  const storyId = createStoryTx();
  res.status(201).json(db.prepare("SELECT * FROM stories WHERE id=?").get(storyId));
});

app.patch("/api/stories/:id", requireAuth, (req, res) => {
  const story = getStory(Number(req.params.id), req.user.id);
  if (!story) return fail(res, 404, "Story not found.");

  if (!isPlainObject(req.body) || Object.keys(req.body).length === 0) {
    return fail(res, 400, "Update body cannot be empty.");
  }

  const unknown = findUnknownField(req.body, [
    "title", "description", "acceptanceCriteria", "acceptance_criteria",
    "priority", "status", "assignee", "sort_order"
  ]);
  if (unknown) {
    return fail(res, 400, `Unknown or protected field: ${unknown}`);
  }

  const { title, description, priority, status, assignee, sort_order } = req.body;
  const criteria = req.body.acceptanceCriteria !== undefined
    ? req.body.acceptanceCriteria
    : req.body.acceptance_criteria;

  if (title !== undefined && (typeof title !== "string" || !requiredText(title, 2, 160))) {
    return fail(res, 400, "Story title must be a string between 2 and 160 characters.");
  }
  if (description !== undefined && (typeof description !== "string" || !optionalText(description, 2000))) {
    return fail(res, 400, "Story description must be a string up to 2000 characters.");
  }
  if (criteria !== undefined && (typeof criteria !== "string" || !optionalText(criteria, 2000))) {
    return fail(res, 400, "Story acceptance criteria must be a string up to 2000 characters.");
  }
  if (priority !== undefined && (typeof priority !== "string" || !priorities.includes(priority))) {
    return fail(res, 400, "Invalid story priority. Allowed: " + priorities.join(", "));
  }
  if (status !== undefined && (typeof status !== "string" || !statuses.story.includes(status))) {
    return fail(res, 400, "Invalid story status. Allowed: " + statuses.story.join(", "));
  }
  if (assignee !== undefined && (typeof assignee !== "string" || !optionalText(assignee, 80))) {
    return fail(res, 400, "Story assignee must be a string up to 80 characters.");
  }
  if (sort_order !== undefined && (!Number.isInteger(sort_order) || sort_order < 0)) {
    return fail(res, 400, "Story sort order must be a non-negative integer.");
  }

  const next = {
    title: title !== undefined ? title.trim() : story.title,
    description: description !== undefined ? description : story.description,
    acceptance_criteria: criteria !== undefined ? criteria : story.acceptance_criteria,
    priority: priority !== undefined ? priority : story.priority,
    status: status !== undefined ? status : story.status,
    assignee: assignee !== undefined ? assignee : story.assignee,
    sort_order: sort_order !== undefined ? sort_order : story.sort_order
  };

  const statusChanged = req.body.status && req.body.status !== story.status;
  const activityMessage = statusChanged
    ? `Story "${next.title}" moved to ${next.status.replace("_", " ")}.`
    : `Story updated: ${next.title}`;

  const updateStoryTx = db.transaction(() => {
    db.prepare(`UPDATE stories SET title=?,description=?,acceptance_criteria=?,priority=?,status=?,assignee=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(next.title, next.description, next.acceptance_criteria, next.priority, next.status, next.assignee, next.sort_order, story.id);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(story.project_id, activityMessage);
  });
  updateStoryTx();
  res.json(db.prepare("SELECT * FROM stories WHERE id=?").get(story.id));
});

app.delete("/api/stories/:id", requireAuth, (req, res) => {
  const story = getStory(Number(req.params.id), req.user.id);
  if (!story) return fail(res, 404, "Story not found.");
  const deleteStoryTx = db.transaction(() => {
    db.prepare("DELETE FROM stories WHERE id=?").run(story.id);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(story.project_id, `Story deleted: ${story.title}`);
  });
  deleteStoryTx();
  res.status(204).end();
});

// Tasks
app.post("/api/stories/:storyId/tasks", requireAuth, (req, res) => {
  const story = getStory(Number(req.params.storyId), req.user.id);
  if (!story) return fail(res, 404, "Story not found.");
  if (!isPlainObject(req.body)) return fail(res, 400, "Request body must be a valid JSON object.");
  const unknown = findUnknownField(req.body, [
    "title", "description", "status", "assignee", "dueDate", "due_date"
  ]);
  if (unknown) return fail(res, 400, `Unknown or protected field: ${unknown}`);
  const { title, description = "", status = "todo", assignee = "" } = req.body;
  const dueDate = req.body.dueDate !== undefined ? req.body.dueDate : (req.body.due_date !== undefined ? req.body.due_date : null);
  if (typeof title !== "string" || !requiredText(title) || typeof status !== "string" || !statuses.task.includes(status))
    return fail(res, 400, "Invalid task title or status.");
  if (typeof description !== "string" || !optionalText(description) || typeof assignee !== "string" || !optionalText(assignee, 80) || !validDate(dueDate))
    return fail(res, 400, "Invalid task description, assignee or due date.");

  const createTaskTx = db.transaction(() => {
    const result = db.prepare("INSERT INTO tasks (story_id,title,description,status,assignee,due_date) VALUES (?,?,?,?,?,?)")
      .run(story.id, title.trim(), description, status, assignee, dueDate);
    const taskId = Number(result.lastInsertRowid);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(story.project_id, `Task created: ${title.trim()}`);
    return taskId;
  });
  const taskId = createTaskTx();
  res.status(201).json(db.prepare("SELECT * FROM tasks WHERE id=?").get(taskId));
});

app.patch("/api/tasks/:id", requireAuth, (req, res) => {
  const task = getTask(Number(req.params.id), req.user.id);
  if (!task) return fail(res, 404, "Task not found.");

  if (!isPlainObject(req.body) || Object.keys(req.body).length === 0) {
    return fail(res, 400, "Update body cannot be empty.");
  }

  const unknown = findUnknownField(req.body, [
    "title", "description", "status", "assignee", "dueDate", "due_date"
  ]);
  if (unknown) {
    return fail(res, 400, `Unknown or protected field: ${unknown}`);
  }

  const { title, description, status, assignee } = req.body;
  const dueDate = req.body.dueDate !== undefined ? req.body.dueDate : req.body.due_date;

  if (title !== undefined && (typeof title !== "string" || !requiredText(title, 2, 160))) {
    return fail(res, 400, "Task title must be a string between 2 and 160 characters.");
  }
  if (description !== undefined && (typeof description !== "string" || !optionalText(description, 2000))) {
    return fail(res, 400, "Task description must be a string up to 2000 characters.");
  }
  if (status !== undefined && (typeof status !== "string" || !statuses.task.includes(status))) {
    return fail(res, 400, "Invalid task status. Allowed: " + statuses.task.join(", "));
  }
  if (assignee !== undefined && (typeof assignee !== "string" || !optionalText(assignee, 80))) {
    return fail(res, 400, "Task assignee must be a string up to 80 characters.");
  }
  if (dueDate !== undefined && !validDate(dueDate)) {
    return fail(res, 400, "Invalid task due date. Must be YYYY-MM-DD or null.");
  }

  const next = {
    title: title !== undefined ? title.trim() : task.title,
    description: description !== undefined ? description : task.description,
    status: status !== undefined ? status : task.status,
    assignee: assignee !== undefined ? assignee : task.assignee,
    due_date: dueDate !== undefined ? dueDate : task.due_date
  };

  const statusChanged = req.body.status && req.body.status !== task.status;
  const activityMessage = statusChanged
    ? `Task "${next.title}" moved to ${next.status.replace("_", " ")}.`
    : `Task updated: ${next.title}`;

  const updateTaskTx = db.transaction(() => {
    db.prepare("UPDATE tasks SET title=?,description=?,status=?,assignee=?,due_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(next.title, next.description, next.status, next.assignee, next.due_date, task.id);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(task.project_id, activityMessage);
  });
  updateTaskTx();
  res.json(db.prepare("SELECT * FROM tasks WHERE id=?").get(task.id));
});

app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  const task = getTask(Number(req.params.id), req.user.id);
  if (!task) return fail(res, 404, "Task not found.");
  const deleteTaskTx = db.transaction(() => {
    db.prepare("DELETE FROM tasks WHERE id=?").run(task.id);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(task.project_id, `Task deleted: ${task.title}`);
  });
  deleteTaskTx();
  res.status(204).end();
});

// Background workflows
const reportRateLimitWindowMs = Number(process.env.REPORT_RATE_LIMIT_WINDOW_MS || 60000);
const reportRateLimitMax = Number(process.env.REPORT_RATE_LIMIT_MAX || 5);
const reportRateLimits = new Map();

function reportRateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowStart = now - reportRateLimitWindowMs;

  let timestamps = reportRateLimits.get(ip) || [];
  timestamps = timestamps.filter(ts => ts > windowStart);

  if (timestamps.length >= reportRateLimitMax) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + reportRateLimitWindowMs - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.setHeader("X-RateLimit-Limit", String(reportRateLimitMax));
    res.setHeader("X-RateLimit-Remaining", "0");
    return res.status(429).json({
      error: "Too many report requests. Please try again later.",
      retryAfter
    });
  }

  timestamps.push(now);
  reportRateLimits.set(ip, timestamps);
  res.setHeader("X-RateLimit-Limit", String(reportRateLimitMax));
  res.setHeader("X-RateLimit-Remaining", String(reportRateLimitMax - timestamps.length));
  next();
}

const enqueueReportTx = db.transaction((projectId) => {
  const existing = db.prepare(`
    SELECT id, type, status, attempts, max_attempts, created_at
    FROM jobs
    WHERE type = 'project_report'
      AND status IN ('pending', 'processing')
      AND json_extract(payload, '$.projectId') = ?
    ORDER BY id DESC LIMIT 1
  `).get(projectId);

  if (existing) {
    return { created: false, job: existing };
  }

  const result = db.prepare("INSERT INTO jobs (type, payload) VALUES (?, ?)")
    .run("project_report", JSON.stringify({ projectId }));

  return {
    created: true,
    job: { id: Number(result.lastInsertRowid), status: "pending" }
  };
});

app.post("/api/projects/:id/reports", requireAuth, (req, res) => {
  const project = getProject(Number(req.params.id), req.user.id);
  if (!project) return fail(res, 404, "Project not found.");

  reportRateLimiter(req, res, () => {
    const { created, job } = enqueueReportTx(project.id);
    if (!created) {
      return res.status(200).json({
        jobId: job.id,
        status: job.status,
        message: "A report is already being generated for this project.",
        active: true
      });
    }

    res.status(202).json({
      jobId: job.id,
      status: "queued",
      message: "Your project report is being generated."
    });
  });
});

app.get("/api/jobs/:id", requireAuth, (req, res) => {
  const job = db.prepare("SELECT id,type,payload,status,attempts,max_attempts,last_error,created_at,completed_at FROM jobs WHERE id=?")
    .get(Number(req.params.id));
  if (!job) return fail(res, 404, "Job not found.");

  // Verify project ownership from payload
  try {
    const payload = JSON.parse(job.payload || "{}");
    if (payload.projectId) {
      const project = getProject(Number(payload.projectId), req.user.id);
      if (!project) return fail(res, 404, "Job not found.");
    }
  } catch {
    // If payload unparseable, reject
    return fail(res, 404, "Job not found.");
  }

  delete job.payload;
  res.json(job);
});

app.get("/api/projects/:id/activity", requireAuth, (req, res) => {
  const project = getProject(Number(req.params.id), req.user.id);
  if (!project) return fail(res, 404, "Project not found.");
  res.json(db.prepare("SELECT * FROM activity_log WHERE project_id=? ORDER BY id DESC LIMIT 30").all(project.id));
});

// 404 handler for unmatched /api routes
app.all(/^\/api(\/.*)?$/, (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// Serve frontend static assets from Vite build
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback: send index.html with no-store cache headers for all client-side navigation routes
app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Application not built. Run 'npm run build' first.");
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const server = app.listen(port, () => {
  console.log(`TeamFlow API listening on http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/api/docs`);
  startWorker();
});

let isShuttingDown = false;
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("[server] HTTP server closed.");
    try {
      await stopWorker(5000);
      console.log("[worker] Worker stopped.");
      db.close();
      console.log("[db] Database closed.");
      process.exit(0);
    } catch (err) {
      console.error("[server] Error during shutdown:", err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("[server] Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
if (process.send) {
  process.on("message", msg => {
    if (msg === "shutdown" || msg === "SIGTERM" || msg === "SIGINT") {
      gracefulShutdown(typeof msg === "string" ? msg : "IPC");
    }
  });
}

export { app, server, gracefulShutdown };
