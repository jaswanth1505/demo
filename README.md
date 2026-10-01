# BudgetBuddy — Expense & Budget Tracker

A feature-rich, modular personal finance ledger and expense management web application designed for Front End Development evaluation. Built **strictly with HTML5, CSS3, and modern vanilla JavaScript** with **zero external libraries or framework dependencies**.

---

## 🌟 Key Highlights & Academic Compliance

- **Zero External Dependencies**: 100% pure HTML5, CSS3, and vanilla JavaScript. All charts (Donut charts, side-by-side comparison bars, trend lines, and distribution progress bars) are drawn directly on **HTML5 Canvas** or built with CSS.
- **Modular Architecture**: Clean separation of concerns with 9 dedicated functional modules inside the `js/` directory.
- **Dual-Role Dashboards**: Full role-based routing for **Normal Users** (personal expense management) and **Faculty Administrators** (system statistics, user management, global category management).
- **Persistent Local Storage**: Complete data persistence in the browser via `localStorage` with rich pre-seeded demo records for immediate evaluation.
- **Multi-Currency Support**: Instant global formatting across all views for `₹` (INR), `$` (USD), `€` (EUR), `£` (GBP), and `¥` (JPY).
- **Native Data Export**: Built-in RFC 4180 CSV export and printer-ready financial report generation.

---

## 📂 Project Structure & 9 Modules Breakdown

```
budgetbuddy/
├── index.html               # Main Single-Page Application interface with 9 views & modals
├── style.css                # Classical ledger green & gold design system with Dark Mode
├── server.js                # Lightweight local static HTTP server
├── README.md                # Project documentation & GitHub instructions
├── .gitignore               # Git ignore rules
└── js/
    ├── storage.js           # Database Layer: localStorage persistence & seed data
    ├── auth.js              # Module 1: 🔐 Authentication & Role Management
    ├── user.js              # Module 2: 👤 User Module & Profile
    ├── transactions.js      # Module 3: 💸 Expense & Income Management
    ├── accounts.js          # Module 4: 🏦 Account & Category Management
    ├── budget.js            # Module 5: 💰 Budget Management
    ├── recurring.js         # Module 6: 🔄 Recurring Expense Management
    ├── analytics.js         # Module 7: 📊 Analytics & Reports (Native Canvas Charts)
    ├── admin.js             # Module 8: 🛡️ Admin Module & System Management
    ├── settings.js          # Module 9: ⚙️ Settings, Dark Mode & CSV Export
    └── app.js               # App Orchestrator: Navigation, modals & toast alerts
```

---

## 🔑 Demo Credentials for Faculty Evaluation

The login page features **1-Click Quick Demo Buttons** for instant evaluation:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Demo User** | `user@budgetbuddy.com` | `user123` | Personal Dashboard, Ledger, Budgets, Recurring Bills, Analytics |
| **Faculty Admin** | `admin@budgetbuddy.com` | `admin123` | Admin Console, User Deactivation/Deletion, Category Controls, Audit Logs |

---








