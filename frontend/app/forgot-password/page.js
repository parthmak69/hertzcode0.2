"use strict";
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return <div style={styles.wrapper}>
      <div style={styles.right}>

       
        <div style={styles.logoFloat}>
          <img src="/logo.png" alt="Hertzcoder Logo" style={{ height: "68px", objectFit: "contain" }} />
          <div style={styles.logoSub} />
        </div>

        {
    /* Card */
  }
        <div style={styles.card}>

          {!success ? <>
              <h2 style={styles.heading}>Reset your password</h2>
              <p style={styles.subheading}>Enter your email and choose a new password.</p>

              {error && <div style={styles.errorBox}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 7 }} />{error}
                </div>}

              <form onSubmit={handleSubmit} style={{ width: "100%" }}>

                {
    /* Email */
  }
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email Address</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <i className="fa-solid fa-envelope" style={{ color: "#94a3b8", fontSize: 13 }} />
                    </span>
                    <input
    type="email"
    placeholder="Enter your email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    style={styles.input}
    autoComplete="email"
  />
                  </div>
                </div>

                
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>New Password</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <i className="fa-solid fa-lock" style={{ color: "#94a3b8", fontSize: 13 }} />
                    </span>
                    <input
    type={showNew ? "text" : "password"}
    placeholder="••••••••"
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    style={{ ...styles.input, paddingRight: 44 }}
  />
                    <button
    type="button"
    onClick={() => setShowNew(!showNew)}
    style={styles.eyeBtn}
    aria-label={showNew ? "Hide password" : "Show password"}
  >
                      <i className={`fa-solid ${showNew ? "fa-eye-slash" : "fa-eye"}`} style={{ color: "#94a3b8", fontSize: 14 }} />
                    </button>
                  </div>
                </div>

                {
    /* Confirm Password */
  }
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Confirm Password</label>
                  <div style={styles.inputWrap}>
                    <span style={styles.inputIcon}>
                      <i className="fa-solid fa-lock" style={{ color: "#94a3b8", fontSize: 13 }} />
                    </span>
                    <input
    type={showConfirm ? "text" : "password"}
    placeholder="••••••••"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    style={{ ...styles.input, paddingRight: 44 }}
  />
                    <button
    type="button"
    onClick={() => setShowConfirm(!showConfirm)}
    style={styles.eyeBtn}
    aria-label={showConfirm ? "Hide password" : "Show password"}
  >
                      <i className={`fa-solid ${showConfirm ? "fa-eye-slash" : "fa-eye"}`} style={{ color: "#94a3b8", fontSize: 14 }} />
                    </button>
                  </div>
                </div>

                {
    /* Submit */
  }
                <button
    type="submit"
    disabled={loading}
    style={{
      ...styles.submitBtn,
      opacity: loading ? 0.8 : 1,
      cursor: loading ? "not-allowed" : "pointer"
    }}
  >
                  {loading ? <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <span style={styles.spinner} /> Updating...
                    </span> : "Update Password \u2192"}
                </button>

              </form>

              {
    /* Back to login */
  }
              <p style={{ marginTop: 20, fontSize: 13, color: "#64748b" }}>
                Remember your password?{" "}
                <span
    onClick={() => router.push("/")}
    style={styles.backLink}
  >
                  Back to Sign In
                </span>
              </p>
            </> : (
    /* Success */
    <div style={styles.successBox}>
              <div style={styles.successIcon}>
                <i className="fa-solid fa-check" style={{ fontSize: 24, color: "#16a34a" }} />
              </div>
              <h2 style={styles.successTitle}>Password Updated!</h2>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                Your password has been reset successfully.
              </p>
              <button
      onClick={() => router.push("/")}
      style={{ ...styles.submitBtn, cursor: "pointer" }}
    >
                Go to Sign In →
              </button>
            </div>
  )}

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>secured by HertzSoft</span>
            <div style={styles.dividerLine} />
          </div>

          <p style={styles.footer}>
            © {(/* @__PURE__ */ new Date()).getFullYear()} Hertzsoft Technologies Pvt. Ltd. · Mumbai
          </p>

        </div>
      </div>
    </div>;
}
const styles = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', sans-serif"
  },
  right: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f9ff",
    padding: "40px 24px"
  },
  logoFloat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 20
  },
  logoSub: {
    fontSize: 13,
    color: "#0369a1",
    fontWeight: 700,
    marginTop: 6,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  card: {
    background: "#fff",
    borderRadius: 18,
    padding: "40px 40px 32px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 8px 40px rgba(14,165,233,0.10)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  heading: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 6,
    alignSelf: "flex-start"
  },
  subheading: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 24,
    alignSelf: "flex-start"
  },
  errorBox: {
    width: "100%",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    border: "1px solid #fca5a5"
  },
  fieldGroup: { width: "100%", marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.3
  },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: {
    position: "absolute",
    left: 12,
    fontSize: 14,
    pointerEvents: "none"
  },
  input: {
    width: "100%",
    padding: "11px 12px 11px 38px",
    border: "1.5px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    transition: "border-color .15s, box-shadow .15s",
    background: "#fafbfd"
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #38bdf8, #0284c7)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.3,
    transition: "all .15s",
    boxShadow: "0 4px 16px rgba(14,165,233,0.25)"
  },
  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite"
  },
  backLink: {
    color: "#0ea5e9",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none"
  },
  successBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    width: "100%",
    gap: 12,
    padding: "16px 0"
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#dcfce7",
    border: "2px solid #4ade80",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
    margin: 0
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    margin: "24px 0 16px"
  },
  dividerLine: { flex: 1, height: 1, background: "#e2e8f0" },
  dividerText: { fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" },
  footer: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center"
  }
};
