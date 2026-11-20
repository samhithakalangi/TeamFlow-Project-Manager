import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { useRoute } from "./useRoute";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";

const storyStates = ["backlog", "in_progress", "review", "done"];
const taskStates = ["todo", "in_progress", "done"];
const pretty = value => (value || "").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

// ============================================================================
// VECTOR ICONS (Crisp, High-Performance SVG Icons for Linear/Height Aesthetic)
// ============================================================================

function IconProject({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconActivity({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconPlus({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconCheck({ size = 13, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconClock({ size = 13, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconSearch({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconEdit({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconSparkles({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

function IconBook({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconCheckSquare({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconTrendingUp({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconHourglass({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}

function IconUser({ size = 13, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogout({ size = 13, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconClose({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TeamFlowMark({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3.5 6.5h10M8.5 6.5v12" />
      <path d="M14 9.5h6.5M15 9.5v8.5M15 14h4.5" />
    </svg>
  );
}

// ============================================================================
// DATE & FORMATTING HELPERS
// ============================================================================

function parseUtcDate(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T");
  const iso = normalized.endsWith("Z") || normalized.includes("+") ? normalized : `${normalized}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(dateStr) : d;
}

function formatTimestamp(dateStr, includeTime = false) {
  const date = parseUtcDate(dateStr);
  if (!date || isNaN(date.getTime())) return dateStr || "";
  return includeTime ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDueDateMeta(dateStr, status) {
  if (!dateStr) return { label: "No due date", type: "none" };
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const formatted = formatDueDate(dateStr);
  if (status === "done") {
    return { label: `Done · ${formatted}`, type: "completed" };
  }
  if (dateStr < todayStr) {
    return { label: `Overdue · ${formatted}`, type: "overdue" };
  }
  if (dateStr === todayStr) {
    return { label: "Due today", type: "today" };
  }
  return { label: `Due ${formatted}`, type: "upcoming" };
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <section className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn close-modal-btn" onClick={onClose} aria-label="Close dialog">
            <IconClose size={16} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function App() {
  const { route, navigate } = useRoute();

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [project, setProject] = useState(null);
  const [activity, setActivity] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportJob, setReportJob] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedCriteria, setExpandedCriteria] = useState({});
  const [initialLoading, setInitialLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [updatingTasks, setUpdatingTasks] = useState({});

  function toggleCriteria(storyId) {
    setExpandedCriteria(prev => ({ ...prev, [storyId]: !prev[storyId] }));
  }

  // Restore authenticated session on initial mount
  useEffect(() => {
    let isMounted = true;
    api.me()
      .then(data => {
        if (isMounted) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setAuthLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  async function loadProjects(selectFirst = true) {
    const rows = await api.projects();
    setProjects(rows);
    if (selectFirst && !activeId && rows.length) setActiveId(rows[0].id);
    if (!rows.length) { setActiveId(null); setProject(null); }
  }

  async function loadProject(id = activeId) {
    if (!id) return;
    const [detail, events] = await Promise.all([api.project(id), api.activity(id)]);
    setProject(detail);
    setActivity(events);
  }

  // Load projects once user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    setInitialLoading(true);
    loadProjects()
      .catch(showError)
      .finally(() => setInitialLoading(false));
  }, [currentUser]);

  useEffect(() => {
    if (activeId && currentUser) {
      loadProject(activeId).catch(showError);
    }
  }, [activeId, currentUser]);

  function showError(error) {
    if (error?.status === 401) {
      setCurrentUser(null);
      setProjects([]);
      setProject(null);
      setActiveId(null);
      navigate("/login");
      return;
    }
    setToast(error.message || "Request failed");
    setTimeout(() => setToast(""), 3500);
  }

  function success(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  async function refresh() {
    await loadProjects(false);
    await loadProject();
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch (err) {
      console.error("Logout request error:", err);
    }
    setCurrentUser(null);
    setProjects([]);
    setProject(null);
    setActiveId(null);
    navigate("/login");
  }

  function handleAuthSuccess(user) {
    setCurrentUser(user);
    navigate("/");
  }

  const allTasks = project?.stories?.flatMap(s => s.tasks) || [];
  const doneTasks = allTasks.filter(t => t.status === "done").length;
  const percent = allTasks.length ? Math.round(doneTasks / allTasks.length * 100) : 0;
  const visibleStories = useMemo(() => (project?.stories || []).filter(s =>
    (filter === "all" || s.status === filter) &&
    `${s.title} ${s.assignee} ${s.acceptance_criteria || ""} ${s.tasks.map(t => `${t.title} ${t.description || ""} ${t.assignee || ""}`).join(" ")}`.toLowerCase().includes(search.toLowerCase())
  ), [project, filter, search]);

  async function createProject(e) {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const item = await api.createProject({ name: form.get("name"), description: form.get("description"), owner: form.get("owner") });
      await loadProjects(false);
      setActiveId(item.id);
      setModal(null);
      success("Project created");
    } catch (err) {
      showError(err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function editProject(e) {
    e.preventDefault();
    if (!project || formSubmitting) return;
    setFormSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.updateProject(project.id, {
        name: form.get("name"),
        description: form.get("description"),
        owner: form.get("owner"),
        status: form.get("status")
      });
      setModal(null);
      await refresh();
      success("Project updated");
    } catch (err) {
      showError(err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function deleteProject() {
    if (!project || !confirm(`Delete "${project.name}" and all its stories and tasks? This cannot be undone.`)) return;
    try {
      await api.deleteProject(project.id);
      const remaining = projects.filter(item => item.id !== project.id);
      setProject(null); setActivity([]); setActiveId(remaining[0]?.id ?? null);
      await loadProjects(false);
      success("Project deleted");
    } catch (err) { showError(err); }
  }

  async function editStory(e) {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.updateStory(modal.story.id, {
        title: form.get("title"), description: form.get("description"),
        acceptanceCriteria: form.get("criteria"), priority: form.get("priority"),
        assignee: form.get("assignee"), status: form.get("status")
      });
      setModal(null); await refresh(); success("Story updated");
    } catch (err) {
      showError(err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function editTask(e) {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.updateTask(modal.task.id, {
        title: form.get("title"), description: form.get("description"),
        assignee: form.get("assignee"), status: form.get("status"),
        dueDate: form.get("dueDate") || null
      });
      setModal(null); await refresh(); success("Task updated");
    } catch (err) {
      showError(err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function createStory(e) {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.createStory(activeId, {
        title: form.get("title"),
        description: form.get("description"),
        acceptanceCriteria: form.get("criteria"),
        priority: form.get("priority"),
        assignee: form.get("assignee")
      });
      setModal(null);
      await refresh();
      success("User story added");
    } catch (err) {
      showError(err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function createTask(e) {
    e.preventDefault();
    if (formSubmitting) return;
    setFormSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await api.createTask(modal.storyId, {
        title: form.get("title"),
        assignee: form.get("assignee"),
        dueDate: form.get("dueDate") || null
      });
      setModal(null);
      await refresh();
      success("Task added");
    } catch (err) {
      showError(err);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function updateStory(id, patch) {
    try { await api.updateStory(id, patch); await refresh(); } catch (err) { showError(err); }
  }

  async function updateTask(id, patch) {
    if (updatingTasks[id]) return;
    setUpdatingTasks(prev => ({ ...prev, [id]: true }));
    try {
      await api.updateTask(id, patch);
      await refresh();
    } catch (err) {
      showError(err);
    } finally {
      setUpdatingTasks(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function deleteStory(target) {
    const story = typeof target === "object" ? target : project?.stories?.find(s => s.id === target);
    const storyName = story?.title ? `"${story.title}"` : "this story";
    const storyId = story?.id ?? target;
    if (!confirm(`Delete story ${storyName} and all its tasks? This cannot be undone.`)) return;
    try { await api.deleteStory(storyId); await refresh(); success("Story deleted"); } catch (err) { showError(err); }
  }

  async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;
    try { await api.deleteTask(id); await refresh(); success("Task deleted"); } catch (err) { showError(err); }
  }

  async function generateReport() {
    if (!activeId || busy) return;
    const requestedProjectId = activeId;
    setBusy(true);
    setReportJob({ status: "submitting", projectId: requestedProjectId });
    try {
      const queued = await api.report(requestedProjectId);
      setReportJob({ id: queued.jobId, status: "pending", projectId: requestedProjectId, attempts: 0 });
      let polls = 0;
      const poll = async () => {
        try {
          const job = await api.job(queued.jobId);
          setReportJob({ ...job, projectId: requestedProjectId });
          if (job.status === "completed" || job.status === "failed") {
            setBusy(false);
            if (activeId === requestedProjectId) await refresh();
            return;
          }
          polls++;
          if (polls >= 60) {
            setBusy(false);
            setReportJob({ ...job, projectId: requestedProjectId, monitoringStopped: true });
            return;
          }
          setTimeout(poll, 1500);
        } catch (err) {
          setBusy(false);
          setReportJob(previous => ({ ...previous, monitoringStopped: true, last_error: err.message }));
        }
      };
      setTimeout(poll, 1000);
    } catch (err) {
      setBusy(false);
      setReportJob({ status: "submission_failed", projectId: requestedProjectId, last_error: err.message });
      showError(err);
    }
  }

  const displayOwner = project?.owner?.trim() || currentUser?.full_name || "Team";
  const userInitials = (currentUser?.full_name || displayOwner).split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const ownerInitials = (displayOwner || "T").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();

  // 1. Initial auth check loading screen (prevents flashing protected content)
  if (authLoading) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <h2>TeamFlow</h2>
        <p>Checking workspace authentication…</p>
      </div>
    );
  }

  // 2. Unauthenticated visitors: strictly redirect to Login or Signup
  if (!currentUser) {
    if (route === "/signup") {
      return <Signup onAuthSuccess={handleAuthSuccess} navigate={navigate} />;
    }
    return <Login onAuthSuccess={handleAuthSuccess} navigate={navigate} />;
  }

  return (
    <div className="app-shell">
      {/* ====================================================================== */}
      {/* 1. SIDEBAR                                                             */}
      {/* ====================================================================== */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <TeamFlowMark size={18} />
          </div>
          <div className="brand-text">
            <strong>TeamFlow</strong>
            <small>AGILE WORKSPACE</small>
          </div>
        </div>

        <div className="side-label">NAVIGATION</div>
        <button type="button" className="nav-item active">
          <span className="nav-icon"><IconProject size={17} /></span>
          <span>Projects</span>
          <span className="nav-count">{projects.length}</span>
        </button>
        <button type="button" className="nav-item" onClick={() => setModal({ type: "activity" })}>
          <span className="nav-icon"><IconActivity size={17} /></span>
          <span>Activity</span>
        </button>

        <div className="side-divider" />

        <div className="side-row">
          <span className="side-label">YOUR PROJECTS</span>
          <button
            type="button"
            className="tiny-plus"
            title="Create new project"
            aria-label="Create new project"
            onClick={() => setModal({ type: "project" })}
          >
            <IconPlus size={14} />
          </button>
        </div>

        <div className="project-nav">
          {projects.length === 0 ? (
            <div className="project-nav-empty">No projects yet</div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                type="button"
                className={`project-link ${p.id === activeId ? "selected" : ""}`}
                onClick={() => setActiveId(p.id)}
              >
                <i className={`project-dot ${p.id === activeId ? "active" : ""}`} />
                <span className="project-name">{p.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="sidebar-profile">
          <button
            type="button"
            className="sidebar-bottom profile-trigger"
            aria-expanded={profileMenuOpen}
            aria-label="Open user profile menu"
            onClick={() => setProfileMenuOpen(open => !open)}
          >
            <span className="avatar profile-avatar">{userInitials}</span>
            <span className="profile-details">
              <strong>{currentUser.full_name}</strong>
              <small>{currentUser.email}</small>
            </span>
            <span className="more" aria-hidden="true">•••</span>
          </button>

          {profileMenuOpen && (
            <div className="profile-menu" role="group" aria-label="User actions">
              <div className="profile-menu-user-info">
                <strong>{currentUser.full_name}</strong>
                <small>{currentUser.email}</small>
              </div>
              <button type="button" onClick={() => { setProfileMenuOpen(false); setModal({ type: "ownerDetails" }); }}>
                <IconUser size={14} /> Workspace Profile
              </button>
              <button type="button" disabled={!project} onClick={() => { setProfileMenuOpen(false); setModal({ type: "editProject" }); }}>
                <IconEdit size={14} /> Edit Active Project
              </button>
              <div className="menu-divider" />
              <button type="button" className="danger-btn" onClick={() => { setProfileMenuOpen(false); handleLogout(); }}>
                <IconLogout size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ====================================================================== */}
      {/* 2. MAIN CONTENT AREA                                                   */}
      {/* ====================================================================== */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span className="crumb-root">Workspace</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-segment">Projects</span>
            {project && (
              <>
                <span className="crumb-sep">/</span>
                <span className="crumb-active">{project.name}</span>
              </>
            )}
          </div>

          <div className="top-actions">
            <div className="sync-status" title="Your workspace data is saved in real-time">
              <span className="online-dot" />
              <span>All changes saved</span>
            </div>
            <button
              type="button"
              className="topbar-logout-btn"
              onClick={handleLogout}
              title={`Signed in as ${currentUser.email}`}
            >
              <IconLogout size={13} />
              <span>Log out</span>
            </button>
            <div className="avatar small topbar-avatar">{userInitials}</div>
          </div>
        </header>

        {initialLoading ? (
          <section className="empty-state loading-state" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <h1>Loading workspace...</h1>
            <p>Fetching your projects, stories and tasks.</p>
          </section>
        ) : !project ? (
          <section className="empty-state">
            <div className="empty-icon">
              <IconProject size={28} />
            </div>
            <h1>Start with a project</h1>
            <p>Create a project to organize user stories and tasks for your team.</p>
            <button type="button" className="primary-btn" onClick={() => setModal({ type: "project" })}>
              <IconPlus size={16} /> New project
            </button>
          </section>
        ) : (
          <div className="content">
            {/* Project Overview Header */}
            <div className="project-heading">
              <div className="project-info">
                <div className="eyebrow">
                  <span>PROJECT OVERVIEW</span>
                  <span className={`status-pill status-${project.status}`}>{pretty(project.status)}</span>
                </div>
                <h1 className="project-title">{project.name}</h1>
                <p className="project-desc">{project.description || "Keep your team aligned and work moving forward with agile execution."}</p>
                <div className="owner-line">
                  <div className="avatar mini">{(project.owner || "T").split(" ").map(x => x[0]).join("").slice(0, 2)}</div>
                  <span>Owned by <b>{project.owner || "Team"}</b></span>
                  <span className="meta-dot">·</span>
                  <span>Updated {formatTimestamp(project.updated_at)}</span>
                </div>
              </div>

              <div className="heading-actions">
                <button type="button" className="secondary-btn" onClick={() => setModal({ type: "editProject" })}>
                  <IconEdit size={14} /> Edit project
                </button>
                <button type="button" className="secondary-btn danger-hover" onClick={deleteProject}>
                  <IconTrash size={14} /> Delete
                </button>
                <button type="button" className="secondary-btn" onClick={generateReport} disabled={busy}>
                  <IconSparkles size={14} /> {busy ? "Generating…" : "Generate report"}
                </button>
                <button type="button" className="primary-btn prominent" onClick={() => setModal({ type: "story" })}>
                  <IconPlus size={15} /> Add user story
                </button>
              </div>
            </div>

            {/* Background Report Feedback Component */}
            {reportJob?.projectId === activeId && (
              <section className={`report-job-panel status-${reportJob.status}`} role="status" aria-live="polite">
                <div className="report-job-header">
                  <div className="report-status-badge">
                    <span className="report-dot" />
                    <strong>{reportJob.monitoringStopped ? "Monitoring paused" : pretty(reportJob.status)}</strong>
                  </div>
                  <div className="report-job-meta">
                    {reportJob.id && <span className="job-tag">Job #{reportJob.id}</span>}
                    {reportJob.attempts > 0 && <span className="attempt-tag">Attempt {reportJob.attempts}/3</span>}
                  </div>
                </div>

                <div className="report-job-body">
                  {reportJob.status === "completed" && (
                    <p className="report-msg success">
                      <IconCheck size={14} /> Report generated successfully. Check Recent Activity below for delivery metrics.
                    </p>
                  )}
                  {reportJob.status === "failed" && (
                    <p className="report-msg error">
                      <IconClose size={14} /> Report generation failed after max retries: {reportJob.last_error || "Please try again."}
                    </p>
                  )}
                  {reportJob.status === "submission_failed" && (
                    <p className="report-msg error">
                      <IconClose size={14} /> Could not queue report: {reportJob.last_error}
                    </p>
                  )}
                  {reportJob.monitoringStopped && (
                    <p className="report-msg warning">
                      <IconClock size={14} /> The background job is still processing in the queue. You can check its status anytime.
                    </p>
                  )}
                  {!["completed", "failed", "submission_failed"].includes(reportJob.status) && !reportJob.monitoringStopped && (
                    <p className="report-msg pending">
                      <span className="micro-spinner" /> Compiling stories, velocity, and task completion metrics in the background...
                    </p>
                  )}
                </div>

                {reportJob.id && !busy && (
                  <div className="report-job-actions">
                    <button
                      type="button"
                      className="secondary-btn mini-btn"
                      onClick={async () => {
                        try {
                          const job = await api.job(reportJob.id);
                          setReportJob({ ...job, projectId: activeId });
                          if (job.status === "completed") await refresh();
                        } catch (err) {
                          showError(err);
                        }
                      }}
                    >
                      Check Job Status
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">USER STORIES</span>
                  <div className="stat-icon-wrap stat-icon-stories">
                    <IconBook size={16} />
                  </div>
                </div>
                <div className="stat-number">{project.stories.length}</div>
                <div className="stat-subtext">Across this project</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">TOTAL TASKS</span>
                  <div className="stat-icon-wrap stat-icon-tasks">
                    <IconCheckSquare size={16} />
                  </div>
                </div>
                <div className="stat-number">{allTasks.length}</div>
                <div className="stat-subtext">{doneTasks} completed</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">COMPLETION</span>
                  <div className="stat-icon-wrap stat-icon-completion">
                    <IconTrendingUp size={16} />
                  </div>
                </div>
                <div className="stat-number">
                  {percent}<span className="percent">%</span>
                </div>
                <div className="progress">
                  <i style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">IN PROGRESS</span>
                  <div className="stat-icon-wrap stat-icon-inprogress">
                    <IconHourglass size={16} />
                  </div>
                </div>
                <div className="stat-number">{allTasks.filter(t => t.status === "in_progress").length}</div>
                <div className="stat-subtext">Tasks being worked on</div>
              </div>
            </div>

            {/* Work Breakdown: Stories & Tasks */}
            <section className="work-section">
              <div className="section-head">
                <div>
                  <h2>Work breakdown</h2>
                  <p>Organize delivery from user stories down to individual tasks.</p>
                </div>
                <button type="button" className="text-btn" onClick={() => setModal({ type: "story" })}>
                  <IconPlus size={14} /> New story
                </button>
              </div>

              <div className="toolbar">
                <div className="search-box">
                  <span className="search-icon"><IconSearch size={15} /></span>
                  <input
                    placeholder="Search stories, tasks, assignees..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button type="button" className="clear-search-btn" onClick={() => setSearch("")} aria-label="Clear search">
                      <IconClose size={12} />
                    </button>
                  )}
                </div>

                <div className="filter-wrap">
                  <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter stories by status">
                    <option value="all">All story statuses</option>
                    {storyStates.map(s => <option value={s} key={s}>{pretty(s)}</option>)}
                  </select>
                </div>

                <span className="result-count">{visibleStories.length} {visibleStories.length === 1 ? "story" : "stories"}</span>
              </div>

              <div className="story-list">
                {visibleStories.length === 0 ? (
                  project.stories.length === 0 ? (
                    <div className="list-empty genuine-empty">
                      <div className="empty-subicon empty-subicon-primary">
                        <IconBook size={20} />
                      </div>
                      <strong>No user stories yet</strong>
                      <p>Start organizing your work by adding the first user story to this project.</p>
                      <button type="button" className="primary-btn mini-btn" onClick={() => setModal({ type: "story" })}>
                        <IconPlus size={13} /> Add user story
                      </button>
                    </div>
                  ) : (
                    <div className="list-empty filter-empty">
                      <div className="empty-subicon">
                        <IconSearch size={20} />
                      </div>
                      <strong>No matching stories found</strong>
                      <p>{search ? `No stories match "${search}".` : "No stories match the selected status filter."}</p>
                      {(search || filter !== "all") && (
                        <button type="button" className="secondary-btn mini-btn" onClick={() => { setSearch(""); setFilter("all"); }}>
                          Reset filters
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  visibleStories.map((story, index) => (
                    <article className="story-card" key={story.id}>
                      <div className="story-top">
                        <div className="story-title-wrap">
                          <span className="story-index">{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <h3>{story.title}</h3>
                            <p>{story.description || "No description added."}</p>
                          </div>
                        </div>

                        <div className="story-actions">
                          <span className={`priority-badge priority-${story.priority}`}>{pretty(story.priority)}</span>
                          <select
                            aria-label={`Status for story "${story.title}"`}
                            className={`status-pill-select status-${story.status}`}
                            value={story.status}
                            onChange={e => updateStory(story.id, { status: e.target.value })}
                          >
                            {storyStates.map(s => <option key={s} value={s}>{pretty(s)}</option>)}
                          </select>
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="Edit story"
                            aria-label={`Edit story "${story.title}"`}
                            onClick={() => setModal({ type: "editStory", story })}
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn delete-story-btn"
                            title="Delete story"
                            aria-label={`Delete story "${story.title}"`}
                            onClick={() => deleteStory(story)}
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="story-meta">
                        <span className="meta-pill"><IconUser size={13} /> {story.assignee || "Unassigned"}</span>
                        <span className="meta-pill"><IconCheckSquare size={13} /> {story.tasks.length} {story.tasks.length === 1 ? "task" : "tasks"}</span>
                        {story.acceptance_criteria ? (
                          <button
                            type="button"
                            className={`criteria-pill ${expandedCriteria[story.id] ? "expanded" : ""}`}
                            aria-expanded={!!expandedCriteria[story.id]}
                            aria-label={`Toggle acceptance criteria for "${story.title}"`}
                            onClick={() => toggleCriteria(story.id)}
                          >
                            <span className="criteria-check"><IconCheck size={11} /></span>
                            <span>Acceptance criteria</span>
                            <span className="caret">{expandedCriteria[story.id] ? "▲" : "▼"}</span>
                          </button>
                        ) : (
                          <span className="criteria-none">No acceptance criteria</span>
                        )}
                      </div>

                      {expandedCriteria[story.id] && story.acceptance_criteria && (
                        <div className="story-criteria-box" role="region" aria-label={`Acceptance criteria for "${story.title}"`}>
                          <div className="criteria-head">
                            <strong>ACCEPTANCE CRITERIA</strong>
                            <button type="button" className="text-btn mini" onClick={() => setModal({ type: "editStory", story })}>
                              <IconEdit size={12} /> Edit
                            </button>
                          </div>
                          <div className="criteria-content">{story.acceptance_criteria}</div>
                        </div>
                      )}

                      <div className="tasks-wrap">
                        {story.tasks.map(task => {
                          const dueMeta = getDueDateMeta(task.due_date, task.status);
                          const isUpdating = !!updatingTasks[task.id];
                          return (
                            <div className={`task-row ${task.status === "done" ? "is-done" : ""}`} key={task.id}>
                              <button
                                type="button"
                                className={`task-check ${task.status} ${isUpdating ? "updating" : ""}`}
                                role="checkbox"
                                aria-checked={task.status === "done"}
                                aria-disabled={isUpdating}
                                disabled={isUpdating}
                                aria-label={`Mark task "${task.title}" as ${task.status === "done" ? "incomplete" : "complete"}`}
                                onClick={() => updateTask(task.id, { status: task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done" })}
                              >
                                {isUpdating ? (
                                  <span className="micro-spinner" />
                                ) : task.status === "done" ? (
                                  <IconCheck size={11} />
                                ) : task.status === "in_progress" ? (
                                  <span className="in-progress-dot" />
                                ) : null}
                              </button>

                              <div className="task-content">
                                <span className={`task-name ${task.status === "done" ? "completed" : ""}`}>{task.title}</span>
                                {task.description && <p className="task-desc">{task.description}</p>}
                              </div>

                              <div className="task-meta">
                                <span className={`due-badge ${dueMeta.type}`} title={task.due_date ? `Due date: ${task.due_date}` : "No due date set"}>
                                  <IconClock size={11} /> {dueMeta.label}
                                </span>
                                <span className="task-assignee" title={`Assignee: ${task.assignee || "Unassigned"}`}>
                                  {task.assignee || "Unassigned"}
                                </span>
                              </div>

                              <div className="task-actions">
                                <select
                                  aria-label={`Status for task "${task.title}"`}
                                  className={`task-status ${task.status}`}
                                  value={task.status}
                                  disabled={isUpdating}
                                  onChange={e => updateTask(task.id, { status: e.target.value })}
                                >
                                  {taskStates.map(s => <option key={s} value={s}>{pretty(s)}</option>)}
                                </select>
                                <button
                                  type="button"
                                  className="icon-action-btn"
                                  title="Edit task"
                                  aria-label={`Edit task "${task.title}"`}
                                  onClick={() => setModal({ type: "editTask", task })}
                                >
                                  <IconEdit size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="delete-task"
                                  title="Delete task"
                                  aria-label={`Delete task "${task.title}"`}
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <IconClose size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          className="add-task"
                          onClick={() => setModal({ type: "task", storyId: story.id })}
                        >
                          <IconPlus size={13} /> Add task
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            {/* Activity Section */}
            <section className="activity-section">
              <div className="section-head">
                <div>
                  <h2>Recent activity</h2>
                  <p>Latest updates across this project.</p>
                </div>
                <button type="button" className="text-btn" onClick={() => setModal({ type: "activity" })}>
                  View all
                </button>
              </div>

              <div className="activity-card">
                {activity.slice(0, 4).map(item => (
                  <div className="activity-row" key={item.id}>
                    <div className="activity-icon">
                      <IconActivity size={14} />
                    </div>
                    <div>
                      <p>{item.message}</p>
                      <small>{formatTimestamp(item.created_at, true)}</small>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && <p className="muted">No activity yet recorded.</p>}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="toast" role="status" aria-live="polite" aria-atomic="true">
          <span className="toast-icon"><IconCheck size={14} /></span>
          <span>{toast}</span>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 3. MODALS & DIALOGS                                                    */}
      {/* ====================================================================== */}
      {modal?.type === "ownerDetails" && (
        <Modal title="Workspace Profile" onClose={() => setModal(null)}>
          <div className="owner-details">
            <div className="avatar large">{ownerInitials}</div>
            <div>
              <strong>{displayOwner}</strong>
              <p>{project ? `Owner of ${project.name}` : "Workspace User"}</p>
              <small className="user-email-tag">{currentUser.email}</small>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={() => setModal(null)}>Close</button>
            <button type="button" className="primary-btn" disabled={!project} onClick={() => setModal({ type: "editProject" })}>
              <IconEdit size={14} /> Edit project details
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === "project" && (
        <Modal title="Create a new project" onClose={() => setModal(null)}>
          <form onSubmit={createProject} className="form">
            <label>
              Project name <span className="field-required">*</span>
              <input name="name" required minLength="2" maxLength="100" placeholder="e.g. Mobile app redesign" autoFocus />
            </label>
            <label>
              Description
              <textarea name="description" rows="3" placeholder="What are the key goals and deliverables of this initiative?" />
            </label>
            <label>
              Project owner
              <input name="owner" placeholder="e.g. Product Manager name" defaultValue={currentUser.full_name} />
            </label>
            <div className="form-actions">
              <button type="button" className="secondary-btn" disabled={formSubmitting} onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" disabled={formSubmitting}>{formSubmitting ? "Creating…" : "Create project"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "editProject" && project && (
        <Modal title="Edit project" onClose={() => setModal(null)}>
          <form onSubmit={editProject} className="form">
            <label>
              Project name <span className="field-required">*</span>
              <input name="name" required minLength="2" maxLength="100" defaultValue={project.name} />
            </label>
            <label>
              Description
              <textarea name="description" rows="3" defaultValue={project.description || ""} />
            </label>
            <label>
              Project owner
              <input name="owner" defaultValue={project.owner || ""} />
            </label>
            <label>
              Status
              <select name="status" defaultValue={project.status}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="button" className="secondary-btn" disabled={formSubmitting} onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" type="submit" disabled={formSubmitting}>{formSubmitting ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "story" && (
        <Modal title="Add a user story" onClose={() => setModal(null)}>
          <form onSubmit={createStory} className="form">
            <label>
              Story title <span className="field-required">*</span>
              <input name="title" required minLength="2" placeholder="As a user, I want to..." autoFocus />
            </label>
            <label>
              Description
              <textarea name="description" rows="2" placeholder="Describe the user need and business value." />
            </label>
            <label>
              Acceptance criteria
              <textarea name="criteria" rows="2" placeholder="What conditions must be satisfied for this story to be considered done?" />
            </label>
            <div className="form-grid">
              <label>
                Priority
                <select name="priority" defaultValue="medium">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label>
                Assignee
                <input name="assignee" placeholder="Team member" />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-btn" disabled={formSubmitting} onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" disabled={formSubmitting}>{formSubmitting ? "Adding…" : "Add story"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "task" && (
        <Modal title="Add a task" onClose={() => setModal(null)}>
          <form onSubmit={createTask} className="form">
            <label>
              Task title <span className="field-required">*</span>
              <input name="title" required minLength="2" placeholder="What needs to be done?" autoFocus />
            </label>
            <div className="form-grid">
              <label>
                Assignee
                <input name="assignee" placeholder="Team member" />
              </label>
              <label>
                Due date
                <input name="dueDate" type="date" />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-btn" disabled={formSubmitting} onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" disabled={formSubmitting}>{formSubmitting ? "Adding…" : "Add task"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "editStory" && (
        <Modal title="Edit user story" onClose={() => setModal(null)}>
          <form onSubmit={editStory} className="form">
            <label>
              Story title <span className="field-required">*</span>
              <input name="title" required minLength="2" maxLength="160" defaultValue={modal.story.title} />
            </label>
            <label>
              Description
              <textarea name="description" rows="2" defaultValue={modal.story.description || ""} />
            </label>
            <label>
              Acceptance criteria
              <textarea name="criteria" rows="2" defaultValue={modal.story.acceptance_criteria || ""} />
            </label>
            <div className="form-grid">
              <label>
                Priority
                <select name="priority" defaultValue={modal.story.priority}>
                  {["low", "medium", "high", "critical"].map(p => <option key={p} value={p}>{pretty(p)}</option>)}
                </select>
              </label>
              <label>
                Status
                <select name="status" defaultValue={modal.story.status}>
                  {storyStates.map(st => <option key={st} value={st}>{pretty(st)}</option>)}
                </select>
              </label>
            </div>
            <label>
              Assignee
              <input name="assignee" defaultValue={modal.story.assignee || ""} />
            </label>
            <div className="form-actions">
              <button type="button" className="secondary-btn" disabled={formSubmitting} onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" disabled={formSubmitting}>{formSubmitting ? "Saving…" : "Save story"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "editTask" && (
        <Modal title="Edit task" onClose={() => setModal(null)}>
          <form onSubmit={editTask} className="form">
            <label>
              Task title <span className="field-required">*</span>
              <input name="title" required minLength="2" maxLength="160" defaultValue={modal.task.title} />
            </label>
            <label>
              Description
              <textarea name="description" rows="2" defaultValue={modal.task.description || ""} />
            </label>
            <div className="form-grid">
              <label>
                Status
                <select name="status" defaultValue={modal.task.status}>
                  {taskStates.map(st => <option key={st} value={st}>{pretty(st)}</option>)}
                </select>
              </label>
              <label>
                Assignee
                <input name="assignee" defaultValue={modal.task.assignee || ""} />
              </label>
              <label>
                Due date
                <input name="dueDate" type="date" defaultValue={modal.task.due_date || ""} />
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="secondary-btn" disabled={formSubmitting} onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" disabled={formSubmitting}>{formSubmitting ? "Saving…" : "Save task"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === "activity" && (
        <Modal title="Project activity history" onClose={() => setModal(null)}>
          <div className="activity-modal">
            {activity.map(item => (
              <div className="activity-row" key={item.id}>
                <div className="activity-icon">
                  <IconActivity size={14} />
                </div>
                <div>
                  <p>{item.message}</p>
                  <small>{formatTimestamp(item.created_at, true)}</small>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p className="muted">No activity records found.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App;
