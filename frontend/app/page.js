"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./context/ToastContext";
export default function LoginPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoSrc, setLogoSrc] = useState("/logo.png");
  const [rememberMe, setRememberMe] = useState(false);
  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) {
      router.push("/dashboard");
    }
  }, [router]);
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    if (savedRememberMe && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);
  useEffect(() => {
    const img = new window.Image();
    img.src = "/logo.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setLogoSrc(canvas.toDataURL());
      }
    };
  }, []);
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, pass_hash: password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberMe");
        }
        localStorage.setItem("currentUser", data.username || email);
        localStorage.setItem("currentUserName", data.name || "");
        showToast("Logged in successfully! Welcome back.", "success");
        router.push("/dashboard");
      } else {
        setError(data.error || "Invalid email or password.");
        showToast(data.error || "Invalid email or password.", "error");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };
  return <div style={styles.wrapper}>
      <div style={styles.right}>

        {
    /* Logo floats ABOVE the card */
  }
        <div style={styles.logoFloat}>
          <img src={logoSrc} alt="Hertzcoder Logo" style={{ height: "68px", objectFit: "contain" }} />
          <div style={styles.logoSub}>Admin Panel</div>
        </div>

        {
    /* Login Card */
  }
        <div style={styles.card}>
          <h2 style={styles.heading}>Sign in to your account</h2>
          <p style={styles.subheading} />

          {error && <div style={styles.errorBox}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 7 }} />{error}
            </div>}

          <form onSubmit={handleLogin} style={{ width: "100%" }}>
            {
    /* Username */
  }
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Username</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><i className="fa-solid fa-user" style={{ color: "#94a3b8", fontSize: 13 }} /></span>
                <input
    type="text"
    placeholder="Enter your username"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    style={styles.input}
    autoComplete="username"
  />
              </div>
            </div>

            {
    /* Password */
  }
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><i className="fa-solid fa-lock" style={{ color: "#94a3b8", fontSize: 13 }} /></span>
                <input
    type={showPass ? "text" : "password"}
    placeholder="••••••••"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    style={{ ...styles.input, paddingRight: 44 }}
    autoComplete="current-password"
  />
                <button
    type="button"
    onClick={() => setShowPass(!showPass)}
    style={styles.eyeBtn}
    aria-label={showPass ? "Hide password" : "Show password"}
  >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"}`} style={{ color: "#94a3b8", fontSize: 14 }} />
                </button>
              </div>
            </div>

            {
    /* Remember + Forgot */
  }
            <div style={styles.row}>
              <label style={styles.rememberLabel}>
                <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
    style={{ accentColor: "#0ea5e9", marginRight: 6 }}
  />
                Remember me
              </label>
              <a onClick={() => router.push("/forgot-password")} style={styles.forgotLink}>Forgot password?</a>
            </div>

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
                  <span style={styles.spinner} /> Signing in...
                </span> : "Sign In \u2192"}
            </button>
          </form>

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
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%"
  },
  rememberLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    color: "#475569",
    cursor: "pointer"
  },
  forgotLink: {
    fontSize: 13,
    color: "#0ea5e9",
    textDecoration: "none",
    fontWeight: 600
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
