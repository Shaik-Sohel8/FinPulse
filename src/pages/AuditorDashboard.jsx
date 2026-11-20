import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession, getExpenses } from "../storage";
import "./AuditorDashboard.css";

const ITEMS_PER_PAGE = 20;

function AuditorDashboard() {
  const navigate = useNavigate();

  // Strictly allow ONLY users with role === "auditor"
  const [user] = useState(() => {
    const session = getSession();
    return session && session.role === "auditor" ? session : null;
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Filter states
  const [searchMerchant, setSearchMerchant] = useState("");
  const [monthFilter, setMonthFilter] = useState(""); // "" = all months
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Expense Detail Modal (S4) & Enlarged Receipt Lightbox
  const [selectedBill, setSelectedBill] = useState(null);
  const [enlargeReceipt, setEnlargeReceipt] = useState(false);

  // Load expenses from JSONBin on page open
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    let ignore = false;
    getExpenses()
      .then((allExpenses) => {
        if (!ignore) {
          // Tenant isolation: if tenantId exists, show only this auditor's company
          const companyExpenses = allExpenses.filter((bill) => {
            if (user.tenantId && bill.tenantId) {
              return bill.tenantId === user.tenantId;
            }
            return true;
          });
          setExpenses(companyExpenses);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setLoadError("Could not load ledger data. Please try refreshing.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user, navigate]);

  // Allow pressing Esc key to close the Expense Detail modal or enlarged image
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (enlargeReceipt) {
          setEnlargeReceipt(false);
        } else if (selectedBill) {
          setSelectedBill(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enlargeReceipt, selectedBill]);

  async function handleRefresh() {
    setLoading(true);
    setLoadError("");
    try {
      const allExpenses = await getExpenses();
      const companyExpenses = allExpenses.filter((bill) => {
        if (user.tenantId && bill.tenantId) {
          return bill.tenantId === user.tenantId;
        }
        return true;
      });
      setExpenses(companyExpenses);
    } catch {
      setLoadError("Could not refresh ledger data.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/", { replace: true });
  }

  function clearFilters() {
    setSearchMerchant("");
    setMonthFilter("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCurrentPage(1);
  }

  // Unique categories for the dropdown
  const availableCategories = Array.from(
    new Set(expenses.map((bill) => bill.reason))
  ).sort();

  // 1. Apply all 4 filters (Merchant search, Month, Status, Category)
  const filteredBills = expenses
    .filter((bill) => {
      const matchesMerchant = bill.merchant
        .toLowerCase()
        .includes(searchMerchant.trim().toLowerCase());

      const matchesMonth =
        monthFilter === "" || bill.date.startsWith(monthFilter);

      const matchesStatus =
        statusFilter === "all" || bill.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || bill.reason === categoryFilter;

      return matchesMerchant && matchesMonth && matchesStatus && matchesCategory;
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // newest date first

  // 2. Dynamically calculate Status Totals from filteredBills (never stored/hard-coded)
  const statusTotals = {
    all: { amount: 0, count: 0 },
    approved: { amount: 0, count: 0 },
    pending: { amount: 0, count: 0 },
    rejected: { amount: 0, count: 0 },
  };

  for (const bill of filteredBills) {
    const amt = Number(bill.amount) || 0;
    statusTotals.all.amount += amt;
    statusTotals.all.count += 1;

    if (statusTotals[bill.status]) {
      statusTotals[bill.status].amount += amt;
      statusTotals[bill.status].count += 1;
    }
  }

  // 3. Dynamically calculate Category Totals from filteredBills
  const categoryMap = {};
  for (const bill of filteredBills) {
    const cat = bill.reason || "Uncategorized";
    if (!categoryMap[cat]) {
      categoryMap[cat] = { amount: 0, count: 0 };
    }
    categoryMap[cat].amount += Number(bill.amount) || 0;
    categoryMap[cat].count += 1;
  }
  const categoryTotals = Object.entries(categoryMap);

  // 4. Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const pagedBills = filteredBills.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // 5. Export currently filtered rows to CSV (Read-only report)
  function handleExportCSV() {
    if (filteredBills.length === 0) return;

    const headers = [
      "Date",
      "Employee",
      "Username",
      "Merchant",
      "Category",
      "Amount",
      "Status",
      "Purpose",
      "Reviewed By",
      "Reviewed Date",
      "Reject Reason",
    ];

    const rows = filteredBills.map((bill) => [
      bill.date,
      bill.employeeName,
      bill.employeeUsername || "",
      bill.merchant,
      bill.reason,
      Number(bill.amount).toFixed(2),
      bill.status,
      bill.purpose,
      bill.reviewedBy || "",
      bill.reviewedAt || "",
      bill.rejectReason || "",
    ]);

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    );

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finpulse-ledger-${monthFilter || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      <main className="aud-container">
        {/* Auditor Title & Read-Only Badge */}
        <div className="aud-header-row">
          <div>
            <h2>{user.fullName}</h2>
            <p>@{user.username} • Auditor Ledger & Summary</p>
          </div>
          <span className="aud-readonly-tag">Read-Only Mode</span>
        </div>

        {/* Status Summary Cards (4/row laptop, 3/row tablet, 2/row phone) */}
        <div className="aud-section-title">Totals by Status (Matching Rows)</div>
        <div className="aud-cards-grid">
          <div className="aud-summary-card">
            <div className="aud-card-label">Total Ledger</div>
            <div className="aud-card-amount aud-total">
              ${statusTotals.all.amount.toFixed(2)}
            </div>
            <div className="aud-card-count">{statusTotals.all.count} claims</div>
          </div>

          <div className="aud-summary-card">
            <div className="aud-card-label">Approved</div>
            <div className="aud-card-amount aud-approved">
              ${statusTotals.approved.amount.toFixed(2)}
            </div>
            <div className="aud-card-count">
              {statusTotals.approved.count} claims
            </div>
          </div>

          <div className="aud-summary-card">
            <div className="aud-card-label">Pending</div>
            <div className="aud-card-amount aud-pending">
              ${statusTotals.pending.amount.toFixed(2)}
            </div>
            <div className="aud-card-count">
              {statusTotals.pending.count} claims
            </div>
          </div>

          <div className="aud-summary-card">
            <div className="aud-card-label">Rejected</div>
            <div className="aud-card-amount aud-rejected">
              ${statusTotals.rejected.amount.toFixed(2)}
            </div>
            <div className="aud-card-count">
              {statusTotals.rejected.count} claims
            </div>
          </div>
        </div>

        {/* Category Summary Cards (Sum equals Total Ledger above) */}
        {categoryTotals.length > 0 && (
          <>
            <div className="aud-section-title">
              Totals by Category (Matching Rows)
            </div>
            <div className="aud-cards-grid">
              {categoryTotals.map(([category, data]) => (
                <div key={category} className="aud-summary-card">
                  <div className="aud-card-label">{category}</div>
                  <div className="aud-card-amount">
                    ${data.amount.toFixed(2)}
                  </div>
                  <div className="aud-card-count">{data.count} claims</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Filters + Read-Only Ledger Table */}
        <section className="aud-panel">
          <div className="aud-filter-bar">
            <div className="aud-filters">
              <div className="aud-filter-field">
                <label htmlFor="aud-search">Search Merchant</label>
                <input
                  id="aud-search"
                  type="text"
                  value={searchMerchant}
                  onChange={(e) => {
                    setSearchMerchant(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="e.g., Uber, Amazon..."
                />
              </div>

              <div className="aud-filter-field">
                <label htmlFor="aud-month">Month</label>
                <input
                  id="aud-month"
                  type="month"
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="aud-filter-field">
                <label htmlFor="aud-status">Status</label>
                <select
                  id="aud-status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="aud-filter-field">
                <label htmlFor="aud-category">Category</label>
                <select
                  id="aud-category"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="aud-filter-actions">
              <button className="btn btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
              <button
                className="btn btn-export"
                onClick={handleExportCSV}
                disabled={filteredBills.length === 0}
              >
                Export CSV
              </button>
            </div>
          </div>

          {loadError && <p className="error-msg">{loadError}</p>}

          {loading ? (
            <div className="aud-empty">Loading ledger records...</div>
          ) : filteredBills.length === 0 ? (
            <div className="aud-empty">
              <p>No claims match these filters.</p>
              {expenses.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: "12px" }}
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "10px" }}>
                Click any row to open Expense Detail, receipt photo, and audit trail.
              </p>

              {/* Responsive Horizontal Scroll Table */}
              <div className="table-responsive">
                <table className="aud-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Merchant</th>
                      <th>Category</th>
                      <th>Receipt</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Reviewed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedBills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="aud-row"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedBill(bill);
                          setEnlargeReceipt(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSelectedBill(bill);
                            setEnlargeReceipt(false);
                          }
                        }}
                      >
                        <td>{bill.date}</td>
                        <td>
                          <div>{bill.employeeName}</div>
                          <div className="aud-user-sub">
                            @{bill.employeeUsername || "employee"}
                          </div>
                        </td>
                        <td>{bill.merchant}</td>
                        <td>{bill.reason}</td>
                        <td>
                          {bill.receipt ? (
                            <img
                              src={bill.receipt}
                              alt={`Receipt from ${bill.merchant}, ${bill.date}`}
                              className="aud-receipt-mini"
                            />
                          ) : (
                            <span className="aud-no-receipt">No receipt</span>
                          )}
                        </td>
                        <td className="aud-amount-cell">
                          ${Number(bill.amount).toFixed(2)}
                        </td>
                        <td>
                          <span className={`aud-badge aud-badge-${bill.status}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>
                          {bill.reviewedBy ? (
                            <div>
                              <div>{bill.reviewedBy}</div>
                              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                                {bill.reviewedAt || ""}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#64748b" }}>Waiting</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar (Partial State) */}
              <div className="aud-pagination">
                <div>
                  Showing {pagedBills.length} of {filteredBills.length} claims
                  (Rows {startIndex + 1}–
                  {Math.min(startIndex + ITEMS_PER_PAGE, filteredBills.length)})
                </div>

                <div className="aud-page-controls">
                  <button
                    className="aud-page-btn"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    className="aud-page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Expense Detail Modal (S4) — Strictly Read-Only */}
      {selectedBill && (
        <div
          className="aud-modal-overlay"
          onClick={() => setSelectedBill(null)}
        >
          <div className="aud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aud-modal-top">
              <h3>Expense Detail</h3>
              <span className={`aud-badge aud-badge-${selectedBill.status}`}>
                {selectedBill.status}
              </span>
            </div>

            {/* Receipt Image (Click to Enlarge) */}
            <div className="aud-receipt-box">
              {selectedBill.receipt ? (
                <>
                  <img
                    src={selectedBill.receipt}
                    alt={`Receipt from ${selectedBill.merchant}, ${selectedBill.date}`}
                    className="aud-receipt-img"
                    onClick={() => setEnlargeReceipt(true)}
                  />
                  <div className="aud-zoom-hint">
                    Click receipt image to enlarge
                  </div>
                </>
              ) : (
                <p className="aud-no-receipt">No receipt attached to this claim.</p>
              )}
            </div>

            {/* Claim Details */}
            <div className="aud-detail-grid">
              <div>
                <div className="aud-detail-label">Employee</div>
                <div>
                  {selectedBill.employeeName} (@
                  {selectedBill.employeeUsername || "employee"})
                </div>
              </div>
              <div>
                <div className="aud-detail-label">Merchant</div>
                <div>{selectedBill.merchant}</div>
              </div>
              <div>
                <div className="aud-detail-label">Category</div>
                <div>{selectedBill.reason}</div>
              </div>
              <div>
                <div className="aud-detail-label">Expense Date</div>
                <div>{selectedBill.date}</div>
              </div>
              <div>
                <div className="aud-detail-label">Amount</div>
                <strong>${Number(selectedBill.amount).toFixed(2)}</strong>
              </div>
              <div>
                <div className="aud-detail-label">Claim ID</div>
                <div>#{selectedBill.id}</div>
              </div>
              <div className="aud-detail-full">
                <div className="aud-detail-label">Purpose</div>
                <div>{selectedBill.purpose}</div>
              </div>
            </div>

            {/* Rejection Reason (if rejected) */}
            {selectedBill.status === "rejected" && selectedBill.rejectReason && (
              <div className="aud-reject-box">
                <strong>Rejection Reason:</strong> {selectedBill.rejectReason}
              </div>
            )}

            {/* Audit Trail / Status Timeline */}
            <div className="aud-timeline">
              <h4>Audit Trail</h4>
              <div className="aud-timeline-step">
                <strong>Submitted</strong> by {selectedBill.employeeName} on{" "}
                {new Date(selectedBill.id).toLocaleDateString()}
              </div>
              {selectedBill.reviewedBy ? (
                <div className="aud-timeline-step">
                  <strong style={{ textTransform: "capitalize" }}>
                    {selectedBill.status}
                  </strong>{" "}
                  by {selectedBill.reviewedBy}
                  {selectedBill.reviewedAt ? ` on ${selectedBill.reviewedAt}` : ""}
                </div>
              ) : (
                <div className="aud-timeline-step">
                  <strong>Pending Review</strong> — Waiting for Manager decision
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Enlarged Receipt View */}
      {selectedBill && enlargeReceipt && selectedBill.receipt && (
        <div
          className="aud-lightbox"
          onClick={() => setEnlargeReceipt(false)}
        >
          <img
            src={selectedBill.receipt}
            alt={`Enlarged receipt from ${selectedBill.merchant}, ${selectedBill.date}`}
          />
          <p style={{ color: "#cbd5e1", marginTop: "12px", fontSize: "14px" }}>
            Click anywhere or press Esc to close
          </p>
        </div>
      )}
    </div>
  );
}

export default AuditorDashboard;