import { db } from "./db.js";

const pollMs = Number(process.env.WORKER_POLL_MS || 3000);
let busy = false;
let workerTimer = null;
let shuttingDown = false;

// A small SQLite-backed worker. Claiming a job is atomic so two worker
// instances cannot process the same pending row at the same time.
function claimJob() {
  if (shuttingDown) return null;
  return db.transaction(() => {
    const job = db.prepare(`
      SELECT * FROM jobs
      WHERE status = 'pending' AND run_at <= CURRENT_TIMESTAMP
      ORDER BY id ASC LIMIT 1
    `).get();
    if (!job) return null;
    const result = db.prepare(`
      UPDATE jobs SET status = 'processing', attempts = attempts + 1
      WHERE id = ? AND status = 'pending'
    `).run(job.id);
    return result.changes === 1 ? { ...job, attempts: job.attempts + 1 } : null;
  })();
}

async function processJob(job) {
  const payload = JSON.parse(job.payload);
  if (job.type === "activity_notification") {
    // Replace this adapter with email/Slack delivery when integrating a provider.
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(payload.projectId ?? null, payload.message);
    return;
  }
  if (job.type === "project_report") {
    const project = db.prepare("SELECT id, name FROM projects WHERE id = ?").get(payload.projectId);
    if (!project) throw new Error("Project no longer exists");
    const stories = db.prepare("SELECT COUNT(*) AS total, SUM(status = 'done') AS done FROM stories WHERE project_id = ?").get(project.id);
    const tasks = db.prepare("SELECT COUNT(*) AS total, SUM(t.status = 'done') AS done FROM tasks t JOIN stories s ON s.id = t.story_id WHERE s.project_id = ?").get(project.id);
    db.prepare("INSERT INTO activity_log (project_id, message) VALUES (?, ?)")
      .run(project.id, `Report ready — ${project.name}: ${stories.done || 0}/${stories.total} stories and ${tasks.done || 0}/${tasks.total} tasks completed.`);
    return;
  }
  throw new Error(`Unsupported job type: ${job.type}`);
}

async function tick() {
  if (busy || shuttingDown) return;
  busy = true;
  try {
    const job = claimJob();
    if (!job) return;
    try {
      await processJob(job);
      db.prepare("UPDATE jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ?").run(job.id);
    } catch (error) {
      const terminal = job.attempts >= job.max_attempts;
      const delaySeconds = Math.min(60, 2 ** job.attempts * 5);
      db.prepare(`
        UPDATE jobs SET status = ?, last_error = ?,
          run_at = datetime('now', ?)
        WHERE id = ?
      `).run(terminal ? "failed" : "pending", String(error.message).slice(0, 500), `+${delaySeconds} seconds`, job.id);
      console.error(`[worker] job ${job.id} ${terminal ? "failed permanently" : "scheduled for retry"}:`, error.message);
    }
  } catch (error) {
    console.error("[worker] tick failed:", error);
  } finally {
    busy = false;
  }
}

export function startWorker() {
  shuttingDown = false;
  // Recover jobs interrupted by a process crash; retries remain bounded.
  db.prepare(`UPDATE jobs SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
    run_at = CURRENT_TIMESTAMP, last_error = 'Interrupted during processing; recovered on restart'
    WHERE status = 'processing'`).run();
  console.log(`[worker] polling every ${pollMs}ms`);
  if (!workerTimer) {
    workerTimer = setInterval(tick, pollMs);
  }
  tick();
}

export async function stopWorker(timeoutMs = 5000) {
  shuttingDown = true;
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  const start = Date.now();
  while (busy && Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 100));
  }
  return !busy;
}

export function isWorkerBusy() {
  return busy;
}

export function isWorkerShuttingDown() {
  return shuttingDown;
}

// Support direct worker execution (e.g., node server/worker.js)
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("server/worker.js")) {
  startWorker();
  const handleExit = async signal => {
    console.log(`[worker] Received ${signal}. Stopping worker...`);
    await stopWorker();
    db.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => handleExit("SIGTERM"));
  process.on("SIGINT", () => handleExit("SIGINT"));
}
