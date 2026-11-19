import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSession,
  clearSession,
  getExpenses,
  saveExpenses,
} from "../storage";
import "./EmployeeDashboard.css";

const LIMIT_AMOUNT = 1000;

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bills, setBills] = useState([]);

  // Filter states
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  const [statusFilter, setStatusFilter] = useState("all");

  // Popup modal states
  const [showModal, setShowModal] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [reason, setReason] = useState("Meals");
  const [customReason, setCustomReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [receipt, setReceipt] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "employee") {
      navigate("/login");
      return;
    }
    setUser(session);

    const allExpenses = getExpenses();
    const myBills = allExpenses.filter((item) => item.employeeId === session.id);
    setBills(myBills);
  }, [navigate]);

  function handleLogout() {
    clearSession();
    navigate("/");
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setFormError("Receipt file must be under 1 MB.");
      setReceipt("");
      return;
    }

    setFormError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceipt(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // Calculate Used (Approved) and Remaining amounts
  const approvedAmount = bills
    .filter((bill) => bill.status === "approved")
    .reduce((sum, bill) => sum + Number(bill.amount), 0);

  const remainingAmount = Math.max(0, LIMIT_AMOUNT - approvedAmount);

  // Apply Time and Status filters
  const filteredBills = bills.filter((bill) => {
    const matchesStatus =
      statusFilter === "all" || bill.status === statusFilter;

    let matchesTime = true;
    if (timeFilter === "monthly") {
      matchesTime = bill.date.startsWith(selectedMonth);
    } else if (timeFilter === "yearly") {
      matchesTime = bill.date.startsWith(selectedYear);
    }

    return matchesStatus && matchesTime;
  });

  function handleAddClaim(e) {
    e.preventDefault();
    setFormError("");

    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (!finalReason) {
      setFormError("Please enter your custom reason.");
      return;
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
      setFormError("Amount must be greater than $0.");
      return;
    }

    if (numAmount > remainingAmount) {
      setFormError(
        `Amount cannot exceed your remaining limit ($${remainingAmount.toFixed(2)}).`
      );
      return;
    }

    if (!receipt) {
      setFormError("Please upload a receipt file.");
      return;
    }

    const newBill = {
      id: Date.now(),
      employeeId: user.id,
      employeeName: user.fullName,
      employeeUsername: user.username,
      merchant: merchant.trim(),
      reason: finalReason,
      date: date,
      amount: numAmount,
      purpose: purpose.trim(),
      receipt: receipt,
      status: "pending",
      rejectReason: "",
    };

    const allExpenses = getExpenses();
    saveExpenses([newBill, ...allExpenses]);
    setBills([newBill, ...bills]);

    // Reset form and close popup
    setMerchant("");
    setReason("Meals");
    setCustomReason("");
    setDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setPurpose("");
    setReceipt("");
    setShowModal(false);
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
        {/* Employee Name */}
        <div className="emp-welcome">
          <h2>Welcome,  {user.fullName}</h2>
          <p>@{user.username} • Employee Expense Dashboard</p>
        </div>

        {/* Limit, Used (Approved), and Remaining Cards */}
        <div className="emp-stats-grid">
          <div className="emp-stat-card">
            <div className="emp-stat-label">Expense Limit</div>
            <div className="emp-stat-value emp-limit">
              ${LIMIT_AMOUNT.toFixed(2)}
            </div>
          </div>

          <div className="emp-stat-card">
            <div className="emp-stat-label">Used Amount (Approved)</div>
            <div className="emp-stat-value emp-used">
              ${approvedAmount.toFixed(2)}
            </div>
          </div>

          <div className="emp-stat-card">
            <div className="emp-stat-label">Remaining Limit</div>
            <div className="emp-stat-value emp-remaining">
              ${remainingAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Bills List Card */}
        <div className="card">
          <div className="emp-filter-bar">
            <div className="emp-filters">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {timeFilter === "monthly" && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              )}

              {timeFilter === "yearly" && (
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ width: "100px" }}
                />
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="emp-total-count">
              Total Bills Passed: {bills.length} (Showing: {filteredBills.length})
            </div>
          </div>

          {/* Horizontal Bills List */}
          {filteredBills.length === 0 ? (
            <p style={{ color: "#94a3b8", padding: "16px 0" }}>
              No bills found for the selected filter.
            </p>
          ) : (
            filteredBills.map((bill) => (
              <div key={bill.id} className="emp-bill-item">
                {/* Column 1: Receipt Thumbnail */}
                <div>
                  {bill.receipt && (
                    <img
                      src={bill.receipt}
                      alt={`Receipt from ${bill.merchant}`}
                      className="emp-receipt-thumb"
                    />
                  )}
                </div>

                {/* Column 2: Merchant & Username */}
                <div>
                  <div className="emp-col-label">Merchant & User</div>
                  <div className="emp-bill-title">{bill.merchant}</div>
                  <div className="emp-bill-user">
                    @{bill.employeeUsername || user.username}
                  </div>
                </div>

                {/* Column 3: Reason & Date */}
                <div>
                  <div className="emp-col-label">Reason & Date</div>
                  <div className="emp-bill-meta">{bill.reason}</div>
                  <div className="emp-bill-date">{bill.date}</div>
                </div>

                {/* Column 4: Purpose & Reject Note */}
                <div>
                  <div className="emp-col-label">Purpose</div>
                  <div className="emp-bill-purpose">{bill.purpose}</div>
                  {bill.status === "rejected" && bill.rejectReason && (
                    <div className="emp-reject-note">
                      Manager Note: {bill.rejectReason}
                    </div>
                  )}
                </div>

                {/* Column 5: Amount & Status */}
                <div className="emp-bill-right">
                  <div className="emp-bill-amount">
                    ${Number(bill.amount).toFixed(2)}
                  </div>
                  <span className={`status-badge status-${bill.status}`}>
                    {bill.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Button to Open Popup */}
        <div className="emp-add-bar">
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + Add Expense Claim
          </button>
        </div>
      </main>

      {/* Add Expense Claim Popup Modal */}
      {showModal && (
        <div className="emp-modal-overlay">
          <form className="emp-modal" onSubmit={handleAddClaim}>
            <h3>Add Expense Claim</h3>

            {formError && <p className="error-msg">{formError}</p>}

            <div className="form-group">
              <label>Merchant / Brand / Company</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g., Uber, Starbucks, Amazon"
                required
              />
            </div>

            <div className="form-group">
              <label>Reason / Category</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="Meals">Meals</option>
                <option value="Travel">Travel</option>
                <option value="Hotel / Stay">Hotel / Stay</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Client Meeting">Client Meeting</option>
                <option value="Software / Tools">Software / Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Extra input appears only when "Other" is selected */}
            {reason === "Other" && (
              <div className="form-group">
                <label>Enter Your Reason</label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Type your custom reason"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount used"
                required
              />
            </div>

            <div className="form-group">
              <label>Describe the Purpose</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Explain why this expense was needed..."
                required
              />
            </div>

            <div className="form-group">
              <label>Upload Receipt (Image, max 1 MB)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>

            <div className="emp-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setFormError("");
                  setCustomReason("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Claim
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;