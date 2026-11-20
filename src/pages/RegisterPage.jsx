import { useState } from "react";
import { Link } from "react-router-dom";
import { getUsers, getRequests, saveRequests } from "../storage";

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const users = await getUsers();
      const requests = await getRequests();

      const existsInUsers = users.some(
        (u) => u.username.toLowerCase() === cleanUsername
      );
      const existsInRequests = requests.some(
        (r) => r.username.toLowerCase() === cleanUsername
      );

      if (existsInUsers || existsInRequests) {
        setError("Username already exists or is pending approval.");
        setLoading(false);
        return;
      }

      const newRequest = {
        id: Date.now(),
        fullName: fullName.trim(),
        username: cleanUsername,
        password: password,
        role: role,
      };

      await saveRequests([...requests, newRequest]);
      setSuccess("Request sent! Wait for a Manager to approve your account.");

      setFullName("");
      setUsername("");
      setPassword("");
      setRole("employee");
    } catch {
      setError("Failed to send request. Check your JSONBin settings.");
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
        <form className="form-card" onSubmit={handleSubmit}>
          <h2>Register</h2>

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary full-width"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Registration"}
          </button>

          <p className="switch-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;