import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import * as cookie from "cookie";
import { db } from "./db.js";

const SESSION_COOKIE_NAME = "tf_session";
const CSRF_COOKIE_NAME = "tf_csrf";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// In-memory login rate limiter
// Maximum 5 failed attempts per IP within 60 seconds
const loginRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip);
  if (!record) return { allowed: true };

  // Filter attempts within current window
  record.attempts = record.attempts.filter(t => t > now - RATE_LIMIT_WINDOW_MS);
  if (record.attempts.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = record.attempts[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}

export function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginRateLimitMap.get(ip) || { attempts: [] };
  record.attempts.push(now);
  loginRateLimitMap.set(ip, record);
}

export function clearLoginRateLimit(key) {
  loginRateLimitMap.delete(key);
}

export function resetAllRateLimits() {
  loginRateLimitMap.clear();
}

export async function hashPassword(plainText) {
  return bcrypt.hash(plainText, 10);
}

export async function comparePassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function createSession(userId) {
  const sessionId = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sessionId, userId, expiresAt);

  return { sessionId, expiresAt };
}

export function getSessionUser(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return null;

  const nowIso = new Date().toISOString();
  const row = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.created_at, s.id AS session_id, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, nowIso);

  if (!row) {
    // If expired session exists, clean it up
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    created_at: row.created_at
  };
}

export function destroySession(sessionId) {
  if (sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  try {
    return cookie.parse(header);
  } catch {
    return {};
  }
}

export function setAuthCookies(res, sessionId, csrfToken) {
  const isProduction = process.env.NODE_ENV === "production";

  // Session token: HttpOnly, SameSite=Lax, Secure in production
  const sessionCookie = cookie.serialize(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });

  // CSRF token: Non-HttpOnly (read by client), SameSite=Lax
  const csrfCookie = cookie.serialize(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });

  res.setHeader("Set-Cookie", [sessionCookie, csrfCookie]);
}

export function clearAuthCookies(res) {
  const isProduction = process.env.NODE_ENV === "production";

  const clearSession = cookie.serialize(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 0,
    expires: new Date(0),
    path: "/"
  });

  const clearCsrf = cookie.serialize(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 0,
    expires: new Date(0),
    path: "/"
  });

  res.setHeader("Set-Cookie", [clearSession, clearCsrf]);
}

/**
 * Authentication & session resolution middleware.
 * Attaches req.user if a valid session exists.
 */
export function authMiddleware(req, _res, next) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE_NAME];

  if (sessionId) {
    const user = getSessionUser(sessionId);
    if (user) {
      req.user = user;
      req.sessionId = sessionId;
    }
  }

  next();
}

/**
 * Enforces authenticated user. Rejects with 401 if unauthenticated.
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  next();
}

/**
 * CSRF Protection Middleware for state-changing requests (POST, PATCH, DELETE, PUT).
 * Verifies matching CSRF token or explicit XMLHttpRequest header.
 */
export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }

  // Public authentication endpoints (login, signup) establish the session and CSRF tokens
  if (req.path === "/api/auth/login" || req.path === "/api/auth/signup") {
    return next();
  }

  const cookies = parseCookies(req);
  const cookieCsrf = cookies[CSRF_COOKIE_NAME];
  const headerCsrf = req.headers["x-csrf-token"];
  const isXhr = req.headers["x-requested-with"] === "XMLHttpRequest";

  if ((cookieCsrf && headerCsrf && cookieCsrf === headerCsrf) || isXhr) {
    return next();
  }

  return res.status(403).json({ error: "CSRF verification failed. Request rejected." });
}
