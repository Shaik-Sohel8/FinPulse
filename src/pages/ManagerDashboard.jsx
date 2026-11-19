import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSession,
  clearSession,
  getRequests,
  saveRequests,
  getUsers,
  saveUsers,
} from "../storage";

function ManagerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "manager") {
      navigate("/login");
      return;
    }
    setUser(session);
    setRequests(getRequests());
  }, [navigate]);

  function handleApprove(request) {
    // 1. Add user to approved users list
    const users = getUsers();
    saveUsers([...users, request]);

    // 2. Remove from pending requests
    const updatedRequests = requests.filter((r) => r.id !== request.id);
    saveRequests(updatedRequests);
    setRequests(updatedRequests);
  }

  function handleReject(requestId) {
    const updatedRequests = requests.filter((r) => r.id !== requestId);
    saveRequests(updatedRequests);
    setRequests(updatedRequests);
  }

  function handleLogout() {
    clearSession();
    navigate("/");
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
        <h2>Manager Dashboard</h2>
        <p style={{ color: "#94a3b8", marginTop: "6px" }}>
          Welcome, {user.fullName}
        </p>

        <div className="card">
          <h3>Pending Registration Requests ({requests.length})</h3>

          {requests.length === 0 ? (
            <p style={{ color: "#94a3b8", marginTop: "14px" }}>
              No pending requests right now.
            </p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="request-item">
                <div>
                  <strong>{req.fullName}</strong>
                  <span className="badge">{req.role}</span>
                  <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                    Username: @{req.username}
                  </div>
                </div>

                <div className="btn-group">
                  <button
                    className="btn btn-approve"
                    onClick={() => handleApprove(req)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => handleReject(req.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default ManagerDashboard;