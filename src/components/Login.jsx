import { useState } from "react";
import { AuthLayout } from "./AuthLayout";
import { ForgotPasswordModal } from "./AuthModals";
import { api } from "../api";

export function Login({ navigate, onAuthSuccess }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);

  function validate(fields = formData) {
    const nextErrors = {};

    if (!fields.email || !fields.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      nextErrors.email = "Please enter a valid email address (e.g. name@company.com).";
    }

    if (!fields.password) {
      nextErrors.password = "Password is required.";
    } else if (fields.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    return nextErrors;
  }

  function handleBlur(field) {
    setTouched(prev => ({ ...prev, [field]: true }));
    const currentErrors = validate();
    setErrors(currentErrors);
  }

  function handleChange(field, value) {
    const nextData = { ...formData, [field]: value };
    setFormData(nextData);
    setApiError("");

    if (touched[field]) {
      const fieldErrors = validate(nextData);
      setErrors(prev => ({
        ...prev,
        [field]: fieldErrors[field]
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched({ email: true, password: true });
    const currentErrors = validate();
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      const data = await api.login({
        email: formData.email.trim(),
        password: formData.password
      });

      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }
      navigate("/");
    } catch (err) {
      setApiError(err.message || "Failed to sign in. Please verify your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout navigate={navigate} activeTab="login">
      <div className="auth-card">
        <div className="auth-card-head">
          <h2>Welcome back</h2>
          <p>Sign in to continue managing your projects.</p>
        </div>

        {apiError && (
          <div className="auth-error-banner" role="alert" aria-live="polite">
            <span className="auth-error-icon" aria-hidden="true">⚠</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email input */}
          <div className="auth-field-group">
            <label htmlFor="login-email">
              <span>Work email</span>
              <span className="field-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.email && touched.email ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={e => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                disabled={isSubmitting}
                aria-invalid={!!(errors.email && touched.email)}
                aria-describedby={errors.email && touched.email ? "email-error" : undefined}
                required
              />
            </div>
            {errors.email && touched.email && (
              <span id="email-error" className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠</span> {errors.email}
              </span>
            )}
          </div>

          {/* Password input */}
          <div className="auth-field-group">
            <div className="field-label-row">
              <label htmlFor="login-password">
                <span>Password</span>
                <span className="field-required">*</span>
              </label>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => setShowForgotModal(true)}
              >
                Forgot password?
              </button>
            </div>
            <div className={`auth-input-wrapper ${errors.password && touched.password ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your account password"
                value={formData.password}
                onChange={e => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                disabled={isSubmitting}
                aria-invalid={!!(errors.password && touched.password)}
                aria-describedby={errors.password && touched.password ? "password-error" : undefined}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
            {errors.password && touched.password && (
              <span id="password-error" className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠</span> {errors.password}
              </span>
            )}
          </div>

          {/* Remember me option */}
          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={e => handleChange("rememberMe", e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="checkbox-custom" aria-hidden="true" />
              <span>Remember this device for 30 days</span>
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Switch to Signup */}
        <div className="auth-card-footer">
          <span>Don&apos;t have an account yet?</span>
          <button
            type="button"
            className="auth-inline-link"
            onClick={() => navigate("/signup")}
          >
            Create an account
          </button>
        </div>
      </div>

      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </AuthLayout>
  );
}
