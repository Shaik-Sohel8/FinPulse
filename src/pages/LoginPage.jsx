import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUsers, getRequests, saveSession } from "../storage";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleLogin(e) {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim().toLowerCase();
    const users = getUsers();
    const matchedUser = users.find(
      (u) => u.username === cleanUsername && u.password === password
    );

    if (matchedUser) {
      saveSession(matchedUser);

      if (matchedUser.role === "employee") {
        navigate("/employee-dashboard");
      } else if (matchedUser.role === "manager") {
        navigate("/manager-dashboard");
      } else if (matchedUser.role === "auditor") {
        navigate("/auditor-dashboard");
      }
      return;
    }

    // Check if the user is still waiting for Manager approval
    const requests = getRequests();
    const isPending = requests.some((r) => r.username === cleanUsername);

    if (isPending) {
      setError("Your registration is still pending Manager approval.");
    } else {
      setError("Invalid username or password.");
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
            <label htmlFor="user">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              id="user"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              id="password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary full-width">
            Login
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