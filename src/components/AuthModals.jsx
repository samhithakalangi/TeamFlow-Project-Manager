import { useState } from "react";

export function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubmitted(true);
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pw-title"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal auth-dialog">
        <div className="modal-head">
          <h2 id="forgot-pw-title">Reset password</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="form">
            <p className="auth-dialog-desc">
              Enter your registered work email address. We will verify your account against the workspace directory.
            </p>
            <label htmlFor="reset-email">
              Work email address
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoFocus
              />
            </label>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={!email}>
                Send reset link
              </button>
            </div>
          </form>
        ) : (
          <div className="auth-dialog-result">
            <div className="auth-callout-icon" aria-hidden="true">ℹ</div>
            <div>
              <h3>Backend Mailer Notice</h3>
              <p>
                In this preview environment, backend email delivery and identity recovery services
                (<code>/api/auth/reset-password</code>) are awaiting provisioning.
              </p>
              <p className="muted" style={{ marginTop: "8px" }}>
                For access recovery, please reach out directly to your TeamFlow workspace administrator.
              </p>
            </div>
            <div className="form-actions" style={{ marginTop: "16px", width: "100%" }}>
              <button type="button" className="primary" onClick={onClose} style={{ width: "100%" }}>
                Understood
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TermsModal({ onClose, onAccept }) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal auth-dialog auth-dialog-terms">
        <div className="modal-head">
          <h2 id="terms-title">TeamFlow Terms & Privacy Policy</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="terms-body">
          <section>
            <h4>1. Agile Workspace & Data Privacy</h4>
            <p>
              TeamFlow provides project management, sprint tracking, and team collaboration
              tools. All user stories, tasks, and activity logs remain the exclusive intellectual
              property of your workspace organization.
            </p>
          </section>

          <section>
            <h4>2. Account Security & Responsibilities</h4>
            <p>
              Users are responsible for maintaining the confidentiality of their credentials.
              Passwords must adhere to organizational complexity guidelines (minimum 8 characters,
              alphanumeric with casing).
            </p>
          </section>

          <section>
            <h4>3. Service Availability & Telemetry</h4>
            <p>
              TeamFlow prioritizes maximum uptime and data integrity. System telemetry and error
              logging are utilized strictly for reliability diagnostics and performance optimization.
            </p>
          </section>

          <section>
            <h4>4. Enterprise Governance</h4>
            <p>
              Workspace administrators maintain permission boundaries and can reassign tasks,
              manage story pipelines, and configure reporting intervals.
            </p>
          </section>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
          {onAccept && (
            <button
              type="button"
              className="primary"
              onClick={() => {
                onAccept();
                onClose();
              }}
            >
              Accept & Agree
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
