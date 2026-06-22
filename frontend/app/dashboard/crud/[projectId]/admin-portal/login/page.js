"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
export default function PortalLoginPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const [project, setProject] = useState(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("crudProjects");
    if (stored) {
      try {
        const projs = JSON.parse(stored);
        const found = projs.find((p) => p.id === projectId);
        if (found) {
          setProject(found);
        }
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, [projectId]);
  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      if (username === "admin" && password === "admin123") {
        sessionStorage.setItem(`portal_logged_in_${projectId}`, "true");
        router.push(`/dashboard/crud/${projectId}/admin-portal/dashboard`);
      } else {
        setError("Invalid username or password. Use default credentials: admin / admin123");
        setLoading(false);
      }
    }, 600);
  };
  if (!project) {
    return <div style={styles.loading}>Loading Branded Portal...</div>;
  }
  return <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <h2 style={styles.title}>{project.name}</h2>
          <p style={styles.subtitle}>Administrative Portal Login</p>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    style={styles.input}
    required
  />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    style={styles.input}
    required
  />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Authenticating..." : "Sign In \u2794"}
          </button>
        </form>

        <div style={styles.footer}>
          <p>This is a custom-branded Next.js admin interface.</p>
          <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
            Powered by Hertzcoder Schema Manager
          </p>
        </div>
      </div>
    </div>;
}
const styles = {
  loading: {
    padding: "40px",
    color: "#64748b",
    textAlign: "center",
    fontSize: "15px",
    fontWeight: "bold",
    fontFamily: "system-ui, sans-serif"
  },
  wrapper: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    fontFamily: "system-ui, sans-serif",
    padding: "20px",
    zIndex: 9999,
    overflowY: "auto"
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    padding: "40px 32px 32px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    border: "1px solid #334155"
  },
  logoArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "30px"
  },
  logoCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    backgroundColor: "#3b82f6",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "14px",
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)"
  },
  title: {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#f8fafc",
    margin: 0
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "4px 0 0 0"
  },
  errorBox: {
    backgroundColor: "#rgba(239, 68, 68, 0.15)",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    padding: "10px 12px",
    borderRadius: "6px",
    fontSize: "12.5px",
    marginBottom: "20px",
    textAlign: "center"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  input: {
    padding: "10px 12px",
    backgroundColor: "#0f172a",
    border: "1px solid #475569",
    borderRadius: "8px",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s"
  },
  button: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "10px",
    transition: "background-color 0.15s"
  },
  footer: {
    marginTop: "32px",
    borderTop: "1px solid #334155",
    paddingTop: "20px",
    textAlign: "center",
    fontSize: "12px",
    color: "#64748b"
  }
};
