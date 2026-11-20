function getCsrfTokenFromCookie() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)tf_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function request(path, options = {}) {
  let response;

  const csrfToken = getCsrfTokenFromCookie();
  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...options.headers
  };

  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to the backend server. Check that npm run dev is running and port 4000 is available."
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text();

    if (!response.ok) {
      const err = new Error(
        `Server error (${response.status}): ${
          text.trim().startsWith("<")
            ? "The server returned HTML instead of JSON. Check your backend and API proxy."
            : text.slice(0, 200) || response.statusText
        }`
      );
      err.status = response.status;
      throw err;
    }

    throw new Error("Unexpected server response. Expected JSON.");
  }

  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
        ? data.message
        : JSON.stringify(data.error || data.message || {});

    const err = new Error(
      message && message !== "{}"
        ? message
        : `Request failed with status ${response.status}`
    );
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Authentication
  login: credentials =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),

  signup: userData =>
    request("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData)
    }),

  logout: () =>
    request("/auth/logout", {
      method: "POST"
    }),

  me: () => request("/auth/me"),

  // Projects
  projects: () => request("/projects"),

  project: id => request(`/projects/${id}`),

  deleteProject: id =>
    request(`/projects/${id}`, {
      method: "DELETE"
    }),

  createProject: body =>
    request("/projects", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateProject: (id, body) =>
    request(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  createStory: (id, body) =>
    request(`/projects/${id}/stories`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateStory: (id, body) =>
    request(`/stories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  deleteStory: id =>
    request(`/stories/${id}`, {
      method: "DELETE"
    }),

  createTask: (id, body) =>
    request(`/stories/${id}/tasks`, {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateTask: (id, body) =>
    request(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  deleteTask: id =>
    request(`/tasks/${id}`, {
      method: "DELETE"
    }),

  activity: id =>
    request(`/projects/${id}/activity`),

  report: id =>
    request(`/projects/${id}/reports`, {
      method: "POST"
    }),

  job: id =>
    request(`/jobs/${id}`)
};
