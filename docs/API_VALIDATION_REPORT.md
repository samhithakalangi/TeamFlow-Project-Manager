# TeamFlow — API Input Validation & Error Handling Report

**Date**: November 2026  
**Auditor / Engineer**: Senior Node.js & Express Backend Engineer  
**Scope**: Server input validation, error handling, route parameter hygiene, and OpenAPI documentation across [server/index.js](file:///C:/P/S/server/index.js), [docs/openapi.yaml](file:///C:/P/S/docs/openapi.yaml), and [docs/SECURITY_AUDIT.md](file:///C:/P/S/docs/SECURITY_AUDIT.md).

---

## 1. Executive Summary

This report documents the resolution of the medium-priority input validation and error handling vulnerabilities identified during the TeamFlow security audit (`[MED-01]`, `[MED-02]`, and `[MED-03]`):
1. **Malformed JSON & Payload Limit Enforcement**: Added dedicated body-parser error-handling middleware catching `SyntaxError` (returning HTTP 400 with a generic message and masking all internal stack traces) and `entity.too.large` (returning HTTP 413 when payloads exceed 1MB).
2. **Centralized Route Parameter ID Validation**: Enforced positive safe integer validation (`/^[1-9]\d*$/`) across all `:id`, `:projectId`, and `:storyId` parameters via Express `app.param()`. Invalid ID syntax returns HTTP 400, while non-existent valid IDs continue to return HTTP 404.
3. **Strict PATCH Request Validation & Mass Assignment Prevention**:
   - Replaced unvalidated object spreading (`{ ...story, ...req.body }`) with explicit field extraction.
   - Rejects empty update payloads (`{}`) with HTTP 400.
   - Rejects unknown or protected fields (`id`, `project_id`, `story_id`, `created_at`, `updated_at`) with HTTP 400.
   - Enforces strict type checking, enum validation (project/story/task statuses and priorities), text length limits, and date format checks (`YYYY-MM-DD` or `null`).
4. **OpenAPI Specification**: Updated [docs/openapi.yaml](file:///C:/P/S/docs/openapi.yaml) to document the HTTP 400, 404, 413 response contracts, request schemas, and parameter constraints.

All 12 validation test suites, existing report queue protection tests, and security header tests passed with 100% success.

---

## 2. Files Modified

| File | Change Summary |
|---|---|
| [server/index.js](file:///C:/P/S/server/index.js) | Implemented body-parser error middleware, `app.param` ID validators, plain-object validation, unknown field detection, and strict PATCH/POST mutation validation without object spreading. |
| [docs/openapi.yaml](file:///C:/P/S/docs/openapi.yaml) | Added reusable `ErrorResponse` component schema, `400`, `404`, `413` responses across routes, and minimum integer constraints on path parameters. |
| [docs/SECURITY_AUDIT.md](file:///C:/P/S/docs/SECURITY_AUDIT.md) | Updated findings `[MED-01]`, `[MED-02]`, and `[MED-03]` to RESOLVED status with implementation notes. |

---

## 3. Validation Rules Implemented

### A. Route Parameter ID Rules
- **Regex & Range**: `/^[1-9]\d*$/` and `Number.isSafeInteger(Number(val))`.
- **Validation Scope**: Applied centrally via `app.param("id")`, `app.param("projectId")`, and `app.param("storyId")`.
- **Outcome**:
  - Rejects `abc`, `0`, `-1`, `1.5`, empty values, and non-numeric strings with **HTTP 400**:
    ```json
    { "error": "Invalid ID parameter. Must be a positive integer." }
    ```
  - Valid IDs that do not exist in SQLite continue to return **HTTP 404**:
    ```json
    { "error": "Project not found." }
    ```

### B. JSON Body Parsing Rules
- **Syntax Verification**: Catches `SyntaxError` with status 400 and responds with **HTTP 400**:
  ```json
  { "error": "Malformed JSON payload." }
  ```
- **Size Limit (1MB)**: Catches `entity.too.large` with status 413 and responds with **HTTP 413**:
  ```json
  { "error": "Payload too large. Maximum size is 1MB." }
  ```
- **Internal Stack Protection**: Stack traces and internal node/express parser details are completely masked from the client.

### C. PATCH Mutation Validation Rules

| Entity | Allowed Fields | Protected / Rejected Fields | Type & Format Requirements |
|---|---|---|---|
| **Project** (`PATCH /api/projects/:id`) | `name`, `description`, `owner`, `status` | `id`, `created_at`, `updated_at`, unknown fields | - `name`: String 2–100 chars<br>- `description`: String &le; 2000 chars<br>- `owner`: String &le; 80 chars<br>- `status`: Enum (`active`, `completed`, `archived`) |
| **Story** (`PATCH /api/stories/:id`) | `title`, `description`, `acceptanceCriteria`, `acceptance_criteria`, `priority`, `status`, `assignee`, `sort_order` | `id`, `project_id`, `created_at`, `updated_at`, unknown fields | - `title`: String 2–160 chars<br>- `description`: String &le; 2000 chars<br>- `acceptanceCriteria`: String &le; 2000 chars<br>- `priority`: Enum (`low`, `medium`, `high`, `critical`)<br>- `status`: Enum (`backlog`, `in_progress`, `review`, `done`)<br>- `assignee`: String &le; 80 chars<br>- `sort_order`: Integer &ge; 0 |
| **Task** (`PATCH /api/tasks/:id`) | `title`, `description`, `status`, `assignee`, `dueDate`, `due_date` | `id`, `story_id`, `project_id`, `created_at`, `updated_at`, unknown fields | - `title`: String 2–160 chars<br>- `description`: String &le; 2000 chars<br>- `status`: Enum (`todo`, `in_progress`, `done`)<br>- `assignee`: String &le; 80 chars<br>- `dueDate`: `null` or `YYYY-MM-DD` |

- **Empty Body Guard**: `if (!isPlainObject(req.body) || Object.keys(req.body).length === 0)` returns **HTTP 400**:
  ```json
  { "error": "Update body cannot be empty." }
  ```
- **Unknown Field Guard**: Any field not in the allowed list returns **HTTP 400**:
  ```json
  { "error": "Unknown or protected field: <fieldName>" }
  ```
- **No Object Spreading**: Replaced `{ ...story, ...req.body }` with explicit assignment of validated fields.

---

## 4. Error Response Behavior & Status Codes

All API errors return consistent JSON responses with a top-level `error` key:

| Status Code | Scenario | Example Response |
|---|---|---|
| **400 Bad Request** | Malformed JSON syntax | `{ "error": "Malformed JSON payload." }` |
| **400 Bad Request** | Non-numeric or non-positive ID (`0`, `-1`, `abc`, `1.5`) | `{ "error": "Invalid ID parameter. Must be a positive integer." }` |
| **400 Bad Request** | Empty PATCH request body (`{}`) | `{ "error": "Update body cannot be empty." }` |
| **400 Bad Request** | Unknown or protected field in payload | `{ "error": "Unknown or protected field: id" }` |
| **400 Bad Request** | Invalid field type or constraint failure | `{ "error": "Story title must be a string between 2 and 160 characters." }` |
| **400 Bad Request** | Invalid enum value (status or priority) | `{ "error": "Invalid story status. Allowed: backlog, in_progress, review, done" }` |
| **404 Not Found** | Valid ID referring to non-existent resource | `{ "error": "Project not found." }` |
| **404 Not Found** | Unmatched `/api/*` endpoint | `{ "error": "API endpoint not found." }` |
| **413 Payload Too Large** | Request body exceeds 1MB | `{ "error": "Payload too large. Maximum size is 1MB." }` |
| **429 Too Many Requests** | Exceeded report rate limit (5 req/min) | `{ "error": "Too many report requests. Please try again later.", "retryAfter": 60 }` |
| **500 Internal Error** | Unhandled internal exception | `{ "error": "Internal server error." }` |

---

## 5. Test Cases and Actual Outcomes

Automated testing was conducted via `scratch/test_api_validation.mjs` against the live server and database.

### Test Execution Output

```
===============================================================
      TEAMFLOW API INPUT VALIDATION & ERROR HANDLING TESTS      
===============================================================

[Setup] Starting server process (node server/index.js)...
[Setup] Server is ready on port 4000.

[Context] Using Project ID: 1, Story ID: 1, Task ID: 1

--- TEST 1: Malformed JSON Syntax ---
POST /projects with malformed JSON -> HTTP 400 { error: 'Malformed JSON payload.' }
✔ PASS: Malformed JSON returns HTTP 400
✔ PASS: Malformed JSON returns generic masked error

--- TEST 2: Oversized JSON (> 1MB) ---
POST /projects with 1.2MB payload -> HTTP 413 { error: 'Payload too large. Maximum size is 1MB.' }
✔ PASS: Oversized payload returns HTTP 413
✔ PASS: Oversized payload returns descriptive message

--- TEST 3: Route ID Validation ---
GET /projects/abc (non-numeric string) -> HTTP 400 { error: 'Invalid ID parameter. Must be a positive integer.' }
✔ PASS: Invalid ID 'abc' (non-numeric string) returns HTTP 400
✔ PASS: Error message indicates invalid ID for 'abc'
GET /projects/0 (zero) -> HTTP 400 { error: 'Invalid ID parameter. Must be a positive integer.' }
✔ PASS: Invalid ID '0' (zero) returns HTTP 400
✔ PASS: Error message indicates invalid ID for '0'
GET /projects/-1 (negative integer) -> HTTP 400 { error: 'Invalid ID parameter. Must be a positive integer.' }
✔ PASS: Invalid ID '-1' (negative integer) returns HTTP 400
✔ PASS: Error message indicates invalid ID for '-1'
GET /projects/1.5 (decimal number) -> HTTP 400 { error: 'Invalid ID parameter. Must be a positive integer.' }
✔ PASS: Invalid ID '1.5' (decimal number) returns HTTP 400
✔ PASS: Error message indicates invalid ID for '1.5'
✔ PASS: PATCH /stories/abc returns HTTP 400 for invalid ID
✔ PASS: PATCH /tasks/0 returns HTTP 400 for invalid ID
✔ PASS: GET /jobs/-5 returns HTTP 400 for invalid ID
✔ PASS: POST /projects/0/stories returns HTTP 400 for invalid projectId
✔ PASS: Valid positive integer ID 1 returns HTTP 200

--- TEST 4: Valid but Non-existent IDs ---
GET /projects/9999999 -> HTTP 404 { error: 'Project not found.' }
✔ PASS: Non-existent project ID returns HTTP 404
PATCH /stories/9999999 -> HTTP 404 { error: 'Story not found.' }
✔ PASS: Non-existent story ID returns HTTP 404
PATCH /tasks/9999999 -> HTTP 404 { error: 'Task not found.' }
✔ PASS: Non-existent task ID returns HTTP 404

--- TEST 5: Empty PATCH Body ---
PATCH /projects/:id with {} -> HTTP 400 { error: 'Update body cannot be empty.' }
✔ PASS: Empty PATCH /projects/:id body returns HTTP 400
PATCH /stories/:id with {} -> HTTP 400 { error: 'Update body cannot be empty.' }
✔ PASS: Empty PATCH /stories/:id body returns HTTP 400
PATCH /tasks/:id with {} -> HTTP 400 { error: 'Update body cannot be empty.' }
✔ PASS: Empty PATCH /tasks/:id body returns HTTP 400

--- TEST 6: Unknown PATCH Fields ---
PATCH /projects/:id with unknownField -> HTTP 400 { error: 'Unknown or protected field: unknownField' }
✔ PASS: Unknown field in project PATCH rejected with HTTP 400
PATCH /stories/:id with malicious_prop -> HTTP 400 { error: 'Unknown or protected field: malicious_prop' }
✔ PASS: Unknown field in story PATCH rejected with HTTP 400
PATCH /tasks/:id with secretField -> HTTP 400 { error: 'Unknown or protected field: secretField' }
✔ PASS: Unknown field in task PATCH rejected with HTTP 400

--- TEST 7: Wrong Field Types ---
PATCH /projects/:id with { name: 12345 } -> HTTP 400 {
  error: 'Project name must be a string between 2 and 100 characters.'
}
✔ PASS: Number passed as project name returns HTTP 400
PATCH /stories/:id with { sort_order: 'first' } -> HTTP 400 { error: 'Story sort order must be a non-negative integer.' }
✔ PASS: String passed as sort_order returns HTTP 400
PATCH /tasks/:id with { dueDate: 'not-a-date' } -> HTTP 400 { error: 'Invalid task due date. Must be YYYY-MM-DD or null.' }
✔ PASS: Invalid date string returns HTTP 400

--- TEST 8: Invalid Status Values ---
PATCH /projects/:id with invalid status -> HTTP 400 {
  error: 'Invalid project status. Allowed: active, completed, archived'
}
✔ PASS: Invalid project status returns HTTP 400
PATCH /stories/:id with invalid status -> HTTP 400 {
  error: 'Invalid story status. Allowed: backlog, in_progress, review, done'
}
✔ PASS: Invalid story status returns HTTP 400
PATCH /tasks/:id with invalid status -> HTTP 400 { error: 'Invalid task status. Allowed: todo, in_progress, done' }
✔ PASS: Invalid task status returns HTTP 400

--- TEST 9: Invalid Priority Values ---
PATCH /stories/:id with { priority: 'ultra_high' } -> HTTP 400 {
  error: 'Invalid story priority. Allowed: low, medium, high, critical'
}
✔ PASS: Invalid story priority returns HTTP 400

--- TEST 10: Attempts to Modify Protected Fields ---
PATCH /projects/:id attempting to overwrite id -> HTTP 400 { error: 'Unknown or protected field: id' }
✔ PASS: Attempt to overwrite project id rejected with HTTP 400
PATCH /stories/:id attempting to overwrite project_id -> HTTP 400 { error: 'Unknown or protected field: project_id' }
✔ PASS: Attempt to overwrite story project_id rejected with HTTP 400
PATCH /stories/:id attempting to overwrite created_at -> HTTP 400 { error: 'Unknown or protected field: created_at' }
✔ PASS: Attempt to overwrite created_at rejected with HTTP 400
PATCH /tasks/:id attempting to overwrite story_id -> HTTP 400 { error: 'Unknown or protected field: story_id' }
✔ PASS: Attempt to overwrite task story_id rejected with HTTP 400

--- TEST 11: Valid Updates ---
PATCH /projects/:id valid update -> HTTP 200 Website Redesign
✔ PASS: Valid project update returns HTTP 200
✔ PASS: Project owner updated accurately
PATCH /stories/:id valid update -> HTTP 200 high
✔ PASS: Valid story update returns HTTP 200
✔ PASS: Story priority updated accurately
PATCH /tasks/:id valid update -> HTTP 200 2026-12-31
✔ PASS: Valid task update returns HTTP 200
✔ PASS: Task due date updated accurately

--- TEST 12: Existing CRUD & Report Generation ---
✔ PASS: POST /projects creates project (HTTP 201)
✔ PASS: POST /projects/:projectId/stories creates story (HTTP 201)
✔ PASS: POST /stories/:storyId/tasks creates task (HTTP 201)
✔ PASS: GET /projects/:id returns full hierarchy
✔ PASS: Hierarchy includes created story
✔ PASS: Hierarchy includes created task
POST /projects/:id/reports -> HTTP 202 {
  jobId: 27,
  status: 'queued',
  message: 'Your project report is being generated.'
}
✔ PASS: Report generation still functions
✔ PASS: GET /projects/:id/activity returns activity
✔ PASS: Activity log contains entries
✔ PASS: DELETE /projects/:id returns HTTP 204

===============================================================
       ALL 12 INPUT VALIDATION TEST SUITES PASSED (100%)       
===============================================================
```

### Additional Test Suite Verifications
1. **Existing Background Job Queue Protection**:
   - `scratch/test_job_queue_protection.mjs`: All 9 test cases passed (100%).
2. **Existing HTTP Security Headers**:
   - `scratch/test_security_headers.mjs`: All security headers (`CSP`, `nosniff`, `SAMEORIGIN`, `cross-origin`) and absence of `X-Powered-By` verified.
3. **Production Build**:
   - `npm run build`: Vite build completed in 752ms with 0 errors.

---

## 6. Remaining Limitations

1. **Schema Validation Library (Zod / Joi)**:
   - Input validation is currently implemented using pure Node.js/Express functions (`isPlainObject`, `findUnknownField`, `requiredText`, `optionalText`, `validDate`). While zero-dependency and fast, as the API grows, adopting a schema declaration library like Zod would allow automatic TypeScript typing and centralized schema definitions.
2. **Authentication & Authorization**:
   - As documented in the architectural audit, all endpoints remain unauthenticated per the assignment's single-workspace scope. Anyone with network access can invoke these validated endpoints.
3. **Multipart / File Uploads**:
   - Body parsing and payload limits currently cover JSON payloads (`express.json`). If file or multipart uploads are added in the future, a streaming multipart parser (e.g. `busboy` or `multer`) with file size and MIME-type restrictions will be required.
