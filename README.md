# FinPulse: Expense Submission & Approval Platform

> **FinPulse** is a lightweight, responsive fintech expense management web application designed for small and mid-size companies. It streamlines corporate expense claims, approvals, and auditing through an intuitive role-based interface.

---

## 1. Header & Quick Overview

| Field | Value |
| :--- | :--- |
| **Product Name** | FinPulse |
| **ID / Track** | PST_PD_002 (Level 3 - Stretch) |
| **Duration** | 4 Weeks (Learning + Building OJT Project) |
| **Platform** | Responsive Web App (Optimized for Laptop & Mobile viewports) |
| **Tech Stack** | HTML5, CSS3, Bootstrap 5.3, Vanilla JavaScript, LocalStorage |

---

## 2. Overview

In many growing organizations, expense reimbursement is plagued by manual friction—paper receipts stapled to forms or unstructured photos sent across chat groups. **FinPulse** solves this by centralizing three core workflows:
1. **Employees** snap and submit expenses in under 30 seconds.
2. **Managers** clear and review claims via a single streamlined approval queue.
3. **Auditors** oversee organizational spend through an immutable, read-only financial ledger.

All mock data runs securely inside the browser's `localStorage`, initialized via sample JSON data with dual-tenant isolation (Acme Pvt Ltd & Beta Corp).

---

## 3. Problem Statement

* **The Pain Point:** Priya, a corporate sales executive, spent ₹1,840 on a client lunch. Three weeks later, she remains unreimbursed because her receipt photo is lost within a chaotic WhatsApp group chat, and her manager has no centralized tracking list.
* **The FinPulse Solution:** A unified system featuring one place to submit (with attached receipt), one queue to approve, and crystal-clear statuses (`Pending`, `Approved`, `Rejected`) accessible to all stakeholders.

---

## 4. User Personas

| Persona | Role & Context | Core Goals | Frustrations |
| :--- | :--- | :--- | :--- |
| **Priya** *(Corporate Employee)* | Sales executive traveling 3 days/week; files 8–12 claims monthly from her phone. | Submit claims instantly after paying and track approval statuses seamlessly. | Lost receipts, lack of status updates, tedious multi-field forms. |
| **Rahul** *(Finance Manager)* | Manages a team of 9; reviews and clears weekly claims on his laptop. | Access a single queue of pending claims to evaluate and clear them rapidly. | Disorganized submissions arriving via email, chat, and paper with no totals. |
| **Meena** *(Internal Auditor)* | Reviews compliance and quarterly spend summaries. | Audit all claims, receipts, and totals with strict read-only access. | Missing receipts and opaque approval history. |

---

## 5. Key User Journeys

### • Journey A: Employee Submits a Claim
1. Open FinPulse, select company (**Acme Pvt Ltd**), and choose role **Employee (Priya)**.
2. Land on the **My Expenses** dashboard and tap **`+ New Expense`**.
3. Enter the amount, date, category, and merchant, then tap **Add Receipt** to pick or snap a photo.
4. Tap **Submit for approval**. The form validates inputs and displays a success toast.
5. The new claim appears immediately at the top of the list marked with a yellow **Pending** badge.

### • Journey B: Manager Clears the Approval Queue
1. Switch role to **Manager (Rahul)**. Land on the **Approval Queue** displaying a badge count (e.g., *"4 pending"*).
2. Open a specific claim to review the receipt thumbnail, amount, and category (with inline category correction options if needed).
3. Click **Approve** or click **Reject** (which prompts a mandatory rejection reason).
4. The claim clears from the queue; the employee's view dynamically updates to show `Approved` or `Rejected` with the corresponding review note.

### • Journey C: Auditor Reviews the Financial Ledger
1. Switch role to **Auditor (Meena)** to access the read-only **Ledger** view.
2. Filter claims by month and status while inspecting category breakdown summary cards.
3. Utilize the **Export CSV** feature to download monthly financial logs for external record-keeping.
