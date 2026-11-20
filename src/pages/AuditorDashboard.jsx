import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../storage";

function AuditorDashboard() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    const session = getSession();
    return session && session.role === "auditor" ? session : null;
  });

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  if (!user) return null;

  return (
    <div>
      <header className="header">
        <div className="brand">FinPulse</div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard-container">
        <h2>Auditor Dashboard</h2>
        <p style={{ color: "#94a3b8", marginTop: "6px" }}>
          Welcome, {user.fullName}
        </p>

        <div className="card">
          <h3>Read-Only Ledger</h3>
          <p style={{ color: "#94a3b8", marginTop: "10px" }}>
            All company expenses and category totals will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}

export default AuditorDashboard;