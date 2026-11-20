import React from "react";

export function AuthLayout({ children, navigate, activeTab = "login" }) {
  return (
    <div className="auth-page-root">
      {/* Background ambient lighting gradients */}
      <div className="auth-ambient-orb auth-ambient-orb-1" aria-hidden="true" />
      <div className="auth-ambient-orb auth-ambient-orb-2" aria-hidden="true" />
      <div className="auth-ambient-orb auth-ambient-orb-3" aria-hidden="true" />

      {/* Top navigation bar */}
      <header className="auth-topbar">
        <div className="auth-brand" aria-label="TeamFlow">
          <div className="brand-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 6.5h10M8.5 6.5v12" />
              <path d="M14 9.5h6.5M15 9.5v8.5M15 14h4.5" />
            </svg>
          </div>
          <div>
            <strong>TeamFlow</strong>
            <small>AGILE PLATFORM</small>
          </div>
        </div>
      </header>

      {/* Main split viewport container */}
      <main className="auth-container">
        {/* Left column: Form card */}
        <section className="auth-form-column">
          <div className="auth-card-wrapper">
            {/* Quick tab switcher pill */}
            <div className="auth-tab-pill" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "login"}
                className={`auth-tab-btn ${activeTab === "login" ? "active" : ""}`}
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "signup"}
                className={`auth-tab-btn ${activeTab === "signup" ? "active" : ""}`}
                onClick={() => navigate("/signup")}
              >
                Create Account
              </button>
            </div>

            {children}
          </div>

          <footer className="auth-footer">
            <span>© {new Date().getFullYear()} TeamFlow Technologies Inc.</span>
            <div className="auth-footer-links">
              <span>Security</span>
              <span>·</span>
              <span>Privacy</span>
              <span>·</span>
              <span>System Status</span>
            </div>
          </footer>
        </section>

        {/* Right column: Modern SaaS Feature Showcase */}
        <aside className="auth-showcase-column" aria-label="TeamFlow product preview">
          <div className="showcase-content">
            <div className="showcase-badge">
              <span className="badge-spark" aria-hidden="true">✦</span>
              <span>AGILE WORKSPACE 2.0</span>
            </div>

            <h1 className="showcase-headline">
              Deliver high-impact projects with precision and velocity.
            </h1>

            <p className="showcase-subhead">
              The modern project workspace engineered for high-performing teams.
              Break down complex initiatives into clear user stories, track task
              progress in real-time, and ship faster.
            </p>

            {/* Simulated Live Workspace Mini Preview Card */}
            <div className="showcase-mockup">
              <div className="mockup-header">
                <div className="mockup-project">
                  <span className="mockup-dot" />
                  <strong>Website Redesign</strong>
                  <span className="status-pill active">Active</span>
                </div>
                <div className="mockup-progress-tag">87% Done</div>
              </div>

              <div className="mockup-progress-bar">
                <div className="mockup-progress-fill" style={{ width: "87%" }} />
              </div>

              <div className="mockup-stories">
                <div className="mockup-story-item">
                  <div className="mockup-story-info">
                    <span className="mockup-check">✓</span>
                    <span className="mockup-story-title">Create a responsive landing page</span>
                  </div>
                  <span className="priority high">High</span>
                </div>

                <div className="mockup-story-item">
                  <div className="mockup-story-info">
                    <span className="mockup-check pending">◷</span>
                    <span className="mockup-story-title">Simplify account onboarding flow</span>
                  </div>
                  <span className="priority medium">Medium</span>
                </div>
              </div>

              <div className="mockup-footer">
                <div className="mockup-avatars">
                  <span className="avatar mini" title="Alex Morgan">AM</span>
                  <span className="avatar mini" style={{ background: "#e0f2fe", color: "#0369a1" }} title="Jamie Lee">JL</span>
                  <span className="avatar mini" style={{ background: "#fef3c7", color: "#b45309" }} title="Sam Patel">SP</span>
                </div>
                <div className="mockup-pulse-status">
                  <span className="online-dot" />
                  <span>Real-time sync active</span>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="showcase-features">
              <div className="showcase-feature-item">
                <div className="feature-icon">☷</div>
                <div>
                  <strong>Sprint Tracking</strong>
                  <p>Organize user stories with clear acceptance criteria.</p>
                </div>
              </div>

              <div className="showcase-feature-item">
                <div className="feature-icon">↗</div>
                <div>
                  <strong>Automated Reports</strong>
                  <p>Background asynchronous jobs generate executive summaries.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
