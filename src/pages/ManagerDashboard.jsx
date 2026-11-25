import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSession,
  clearSession,
  getRequests,
  saveRequests,
  getUsers,
  saveUsers,
  getExpenses,
  saveExpenses,
} from "../storage";
import "./ManagerDashboard.css";

const COMPANY_LIMIT = 30000;
const EMPLOYEE_LIMIT = 1000;

const DEFAULT_ALLOCATIONS = {
  Meals: 5000,
  Travel: 6000,
  "Hotel / Stay": 5000,
  "Office Supplies": 4000,
  "Client Meeting": 4000,
  "Software / Tools": 4000,
  Other: 2000,
};

function ManagerDashboard() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    const session = getSession();
    return session && session.role === "manager" ? session : null;
  });

  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState(DEFAULT_ALLOCATIONS);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Popups
  const [viewBill, setViewBill] = useState(null);
  const [rejectBill, setRejectBill] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Load users, registration requests, and bills from JSONBin
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let ignore = false;
    Promise.all([getUsers(), getRequests(), getExpenses()])
      .then(([allUsers, reqs, exps]) => {
        if (!ignore) {
          setUsers(allUsers);
          setRequests(reqs);
          setExpenses(exps);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user, navigate]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const [allUsers, reqs, exps] = await Promise.all([
        getUsers(),
        getRequests(),
        getExpenses(),
      ]);
      setUsers(allUsers);
      setRequests(reqs);
      setExpenses(exps);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  // --- USER REGISTRATION ACTIONS ---
  async function handleApproveUser(request) {
    const latestUsers = await getUsers();
    const updatedUsers = [...latestUsers, request];
    await saveUsers(updatedUsers);
    setUsers(updatedUsers);

    const latestRequests = await getRequests();
    const updatedRequests = latestRequests.filter((r) => r.id !== request.id);
    await saveRequests(updatedRequests);
    setRequests(updatedRequests);
  }

  async function handleRejectUser(requestId) {
    const latestRequests = await getRequests();
    const updatedRequests = latestRequests.filter((r) => r.id !== requestId);
    await saveRequests(updatedRequests);
    setRequests(updatedRequests);
  }

  // --- EXPENSE BILL ACTIONS ---
  async function handleApproveBill(billId) {
    const latestExpenses = await getExpenses();
    const updated = latestExpenses.map((bill) =>
      bill.id === billId
        ? {
            ...bill,
            status: "approved",
            rejectReason: "",
            reviewedBy: user.fullName,
            reviewedAt: new Date().toLocaleDateString(),
          }
        : bill
    );
    await saveExpenses(updated);
    setExpenses(updated);
  }

  function openRejectPopup(bill) {
    setRejectBill(bill);
    setRejectReason("");
    setRejectError("");
  }

  async function handleConfirmReject(e) {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError("Please write a reason before rejecting.");
      return;
    }

    const latestExpenses = await getExpenses();
    const updated = latestExpenses.map((bill) =>
      bill.id === rejectBill.id
        ? {
            ...bill,
            status: "rejected",
            rejectReason: rejectReason.trim(),
            reviewedBy: user.fullName,
            reviewedAt: new Date().toLocaleDateString(),
          }
        : bill
    );

    await saveExpenses(updated);
    setExpenses(updated);
    setRejectBill(null);
    setRejectReason("");
    setRejectError("");
  }

  function changeAllocation(category, delta) {
    setAllocations((prev) => {
      const current = prev[category] || 2000;
      const next = Math.max(500, current + delta);
      return { ...prev, [category]: next };
    });
  }

  // --- CALCULATIONS ---
  // Pending bills: oldest date first
  const pendingBills = expenses
    .filter((b) => b.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date));

  const approvedBills = expenses.filter((b) => b.status === "approved");

  // Reviewed history: newest date first
  const historyBills = expenses
    .filter((b) => {
      if (historyFilter === "all") return b.status !== "pending";
      return b.status === historyFilter;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const givenAmount = approvedBills.reduce(
    (sum, bill) => sum + Number(bill.amount),
    0
  );
  const remainingAmount = Math.max(0, COMPANY_LIMIT - givenAmount);

  const allCategories = Array.from(
    new Set([
      ...Object.keys(allocations),
      ...approvedBills.map((b) => b.reason),
    ])
  );

  // Calculate how much each employee has used (approved bills)
  const employeeUsage = users
    .filter((u) => u.role === "employee")
    .map((emp) => {
      const empBills = approvedBills.filter(
        (bill) => String(bill.employeeId) === String(emp.id)
      );
      const usedAmount = empBills.reduce(
        (sum, bill) => sum + Number(bill.amount),
        0
      );
      const remaining = Math.max(0, EMPLOYEE_LIMIT - usedAmount);
      const percent = Math.round((usedAmount / EMPLOYEE_LIMIT) * 100);

      return {
        id: emp.id,
        fullName: emp.fullName,
        username: emp.username,
        usedAmount,
        remaining,
        percent,
        billCount: empBills.length,
      };
    })
    .sort((a, b) => b.usedAmount - a.usedAmount);

  if (!user) return null;

  return (
    <div>
      <header className="header">
        <div className="brand">FinPulse</div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={handleRefresh}>
            {loading ? "Syncing..." : "Refresh"}
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="mgr-container">
        <div className="mgr-welcome">
          <h2>{user.fullName}</h2>
          <p>@{user.username} • Manager Dashboard</p>
        </div>

        {/* Company Budget Summary Cards */}
        <div className="mgr-stats-grid">
          <div className="mgr-stat-card">
            <div className="mgr-stat-label">Company Limit for Employees</div>
            <div className="mgr-stat-value mgr-limit">
              ${COMPANY_LIMIT.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="mgr-stat-card">
            <div className="mgr-stat-label">Given to Employees (Approved)</div>
            <div className="mgr-stat-value mgr-given">
              ${givenAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="mgr-stat-card">
            <div className="mgr-stat-label">Remaining Company Limit</div>
            <div className="mgr-stat-value mgr-remaining">
              ${remainingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Row 2: Pending Bills + Registered User Requests */}
        <div className="mgr-two-col">
          <section className="mgr-panel">
            <div className="mgr-panel-header">
              <div>
                <h3>Pending Expense Bills ({pendingBills.length})</h3>
                <p className="mgr-panel-sub">
                  Review employee bills and approve or reject with a reason
                </p>
              </div>
            </div>

            {loading ? (
              <p style={{ color: "#94a3b8", padding: "12px 0" }}>
                Loading bills from cloud...
              </p>
            ) : pendingBills.length === 0 ? (
              <p style={{ color: "#94a3b8", padding: "12px 0" }}>
                All caught up! No pending bills waiting.
              </p>
            ) : (
              pendingBills.map((bill) => (
                <div key={bill.id} className="mgr-bill-row">
                  <div className="mgr-bill-info">
                    <div className="mgr-bill-title">{bill.merchant}</div>
                    <div className="mgr-bill-meta">
                      {bill.employeeName}{" "}
                      <span className="mgr-bill-user">
                        @{bill.employeeUsername || "employee"}
                      </span>{" "}
                      • {bill.reason} • {bill.date}
                    </div>
                  </div>

                  <div className="mgr-actions">
                    <span className="mgr-bill-amount">
                      ${Number(bill.amount).toFixed(2)}
                    </span>
                    <button
                      className="btn btn-view"
                      onClick={() => setViewBill(bill)}
                    >
                      View Bill
                    </button>
                    <button
                      className="btn btn-approve"
                      onClick={() => handleApproveBill(bill.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => openRejectPopup(bill)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="mgr-panel">
            <div className="mgr-panel-header">
              <div>
                <h3>User Registration Requests ({requests.length})</h3>
                <p className="mgr-panel-sub">
                  Approve or reject new account signups
                </p>
              </div>
            </div>

            {loading ? (
              <p style={{ color: "#94a3b8", padding: "12px 0" }}>
                Loading requests...
              </p>
            ) : requests.length === 0 ? (
              <p style={{ color: "#94a3b8", padding: "12px 0" }}>
                No pending registration requests.
              </p>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="mgr-user-row">
                  <div>
                    <strong>{req.fullName}</strong>
                    <span className="badge">{req.role}</span>
                    <div className="mgr-bill-meta">@{req.username}</div>
                  </div>

                  <div className="mgr-actions">
                    <button
                      className="btn btn-approve"
                      onClick={() => handleApproveUser(req)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => handleRejectUser(req.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Row 3: Spending Breakdown by Category */}
        <section className="mgr-usage-section">
          <div className="mgr-panel-header">
            <div>
              <h3>SPENDING ALLOWANCES BY CATEGORY</h3>
              <p className="mgr-panel-sub">
                Track where the approved employee amount is getting used
              </p>
            </div>
            <span className="mgr-tag">Manager Console</span>
          </div>

          <div className="mgr-usage-grid">
            {allCategories.map((category) => {
              const catBills = approvedBills.filter((b) => b.reason === category);
              const spent = catBills.reduce((s, b) => s + Number(b.amount), 0);
              const allocated = allocations[category] || 2000;
              const percent = Math.round((spent / allocated) * 100);
              const barWidth = Math.min(100, percent);

              return (
                <div key={category} className="mgr-usage-card">
                  <div className="mgr-usage-top">
                    <div className="mgr-usage-name">
                      {category}
                      <span className="mgr-usage-code">
                        ({catBills.length} bills)
                      </span>
                    </div>

                    <div className="mgr-adjust-group">
                      <button
                        className="mgr-adjust-btn"
                        onClick={() => changeAllocation(category, 500)}
                      >
                        +$500
                      </button>
                      <button
                        className="mgr-adjust-btn"
                        onClick={() => changeAllocation(category, -500)}
                      >
                        -$500
                      </button>
                    </div>
                  </div>

                  <div className="mgr-progress-track">
                    <div
                      className={`mgr-progress-fill ${percent >= 80 ? "high" : ""}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="mgr-usage-bottom">
                    <span>
                      Spent: ${spent.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({percent}%)
                    </span>
                    <span>
                      Allocated: ${allocated.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Row 4: Approved & Rejected Bills History */}
        <section className="mgr-panel">
          <div className="mgr-panel-header">
            <div>
              <h3>Approved & Rejected Bills ({historyBills.length})</h3>
              <p className="mgr-panel-sub">
                All bills already reviewed by the manager
              </p>
            </div>

            <select
              className="mgr-history-filter"
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
            >
              <option value="all">All Reviewed</option>
              <option value="approved">Approved Only</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>

          {historyBills.length === 0 ? (
            <p style={{ color: "#94a3b8", padding: "12px 0" }}>
              No approved or rejected bills yet.
            </p>
          ) : (
            historyBills.map((bill) => (
              <div key={bill.id} className="mgr-history-row">
                <div>
                  <div className="mgr-col-label">Merchant & User</div>
                  <div className="mgr-bill-title">{bill.merchant}</div>
                  <div className="mgr-bill-meta">
                    {bill.employeeName} (@{bill.employeeUsername || "employee"})
                  </div>
                </div>

                <div>
                  <div className="mgr-col-label">Category & Date</div>
                  <div>{bill.reason}</div>
                  <div className="mgr-bill-meta">{bill.date}</div>
                </div>

                <div>
                  <div className="mgr-col-label">Purpose / Note</div>
                  <div style={{ fontSize: "14px", color: "#cbd5e1" }}>
                    {bill.purpose}
                  </div>
                  {bill.status === "rejected" && bill.rejectReason && (
                    <div className="mgr-reject-note">
                      Reject Reason: {bill.rejectReason}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mgr-col-label">Amount</div>
                  <strong>${Number(bill.amount).toFixed(2)}</strong>
                </div>

                <div>
                  <div className="mgr-col-label">Status</div>
                  <span className={`mgr-status-badge mgr-status-${bill.status}`}>
                    {bill.status}
                  </span>
                </div>

                <div>
                  <button
                    className="btn btn-view"
                    onClick={() => setViewBill(bill)}
                  >
                    View Bill
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Row 5 (Bottom): Employee Spending Summary */}
        <section className="mgr-panel mgr-emp-section">
          <div className="mgr-panel-header">
            <div>
              <h3>Employee Spending Summary ({employeeUsage.length})</h3>
              <p className="mgr-panel-sub">
                Total approved amount used by each employee out of their $
                {EMPLOYEE_LIMIT.toLocaleString("en-US")} limit
              </p>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#94a3b8", padding: "12px 0" }}>
              Loading employees...
            </p>
          ) : employeeUsage.length === 0 ? (
            <p style={{ color: "#94a3b8", padding: "12px 0" }}>
              No employees found.
            </p>
          ) : (
            employeeUsage.map((emp) => (
              <div key={emp.id} className="mgr-emp-row">
                <div>
                  <div className="mgr-col-label">Employee Name</div>
                  <div className="mgr-bill-title">{emp.fullName}</div>
                  <div className="mgr-bill-meta">
                    <span className="mgr-bill-user">@{emp.username}</span>
                  </div>
                </div>

                <div>
                  <div className="mgr-col-label">Approved Bills</div>
                  <div>{emp.billCount} bills</div>
                </div>

                <div>
                  <div className="mgr-col-label">Amount Used</div>
                  <div className="mgr-emp-used">
                    ${emp.usedAmount.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="mgr-col-label">Remaining Limit</div>
                  <div className="mgr-emp-rem">
                    ${emp.remaining.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="mgr-col-label">Limit Used ({emp.percent}%)</div>
                  <div className="mgr-progress-track">
                    <div
                      className={`mgr-progress-fill ${
                        emp.percent >= 80 ? "high" : ""
                      }`}
                      style={{ width: `${Math.min(100, emp.percent)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* POPUP 1: View Bill Photo + All Bill Details */}
      {viewBill && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal">
            <h3>Bill Receipt & Details</h3>

            {viewBill.receipt ? (
              <img
                src={viewBill.receipt}
                alt={`Receipt from ${viewBill.merchant}`}
                className="mgr-receipt-full"
              />
            ) : (
              <p style={{ color: "#94a3b8", marginBottom: "16px" }}>
                No receipt photo attached.
              </p>
            )}

            <div className="mgr-detail-grid">
              <div>
                <div className="mgr-col-label">Employee</div>
                <div>
                  {viewBill.employeeName} (@{viewBill.employeeUsername || "employee"})
                </div>
              </div>
              <div>
                <div className="mgr-col-label">Merchant / Brand</div>
                <div>{viewBill.merchant}</div>
              </div>
              <div>
                <div className="mgr-col-label">Category / Reason</div>
                <div>{viewBill.reason}</div>
              </div>
              <div>
                <div className="mgr-col-label">Date</div>
                <div>{viewBill.date}</div>
              </div>
              <div>
                <div className="mgr-col-label">Amount</div>
                <strong>${Number(viewBill.amount).toFixed(2)}</strong>
              </div>
              <div>
                <div className="mgr-col-label">Status</div>
                <span style={{ textTransform: "capitalize" }}>{viewBill.status}</span>
              </div>
              <div className="mgr-detail-full">
                <div className="mgr-col-label">Purpose</div>
                <div>{viewBill.purpose}</div>
              </div>
              {viewBill.rejectReason && (
                <div className="mgr-detail-full">
                  <div className="mgr-col-label">Rejection Reason</div>
                  <div style={{ color: "#f87171" }}>{viewBill.rejectReason}</div>
                </div>
              )}
            </div>

            <div className="mgr-modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setViewBill(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: Reject Bill Reason */}
      {rejectBill && (
        <div className="mgr-modal-overlay">
          <form className="mgr-modal" onSubmit={handleConfirmReject}>
            <h3>Reject Expense Bill</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "14px" }}>
              Rejecting <strong>{rejectBill.merchant}</strong> ($
              {Number(rejectBill.amount).toFixed(2)}) submitted by{" "}
              {rejectBill.employeeName}
            </p>

            {rejectError && <p className="error-msg">{rejectError}</p>}

            <div className="form-group">
              <label>Reason for Rejection (Required)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tell the employee what to fix, e.g., Receipt is blurry"
                required
              />
            </div>

            <div className="mgr-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRejectBill(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-reject">
                Confirm Reject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;