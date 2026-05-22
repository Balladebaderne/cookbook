import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const returnTo = location.state?.from || "/recipes";
  const isRegister = mode === "register";

  const set = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({
          email: form.email,
          password: form.password,
        });
      }
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
      setSaving(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link to="/" className="logo auth-logo">
          ✦ Cookbook
        </Link>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={`auth-tab${!isRegister ? " active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Log ind
          </button>
          <button
            type="button"
            className={`auth-tab${isRegister ? " active" : ""}`}
            onClick={() => { setMode("register"); setError(""); }}
          >
            Opret bruger
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Navn</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={event => set("name", event.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={event => set("email", event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={event => set("password", event.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn-primary auth-submit" type="submit" disabled={saving}>
            {saving ? "Gemmer..." : isRegister ? "Opret bruger" : "Log ind"}
          </button>
        </form>
      </section>
    </main>
  );
}
