import { useState } from "react";
import { AuthLayout } from "./AuthLayout";
import { TermsModal } from "./AuthModals";
import { api } from "../api";

export function Signup({ navigate, onAuthSuccess }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Compute password strength metrics
  const password = formData.password;
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthScore = [hasMinLength, hasUpperCase, hasNumberOrSymbol].filter(Boolean).length;
  const strengthLabel = strengthScore === 0 ? "Too weak" : strengthScore === 1 ? "Weak" : strengthScore === 2 ? "Good" : "Strong";
  const strengthColorClass = strengthScore === 1 ? "strength-weak" : strengthScore === 2 ? "strength-good" : strengthScore === 3 ? "strength-strong" : "";

  function validate(fields = formData) {
    const nextErrors = {};

    if (!fields.fullName || !fields.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    } else if (fields.fullName.trim().length < 2) {
      nextErrors.fullName = "Full name must be at least 2 characters.";
    }

    if (!fields.email || !fields.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      nextErrors.email = "Please enter a valid work email address.";
    }

    if (!fields.password) {
      nextErrors.password = "Password is required.";
    } else if (fields.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    } else if (!hasUpperCase || !hasNumberOrSymbol) {
      nextErrors.password = "Password must include an uppercase letter and a number or symbol.";
    }

    if (!fields.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (fields.confirmPassword !== fields.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (!fields.agreeTerms) {
      nextErrors.agreeTerms = "You must agree to the Terms of Service to continue.";
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

    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreeTerms: true
    });

    const currentErrors = validate();
    setErrors(currentErrors);

    if (Object.keys(currentErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setApiError("");

    try {
      const data = await api.signup({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim()
      });

      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }
      navigate("/");
    } catch (err) {
      setApiError(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout navigate={navigate} activeTab="signup">
      <div className="auth-card">
        <div className="auth-card-head">
          <h2>Create your account</h2>
          <p>Start organizing your team&apos;s work with TeamFlow.</p>
        </div>

        {apiError && (
          <div className="auth-error-banner" role="alert" aria-live="polite">
            <span className="auth-error-icon" aria-hidden="true">⚠</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Full Name */}
          <div className="auth-field-group">
            <label htmlFor="signup-name">
              <span>Full name</span>
              <span className="field-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.fullName && touched.fullName ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">👤</span>
              <input
                id="signup-name"
                type="text"
                name="fullName"
                autoComplete="name"
                placeholder="e.g. Alex Morgan"
                value={formData.fullName}
                onChange={e => handleChange("fullName", e.target.value)}
                onBlur={() => handleBlur("fullName")}
                disabled={isSubmitting}
                aria-invalid={!!(errors.fullName && touched.fullName)}
                aria-describedby={errors.fullName && touched.fullName ? "name-error" : undefined}
                required
              />
            </div>
            {errors.fullName && touched.fullName && (
              <span id="name-error" className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠</span> {errors.fullName}
              </span>
            )}
          </div>

          {/* Work Email */}
          <div className="auth-field-group">
            <label htmlFor="signup-email">
              <span>Work email</span>
              <span className="field-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.email && touched.email ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="signup-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="alex@company.com"
                value={formData.email}
                onChange={e => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                disabled={isSubmitting}
                aria-invalid={!!(errors.email && touched.email)}
                aria-describedby={errors.email && touched.email ? "signup-email-error" : undefined}
                required
              />
            </div>
            {errors.email && touched.email && (
              <span id="signup-email-error" className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠</span> {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="auth-field-group">
            <label htmlFor="signup-password">
              <span>Password</span>
              <span className="field-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.password && touched.password ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={e => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                disabled={isSubmitting}
                aria-invalid={!!(errors.password && touched.password)}
                aria-describedby="password-rules"
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

            {/* Dynamic Password Strength Guidance */}
            {password.length > 0 && (
              <div className="password-strength-widget" id="password-rules">
                <div className="strength-meter-bar">
                  <div className={`strength-segment ${strengthScore >= 1 ? strengthColorClass : ""}`} />
                  <div className={`strength-segment ${strengthScore >= 2 ? strengthColorClass : ""}`} />
                  <div className={`strength-segment ${strengthScore >= 3 ? strengthColorClass : ""}`} />
                </div>
                <div className="strength-meta-row">
                  <span className="strength-label">
                    Strength: <b>{strengthLabel}</b>
                  </span>
                </div>
                <ul className="strength-checklist" aria-label="Password requirements">
                  <li className={hasMinLength ? "check-pass" : "check-todo"}>
                    <span className="check-icon">{hasMinLength ? "✓" : "○"}</span>
                    <span>At least 8 characters</span>
                  </li>
                  <li className={hasUpperCase ? "check-pass" : "check-todo"}>
                    <span className="check-icon">{hasUpperCase ? "✓" : "○"}</span>
                    <span>Contains uppercase letter</span>
                  </li>
                  <li className={hasNumberOrSymbol ? "check-pass" : "check-todo"}>
                    <span className="check-icon">{hasNumberOrSymbol ? "✓" : "○"}</span>
                    <span>Contains number or special symbol</span>
                  </li>
                </ul>
              </div>
            )}

            {errors.password && touched.password && (
              <span className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠</span> {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-field-group">
            <label htmlFor="signup-confirm-password">
              <span>Confirm password</span>
              <span className="field-required">*</span>
            </label>
            <div className={`auth-input-wrapper ${errors.confirmPassword && touched.confirmPassword ? "has-error" : ""}`}>
              <span className="input-icon" aria-hidden="true">🔒</span>
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={e => handleChange("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                disabled={isSubmitting}
                aria-invalid={!!(errors.confirmPassword && touched.confirmPassword)}
                aria-describedby={errors.confirmPassword && touched.confirmPassword ? "confirm-error" : undefined}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                tabIndex={0}
              >
                {showConfirmPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
            {errors.confirmPassword && touched.confirmPassword && (
              <span id="confirm-error" className="field-error-msg" role="alert">
                <span aria-hidden="true">⚠</span> {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={e => handleChange("agreeTerms", e.target.checked)}
                disabled={isSubmitting}
              />
              <span className="checkbox-custom" aria-hidden="true" />
              <span>
                I agree to the{" "}
                <button
                  type="button"
                  className="auth-link-text"
                  onClick={e => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                >
                  Terms of Service
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  className="auth-link-text"
                  onClick={e => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                >
                  Privacy Policy
                </button>
              </span>
            </label>
          </div>
          {errors.agreeTerms && touched.agreeTerms && (
            <span className="field-error-msg" role="alert">
              <span aria-hidden="true">⚠</span> {errors.agreeTerms}
            </span>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="primary auth-submit-btn"
            disabled={isSubmitting || !formData.agreeTerms}
          >
            {isSubmitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span>Creating account…</span>
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="auth-card-footer">
          <span>Already have an account?</span>
          <button
            type="button"
            className="auth-inline-link"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>
        </div>
      </div>

      {showTermsModal && (
        <TermsModal
          onClose={() => setShowTermsModal(false)}
          onAccept={() => handleChange("agreeTerms", true)}
        />
      )}
    </AuthLayout>
  );
}
