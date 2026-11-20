# Current Security Status (November 2026)

**Important:** The original audit below describes an older version of the application. Several findings are now historical and should not be read as current facts.

## Implemented since the original audit

- Registration, login and logout with SQLite-backed sessions (`server/auth.js`, `server/index.js`).
- Password hashing using bcryptjs and session cookies with HttpOnly and SameSite attributes.
- Authentication middleware on project/story/task API routes.
- Login rate limiting, CSRF checks, security headers and request validation.
- Removal of the known default password from newly created legacy/demo accounts; randomly generated undisclosed passwords are used instead. Existing user passwords are not automatically reset.

## Remaining risks and limits

- Authentication does not guarantee complete team/workspace authorization or role separation.
- CSRF handling allows an alternative request-header check; this should be reviewed before public deployment.
- Login throttling is in-memory and resets on restart.
- This update reflects source-code review, not a complete penetration test or live production certification.
- Claims below that authentication, Helmet and rate limiting are entirely absent are **outdated**.

---

# Archived Security Audit — Historical Findings

# TeamFlow — Security & Input Validation Audit Report

**Target**: TeamFlow — Small-Team Project Management Tool  
**Auditor**: Senior Backend Security Engineer  
**Date**: November 2026  
**Scope**: Full-Stack codebase inspection (`server/`, `src/`, `docs/`, `package.json`, `.env.example`, `vite.config.js`)  
**Mode**: Static Code Analysis & Runtime Verification (Read-Only)  

---

## 1. Executive Summary

A comprehensive security, input validation, database safety, and architectural reliability audit was performed on the **TeamFlow** application.

The application exhibits several strong foundational engineering practices, including 100% parameterized SQL queries, database-level CHECK constraints, atomic SQLite transactions for multi-statement operations, body size limits, and centralized error masking.

However, because the application was developed as a single-workspace prototype for an internship assignment, it intentionally omits authentication and authorization. In a multi-user or public deployment, this constitutes complete Broken Access Control. Furthermore, the application lacks HTTP security headers (`helmet`), rate limiting, request validation libraries, and robust integer validation on path parameters, leaving it susceptible to Denial of Service (DoS) via report queue flooding and malformed JSON 500 error triggering.

---

## 2. Existing Security Protections

The codebase implements several commendable security controls:

