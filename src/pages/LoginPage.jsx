import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUsers, getRequests, saveSession } from "../storage";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const users = await getUsers();

      const matchedUser = users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername &&
          String(u.password) === password
      );

      if (matchedUser) {
        saveSession(matchedUser);

        if (matchedUser.role === "employee") {
          navigate("/employee-dashboard", { replace: true });
        } else if (matchedUser.role === "manager") {
          navigate("/manager-dashboard", { replace: true });
        } else if (matchedUser.role === "auditor") {
          navigate("/auditor-dashboard", { replace: true });
        }
        return;
      }

      const requests = await getRequests();
      const isPending = requests.some(
        (r) => r.username.toLowerCase() === cleanUsername
      );

      if (isPending) {
        setError("Your registration is still pending Manager approval.");
      } else {
        setError("Invalid username or password.");
      }
    } catch {
      setError("Network error. Check your JSONBin ID and API Key.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="header">
        <Link to="/" className="brand">FinPulse</Link>
      </header>

      <div className="form-wrapper">
        <form className="form-card" onSubmit={handleLogin}>
          <h2>Login</h2>

          {error && <p className="error-msg">{error}</p>}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="switch-link">
            New user? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;