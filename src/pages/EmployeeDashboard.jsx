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

const STANDARD_REASONS = [
  "Meals",
  "Travel",
  "Hotel / Stay",
  "Office Supplies",
  "Client Meeting",
  "Software / Tools",
];

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function EmployeeDashboard() {
  const navigate = useNavigate();
  const today = getTodayDate();

  const [user] = useState(() => {
    const session = getSession();
    return session && session.role === "employee" ? session : null;
  });

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(today.slice(0, 4));
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal & Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [merchant, setMerchant] = useState("");
  const [reason, setReason] = useState("Meals");
  const [customReason, setCustomReason] = useState("");
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [receipt, setReceipt] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [formError, setFormError] = useState("");

  // Load this employee's bills from JSONBin on page open
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let ignore = false;
    getExpenses()
      .then((allExpenses) => {
        if (!ignore) {
          setBills(allExpenses.filter((item) => item.employeeId === user.id));
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
      const allExpenses = await getExpenses();
      setBills(allExpenses.filter((item) => item.employeeId === user.id));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  function openAddModal() {
    setEditingId(null);
    setMerchant("");
    setReason("Meals");
    setCustomReason("");
    setDate(today);
    setAmount("");
    setPurpose("");
    setReceipt("");
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(bill) {
    setEditingId(bill.id);
    setMerchant(bill.merchant);

    if (STANDARD_REASONS.includes(bill.reason)) {
      setReason(bill.reason);
      setCustomReason("");
    } else {
      setReason("Other");
      setCustomReason(bill.reason);
    }

    setDate(bill.date);
    setAmount(String(bill.amount));
    setPurpose(bill.purpose);
    setReceipt(bill.receipt || "");
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormError("");
    setIsResizing(false);
  }

  // Resize photo with FileReader + <canvas> (kept compact for JSONBin's 100 KB limit)
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Invalid file. Please re-pick a JPG or PNG image.");
      setReceipt("");
      e.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setFormError("Receipt must be under 1 MB. Please re-pick a smaller image.");
      setReceipt("");
      e.target.value = "";
      return;
    }

    setFormError("");
    setIsResizing(true);

    const reader = new FileReader();

    reader.onerror = () => {
      setIsResizing(false);
      setReceipt("");
      e.target.value = "";
      setFormError("Image failed to load. Your details are safe—please re-pick the image.");
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        setIsResizing(false);
        setReceipt("");
        e.target.value = "";
        setFormError("Image failed to load. Your details are safe—please re-pick the image.");
      };

      img.onload = () => {
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const smallJpeg = canvas.toDataURL("image/jpeg", 0.45);
        setReceipt(smallJpeg);
        setIsResizing(false);
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  const approvedAmount = bills
    .filter((bill) => bill.status === "approved")
    .reduce((sum, bill) => sum + Number(bill.amount), 0);

  const remainingAmount = Math.max(0, LIMIT_AMOUNT - approvedAmount);

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

  async function handleSaveClaim(e) {
    e.preventDefault();
    setFormError("");

    if (isResizing) {
      setFormError("Please wait, resizing receipt image...");
      return;
    }

    if (date > today) {
      setFormError("Future dates are not allowed. Please pick today or an earlier date.");
      return;
    }

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
      setFormError("Please upload a receipt image.");
      return;
    }

    setSaving(true);

    try {
      // Always fetch the latest bills from JSONBin first so we don't overwrite other employees
      const allExpenses = await getExpenses();

      if (editingId !== null) {
        const updatedAll = allExpenses.map((bill) =>
          bill.id === editingId
            ? {
                ...bill,
                merchant: merchant.trim(),
                reason: finalReason,
                date: date,
                amount: numAmount,
                purpose: purpose.trim(),
                receipt: receipt,
                status: "pending",
                rejectReason: "",
              }
            : bill
        );

        await saveExpenses(updatedAll);
        setBills(updatedAll.filter((item) => item.employeeId === user.id));
      } else {
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

        const updatedAll = [newBill, ...allExpenses];
        await saveExpenses(updatedAll);
        setBills(updatedAll.filter((item) => item.employeeId === user.id));
      }

      closeModal();
    } catch {
      setFormError("Could not save to cloud. JSONBin free 100 KB limit may be full.");
    } finally {
      setSaving(false);
    }
  }

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

      <main className="dashboard-container">
        <div className="emp-welcome">
          <h2>{user.fullName}</h2>
          <p>@{user.username} • Employee Expense Dashboard</p>
        </div>

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

          {loading ? (
            <p style={{ color: "#94a3b8", padding: "16px 0" }}>
              Loading bills from cloud...
            </p>
          ) : filteredBills.length === 0 ? (
            <p style={{ color: "#94a3b8", padding: "16px 0" }}>
              No bills found for the selected filter.
            </p>
          ) : (
            filteredBills.map((bill) => (
              <div key={bill.id} className="emp-bill-item">
                <div>
                  {bill.receipt && (
                    <img
                      src={bill.receipt}
                      alt={`Receipt from ${bill.merchant}`}
                      className="emp-receipt-thumb"
                    />
                  )}
                </div>

                <div>
                  <div className="emp-col-label">Merchant & User</div>
                  <div className="emp-bill-title">{bill.merchant}</div>
                  <div className="emp-bill-user">
                    @{bill.employeeUsername || user.username}
                  </div>
                </div>

                <div>
                  <div className="emp-col-label">Reason & Date</div>
                  <div className="emp-bill-meta">{bill.reason}</div>
                  <div className="emp-bill-date">{bill.date}</div>
                </div>

                <div>
                  <div className="emp-col-label">Purpose</div>
                  <div className="emp-bill-purpose">{bill.purpose}</div>
                  {bill.status === "rejected" && bill.rejectReason && (
                    <div className="emp-reject-note">
                      Manager Note: {bill.rejectReason}
                    </div>
                  )}
                </div>

                <div className="emp-bill-right">
                  <div className="emp-bill-amount">
                    ${Number(bill.amount).toFixed(2)}
                  </div>

                  <span className={`status-badge status-${bill.status}`}>
                    {bill.status}
                  </span>

                  {(bill.status === "pending" || bill.status === "rejected") && (
                    <button
                      className="btn-edit"
                      onClick={() => openEditModal(bill)}
                    >
                      {bill.status === "rejected" ? "Edit & Resubmit" : "Edit"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="emp-add-bar">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Expense Claim
          </button>
        </div>
      </main>

      {showModal && (
        <div className="emp-modal-overlay">
          <form className="emp-modal" onSubmit={handleSaveClaim}>
            <h3>
              {editingId !== null ? "Edit & Resubmit Claim" : "Add Expense Claim"}
            </h3>

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
                {STANDARD_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>
            </div>

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
              <label>Date (No future dates)</label>
              <input
                type="date"
                max={today}
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
              <label>Upload Receipt (JPG/PNG, max 1 MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
              />

              {isResizing && (
                <p style={{ fontSize: "13px", color: "#38bdf8", marginTop: "6px" }}>
                  Resizing image...
                </p>
              )}

              {receipt && !isResizing && (
                <img
                  src={receipt}
                  alt="Receipt preview"
                  className="emp-preview-img"
                />
              )}
            </div>

            <div className="emp-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isResizing || saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                  ? "Resubmit Claim"
                  : "Submit Claim"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;