1. **Strict Parameterized Queries (SQL Injection Prevention)**:
   - All database queries across [server/index.js](file:///c:/P/S/server/index.js), [server/db.js](file:///c:/P/S/server/db.js), and [server/worker.js](file:///c:/P/S/server/worker.js) use `better-sqlite3` prepared statements with `?` parameter placeholders.
   - User inputs are never concatenated or interpolated directly into SQL statements.
2. **Defense-in-Depth Schema Constraints**:
   - [server/db.js](file:///c:/P/S/server/db.js#L14-L70) defines table-level `CHECK` constraints on status and priority enums (`projects.status`, `stories.priority`, `stories.status`, `tasks.status`, `jobs.status`).
   - Text length constraints are enforced at the database level (e.g. `CHECK(length(trim(name)) BETWEEN 2 AND 100)`).
3. **Atomic Multi-Statement Transactions**:
   - Project, story, and task mutations and their corresponding `activity_log` inserts are bound within `db.transaction(...)` blocks ([server/index.js#L63](file:///c:/P/S/server/index.js#L63), [#L94](file:///c:/P/S/server/index.js#L94), [#L122](file:///c:/P/S/server/index.js#L122), [#L147](file:///c:/P/S/server/index.js#L147), [#L177](file:///c:/P/S/server/index.js#L177), [#L201](file:///c:/P/S/server/index.js#L201)).
   - Failure during any step rolls back the entire transaction, preventing partial writes.
4. **Foreign Key Integrity & Cascading Deletes**:
   - `PRAGMA foreign_keys = ON;` is explicitly invoked ([server/db.js#L11](file:///c:/P/S/server/db.js#L11)). Child entities (`stories`, `tasks`) are automatically cleaned up on parent deletion via `ON DELETE CASCADE`.
5. **Centralized Error Masking**:
   - Unhandled exceptions caught by Express error middleware ([server/index.js#L259-L262](file:///c:/P/S/server/index.js#L259-L262)) log to server stdout/stderr but mask internal stack traces from clients, returning `{ "error": "Internal server error." }`.
6. **Payload Size Guardrails**:
   - `express.json({ limit: "1mb" })` ([server/index.js#L16](file:///c:/P/S/server/index.js#L16)) protects against memory exhaustion from oversized JSON bodies.
7. **No Hardcoded Secrets**:
   - No API keys, passwords, or private keys are committed in source code or `.env.example`.

---

## 3. Critical Findings

### [CRIT-01] Absence of Authentication and Access Control (Shared Tenant Prototype)
- **File & Lines**: [server/index.js#L48-L238](file:///c:/P/S/server/index.js#L48-L238)
- **Vulnerability**: OWASP Top 10 A01:2021 — Broken Access Control
- **Description**:
  Every REST endpoint is completely public and unauthenticated. Any anonymous network client can create, update, or permanently delete projects, stories, and tasks via `DELETE /api/projects/:id`.
- **Assignment Context vs Real-World Impact**:
  The assignment documentation explicitly documents this as an intentional limitation for a shared small-team workspace prototype. However, if exposed beyond `localhost` or onto an untrusted network, any user can tamper with or destroy all tenant data.

---

## 4. High-Priority Findings

### [HIGH-01] Denial of Service (DoS) via Unbounded Report Queue Flooding
- **File & Lines**: [server/index.js#L224-L229](file:///c:/P/S/server/index.js#L224-L229), [server/worker.js#L3](file:///c:/P/S/server/worker.js#L3)
- **Vulnerability**: OWASP Top 10 A05:2021 — Security Misconfiguration / Resource Exhaustion
- **Description**:
  `POST /api/projects/:id/reports` does not validate whether a report for the given project is already queued or processing, nor is it protected by rate limiting. A client can issue thousands of rapid POST requests, generating thousands of rows in the `jobs` table.
- **Impact**:
  Because the background worker polls only once every 3,000 ms (`WORKER_POLL_MS`) and claims only 1 job per tick (`LIMIT 1`), an attacker can cause queue starvation and backlog the worker for hours, exhaust SQLite storage, and degrade system performance.

### [HIGH-02] Missing HTTP Security Headers (Clickjacking & MIME-Sniffing Vulnerability) — [RESOLVED / HARDENED]
- **File & Lines**: [server/index.js#L17-L44](file:///c:/P/S/server/index.js#L17-L44), [package.json#L19](file:///c:/P/S/package.json#L19)
- **Vulnerability**: OWASP Top 10 A05:2021 — Security Misconfiguration
- **Status**: **RESOLVED** via `helmet` integration, tailored Content Security Policy (CSP), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `app.disable("x-powered-by")`.
- **Original Description**:
  The Express server previously did not use `helmet` or define custom security headers. The application was served without CSP, framing controls, nosniff, and leaked the Express banner.
- **Implemented Hardening**:
  See Section 7.2 for detailed configuration, directive exceptions, and verification evidence.

### [HIGH-03] Development Server Bound to All Network Interfaces (`0.0.0.0`)
- **File & Lines**: [package.json#L9](file:///c:/P/S/package.json#L9)
- **Vulnerability**: Network Perimeter Exposure
- **Description**:
  The `client:dev` script executes `vite --host 0.0.0.0`. This binds the development bundler to `INADDR_ANY`, exposing the internal React dev server, Vite HMR WebSocket, and proxied API endpoints to all devices on the local network (e.g. public Wi-Fi, shared corporate LAN).

---

## 5. Medium-Priority Findings

### [MED-01] Malformed JSON Payloads Trigger HTTP 500 Instead of HTTP 400 — [RESOLVED]
- **File & Lines**: [server/index.js#L45-L54](file:///c:/P/S/server/index.js#L45-L54)
- **Vulnerability**: Improper Error Handling / Status Code Inaccuracy
- **Status**: **RESOLVED** via dedicated body-parser error-handling middleware catching `SyntaxError` (400) and `entity.too.large` (413).
- **Description**:
  Previously, malformed JSON triggered an unhandled `SyntaxError` returning 500. Now returns HTTP 400 with `{ "error": "Malformed JSON payload." }` and HTTP 413 for bodies exceeding 1MB.

### [MED-02] Lack of Strict Integer Validation on Route Parameters — [RESOLVED]
- **File & Lines**: [server/index.js#L56-L65](file:///c:/P/S/server/index.js#L56-L65)
- **Vulnerability**: Type Coercion / Weak Route Parameter Hygiene
- **Status**: **RESOLVED** via centralized `app.param` route validators for `id`, `projectId`, and `storyId`.
- **Description**:
  Route parameters are strictly validated against `/^[1-9]\d*$/` and `Number.isSafeInteger()`. Non-numeric, zero, decimal, and negative IDs are rejected immediately with HTTP 400 `{ "error": "Invalid ID parameter. Must be a positive integer." }`. Non-existent valid IDs continue to return HTTP 404.

### [MED-03] PATCH Object Spreading Allows Unvalidated Property Absorption — [RESOLVED]
- **File & Lines**: [server/index.js#L145-L188](file:///c:/P/S/server/index.js#L145-L188), [#L225-L270](file:///c:/P/S/server/index.js#L225-L270), [#L315-L360](file:///c:/P/S/server/index.js#L315-L360)
- **Vulnerability**: Insecure Mass Assignment Pattern
- **Status**: **RESOLVED** via explicit allow-lists (`findUnknownField`), plain-object checks, strict type checking, and explicit field extraction.
- **Description**:
  Object spreading of unvalidated `req.body` has been completely eliminated. Unknown or protected fields (`id`, `project_id`, `created_at`, `story_id`) and empty update bodies (`{}`) are rejected with HTTP 400. Only explicit, validated properties are merged into database update statements.

### [MED-04] Raw Exception Details Exposed via Background Job Inspection
- **File & Lines**: [server/worker.js#L60](file:///c:/P/S/server/worker.js#L60), [server/index.js#L230-L234](file:///c:/P/S/server/index.js#L230-L234)
- **Vulnerability**: Information Disclosure (CWE-209)
- **Description**:
  When a background job fails, the worker records `String(error.message).slice(0, 500)` into `jobs.last_error`. The endpoint `GET /api/jobs/:id` serves `last_error` verbatim to clients.
- **Evidence**:
  During earlier debugging, internal database driver errors (`ambiguous column name: status`) were directly exposed to API consumers.

### [MED-05] Potential Event Loop Starvation Under Heavy Concurrent Writes
- **File & Lines**: [server/db.js#L9-L12](file:///c:/P/S/server/db.js#L9-L12)
- **Vulnerability**: Single-Thread Event Loop Blocking
- **Description**:
  `better-sqlite3` is a synchronous C++ SQLite binding. While WAL mode enables concurrent readers, write transactions acquire exclusive database locks. Under high concurrency or long-running database transactions, synchronous execution will block the Node.js main thread, increasing response latency for all concurrent users.

---

## 6. Authentication and Authorization Limitations

### Intentional Scope vs. Production Vulnerability Matrix

| Capability | Current State | Internship Scope Context | Production Risk Level |
|---|---|---|---|
| **User Identity Verification** | None (All calls anonymous) | Intentional: Shared team workspace without login | **CRITICAL** (Zero authentication) |
| **Role-Based Access Control (RBAC)** | None (All users have superadmin privileges) | Intentional: Flat agile team prototype | **CRITICAL** (Destructive operations unvetted) |
| **Workspace Tenant Isolation** | None (Single shared SQLite DB) | Intentional: Single-project local instance | **CRITICAL** (Cross-tenant data exposure) |
| **Audit Log Attribution** | Messages store text but no user ID | Hardcoded author strings ("Team", "Alex Morgan") | **HIGH** (Non-repudiation impossible) |

---

## 7. Recommended Fixes (Ordered by Priority)

### Priority 1: Prevent Resource Exhaustion & Denial of Service
1. **Report Queue Deduplication & Rate Limiting**:
   - In `POST /api/projects/:id/reports`, verify if a report job is already in `pending` or `processing` state for that project before creating a new one:
     ```javascript
     const existing = db.prepare("SELECT id FROM jobs WHERE type = 'project_report' AND status IN ('pending', 'processing') AND json_extract(payload, '$.projectId') = ?").get(project.id);
     if (existing) return res.status(409).json({ error: "A report is already in progress for this project.", jobId: existing.id });
     ```
   - Install and configure `express-rate-limit` (e.g. 5 report requests per minute per IP).

### Priority 2: HTTP Security Hardening & Headers [IMPLEMENTED]

#### 1. Security Headers Implemented
The application has been hardened with the following HTTP response headers via `helmet` and Express configuration:
- **`Content-Security-Policy` (CSP)**: Restricts resource fetching to permitted domains and eliminates unauthorized script/style injection.
- **`X-Content-Type-Options: nosniff`**: Prevents MIME-type confusion attacks and forced script execution from uploaded or static text assets.
- **`X-Frame-Options: SAMEORIGIN`**: Mitigates clickjacking attacks by forbidding external domains from embedding TeamFlow inside frames/iframes.
- **`Content-Security-Policy: frame-ancestors 'self'`**: Modern standards-compliant clickjacking defense complementing `X-Frame-Options`.
- **`Cross-Origin-Resource-Policy: cross-origin`**: Permits cross-origin API consumption from the Vite development server (`http://localhost:5173`) while maintaining strict resource scoping.
- **`Referrer-Policy: no-referrer`**: Prevents leaking internal request URLs in the HTTP `Referer` header.
- **`X-DNS-Prefetch-Control: off`**: Prevents speculative DNS prefetching.
- **`X-Download-Options: noopen`**: Prevents legacy browsers from executing downloads directly within the site context.
- **`X-Permitted-Cross-Domain-Policies: none`**: Blocks Flash and PDF cross-domain policy access.
- **Removal of `X-Powered-By`**: Express identification banner removed via `app.disable("x-powered-by")` and Helmet's `hidePoweredBy`.

#### 2. Helmet Configuration ([server/index.js](file:///c:/P/S/server/index.js#L17-L44))
```javascript
import helmet from "helmet";

// Disable Express identification banner
app.disable("x-powered-by");

// Apply Helmet security middleware
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
```

#### 3. CSP Directives & Exceptions Rationale

| Directive | Configured Value | Exception / Rationale |
|---|---|---|
| `default-src` | `'self'` | Baseline restriction limiting all fallback resources to the application origin. |
| `script-src` | `'self'`, `'unsafe-inline'` | `'self'` covers Vite's built bundles (`/assets/*.js`) and Swagger UI external scripts (`swagger-ui-bundle.js`, `swagger-ui-init.js`). `'unsafe-inline'` is required by Swagger UI for initialization scripts and inline event handlers. |
| `style-src` | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com` | `'self'` covers Vite's output CSS (`/assets/*.css`) and Swagger UI styles (`swagger-ui.css`). `'unsafe-inline'` is required because Swagger UI injects `<style>` tags directly into its HTML document, and React components utilize dynamic styling. `https://fonts.googleapis.com` is required because `src/styles.css` imports Google Fonts stylesheets. |
| `font-src` | `'self'`, `https://fonts.gstatic.com`, `data:` | Google Fonts stylesheets download font binaries (`.woff2`) from `https://fonts.gstatic.com`. `data:` supports inline base64 font payloads if utilized. |
| `img-src` | `'self'`, `data:` | Required for Swagger UI embedded data-URI icons, SVG symbols, and application graphics. |
| `connectSrc` | `'self'` | Restricts XHR and Fetch API requests to the TeamFlow server (`/api/*`). |
| `frame-ancestors` | `'self'` | Clickjacking defense: blocks external third-party origins from embedding TeamFlow inside `<iframe>`, `<frame>`, `<embed>`, or `<object>`. Same-origin framing remains allowed. |
| `object-src` | `'none'` | Blocks legacy plugin technologies (e.g. Flash, Java, Silverlight). |
| `upgradeInsecureRequests` | `null` (Disabled) | Explicitly disabled to prevent breaking local and non-HTTPS deployment environments (`http://localhost:4000`, local network IPs) by avoiding forced HTTPS upgrades where no SSL certificate is configured. |
| `crossOriginResourcePolicy` | `cross-origin` | Allows API resources to be consumed cross-origin by the Vite development workflow on `http://localhost:5173` without being blocked by browser CORP checks. |

#### 4. Remaining Security Limitations
1. **`'unsafe-inline'` in `script-src` and `style-src`**:
   - Because Swagger UI (`swagger-ui-express`) injects inline styles and inline script logic, CSP strictness is limited. In an enterprise environment, migrating Swagger UI to serve static assets or using nonces (`res.locals.cspNonce`) generated per-request would allow removing `'unsafe-inline'`.
2. **Strict-Transport-Security (HSTS) on Local HTTP**:
   - HSTS is ignored by browsers over plain HTTP. In production environments behind a reverse proxy (e.g., NGINX, Cloudflare) terminating TLS, HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`) should be enabled.
3. **Absence of User Authentication**:
   - HTTP security headers do not substitute for user authentication and authorization. The application remains an open shared-workspace prototype until an authentication layer (e.g. JWT/sessions + RBAC) is introduced.

### Priority 3: Robust Input Validation & Sanitization
1. **JSON Body Parser Error Catcher**:
   - Add a custom middleware immediately following `express.json()` to catch `SyntaxError` and respond with HTTP 400 Bad Request instead of HTTP 500:
     ```javascript
     app.use((err, req, res, next) => {
       if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
         return res.status(400).json({ error: "Malformed JSON payload." });
       }
       next(err);
     });
     ```
2. **Numeric ID Parameter Validation**:
   - Enforce positive integer validation on all `:id` route parameters via middleware or regex validation:
     ```javascript
     const parseId = (param) => {
       const n = Number(param);
       return Number.isInteger(n) && n > 0 ? n : null;
     };
     ```
3. **Explicit Allow-List on PATCH Operations**:
   - Avoid `{ ...entity, ...req.body }`. Extract only explicitly permitted mutable fields:
     ```javascript
     const { title, description, status, assignee, priority } = req.body;
     ```

### Priority 4: Authentication, Authorization & Production Deployment
1. **User Authentication & Session Management**:
   - Implement JWT / session-based authentication (e.g., using `bcrypt` and HTTP-only cookies).
2. **Tenant Scoping**:
   - Introduce `users` and `workspaces` tables; scope all queries with `WHERE workspace_id = ? AND user_id = ?`.
3. **Development Network Binding**:
   - Change `package.json` `"client:dev"` from `vite --host 0.0.0.0` to `vite --host 127.0.0.1` unless external network access is explicitly needed.

---

## 8. Summary of Inspected Files & Line References

| File | Lines Inspected | Primary Findings / Security Controls |
|---|---|---|
| [server/index.js](file:///c:/P/S/server/index.js) | Lines 13–20 | CORS default origin, body parser limit (1MB), missing Helmet. |
| [server/index.js](file:///c:/P/S/server/index.js) | Lines 28–33 | Custom validation helpers (`requiredText`, `optionalText`, `validDate`). |
| [server/index.js](file:///c:/P/S/server/index.js) | Lines 59–221 | CRUD routes, atomic transactions, parameterized SQL queries, absence of auth. |
| [server/index.js](file:///c:/P/S/server/index.js) | Lines 224–229 | Unbounded report queueing (DoS vulnerability). |
| [server/index.js](file:///c:/P/S/server/index.js) | Lines 241–257 | Unmatched `/api` 404 handler, static asset serving, SPA fallback. |
| [server/index.js](file:///c:/P/S/server/index.js) | Lines 259–262 | Centralized 500 error handler masking stack traces. |
| [server/db.js](file:///c:/P/S/server/db.js) | Lines 9–13 | WAL mode, busy timeout (5000ms), foreign keys enabled (`PRAGMA foreign_keys = ON`). |
| [server/db.js](file:///c:/P/S/server/db.js) | Lines 14–70 | Schema definitions, table CHECK constraints, indexes. |
| [server/worker.js](file:///c:/P/S/server/worker.js) | Lines 8–22 | Transactional atomic job claiming (`status = 'pending'`). |
| [server/worker.js](file:///c:/P/S/server/worker.js) | Lines 44–68 | Worker tick, exponential backoff, bounded retries (max 3), exception logging. |
| [package.json](file:///c:/P/S/package.json) | Lines 6–13 | Dev script binding to `0.0.0.0`; dependencies list (absence of helmet/rate-limit). |
| [.env.example](file:///c:/P/S/.env.example) | Lines 1–4 | Default configuration variables; no committed secrets. |
| [.gitignore](file:///c:/P/S/.gitignore) | Lines 1–6 | Ignores `.env` and SQLite database/WAL files. |
