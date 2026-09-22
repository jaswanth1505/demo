/**
 * BudgetBuddy — Main Application Controller & View Orchestrator
 * Coordinates all 9 modules, view routing, modals, and toast notifications.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.App = (function () {
  'use strict';

  // Format currency according to user preference
  function formatCurrency(amount) {
    const settings = BudgetBuddy.Settings.getSettings();
    const symbol = settings.currency || '₹';
    const num = Number(amount) || 0;
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Format date helper (e.g. "22 Sep 2026")
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Toast Notification
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Navigation / Tab Switching ----------

  function switchTab(tabId) {
    const currentUser = BudgetBuddy.Auth.getCurrentUser();

    // Guard: Require auth
    if (!currentUser && tabId !== 'auth') {
      showTab('auth');
      return;
    }

    // Guard: Admin tab only accessible to admins
    if (tabId === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
      showToast('Access restricted: Administrator role required.', 'error');
      switchTab('dashboard');
      return;
    }

    showTab(tabId);
  }

  function showTab(tabId) {
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    // Highlight nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabId);
    });

    const target = document.getElementById(`view-${tabId}`);
    if (target) {
      target.classList.add('active');
    }

    // Refresh view content
    renderCurrentView(tabId);
  }

  function renderCurrentView(tabId) {
    const currentUser = BudgetBuddy.Auth.getCurrentUser();
    updateHeaderUI();

    if (!currentUser) {
      renderAuthView();
      return;
    }

    switch (tabId) {
      case 'dashboard':
        renderDashboardView();
        break;
      case 'transactions':
        renderTransactionsView();
        break;
      case 'budget':
        renderBudgetView();
        break;
      case 'accounts':
        renderAccountsView();
        break;
      case 'recurring':
        renderRecurringView();
        break;
      case 'analytics':
        renderAnalyticsView();
        break;
      case 'admin':
        renderAdminView();
        break;
      case 'settings':
        renderSettingsView();
        break;
    }
  }

  // ---------- Header UI Update ----------

  function updateHeaderUI() {
    const currentUser = BudgetBuddy.Auth.getCurrentUser();
    const authNav = document.getElementById('auth-nav-items');
    const userBadge = document.getElementById('header-user-badge');
    const roleBadge = document.getElementById('header-role-badge');
    const adminNavTab = document.getElementById('tab-admin-nav');
    const userNavTabs = document.getElementById('main-nav-tabs');

    if (!currentUser) {
      if (userNavTabs) userNavTabs.style.display = 'none';
      if (authNav) authNav.style.display = 'none';
      return;
    }

    if (userNavTabs) userNavTabs.style.display = 'flex';
    if (authNav) authNav.style.display = 'flex';

    if (userBadge) {
      userBadge.textContent = `${currentUser.avatar || '👤'} ${currentUser.name}`;
    }

    if (roleBadge) {
      roleBadge.textContent = currentUser.role === 'admin' ? 'Administrator' : 'User';
      roleBadge.className = `role-badge ${currentUser.role === 'admin' ? 'role-admin' : 'role-user'}`;
    }

    if (adminNavTab) {
      adminNavTab.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
    }
  }

  // ---------- 1. Auth View ----------

  function renderAuthView() {
    // Auth view is static HTML handled by event listeners
  }

  // ---------- 2. Dashboard View ----------

  function renderDashboardView() {
    const summary = BudgetBuddy.User.getFinancialSummary();
    const budgetStatus = BudgetBuddy.Budget.getBudgetStatus();

    // Summary Cards
    const netBalEl = document.getElementById('dash-net-balance');
    const incEl = document.getElementById('dash-total-income');
    const expEl = document.getElementById('dash-total-expenses');
    const savEl = document.getElementById('dash-savings-rate');

    if (netBalEl) netBalEl.textContent = formatCurrency(summary.totalBalance);
    if (incEl) incEl.textContent = formatCurrency(summary.totalIncome);
    if (expEl) expEl.textContent = formatCurrency(summary.totalExpenses);
    if (savEl) savEl.textContent = `${summary.savingsRate}%`;

    // Monthly Budget Bar Widget
    const barFill = document.getElementById('dash-budget-bar');
    const statusText = document.getElementById('dash-budget-status');
    if (barFill && statusText) {
      const pct = Math.min(budgetStatus.percent, 100);
      barFill.style.width = `${pct}%`;
      barFill.className = 'budget-bar-fill';
      if (budgetStatus.isOverBudget) {
        barFill.classList.add('over-budget');
        statusText.innerHTML = `<strong style="color:var(--danger)">Over budget!</strong> Spent ${formatCurrency(budgetStatus.monthlySpent)} of ${formatCurrency(budgetStatus.monthlyBudget)} limit.`;
      } else if (budgetStatus.monthlyBudget > 0) {
        if (budgetStatus.isWarning) barFill.classList.add('warning-budget');
        statusText.textContent = `${formatCurrency(budgetStatus.remaining)} remaining of ${formatCurrency(budgetStatus.monthlyBudget)} budget (${Math.round(budgetStatus.percent)}% used)`;
      } else {
        statusText.textContent = 'No monthly budget limit set yet.';
      }
    }

    // Recent Transactions mini-list
    const recentList = document.getElementById('dash-recent-list');
    const emptyHint = document.getElementById('dash-recent-empty');
    if (recentList) {
      const recent = BudgetBuddy.User.getRecentTransactions(5);
      recentList.innerHTML = '';
      if (recent.length === 0) {
        if (emptyHint) emptyHint.style.display = 'block';
      } else {
        if (emptyHint) emptyHint.style.display = 'none';
        recent.forEach(tx => {
          const li = document.createElement('li');
          li.className = 'recent-item';
          const isIncome = tx.type === 'income';
          li.innerHTML = `
            <div class="recent-left">
              <span class="recent-title">${escapeHtml(tx.description)}</span>
              <span class="recent-meta">
                <span class="category-tag category-${tx.category}">${escapeHtml(tx.category)}</span>
                ${formatDate(tx.date)}
              </span>
            </div>
            <div class="recent-right">
              <span class="amount ${isIncome ? 'amount-income' : 'amount-expense'}">
                ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
              </span>
            </div>
          `;
          recentList.appendChild(li);
        });
      }
    }

    // Quick upcoming reminders
    const upcomingList = document.getElementById('dash-upcoming-list');
    if (upcomingList) {
      const upcoming = BudgetBuddy.Recurring.getUpcomingPayments().slice(0, 3);
      upcomingList.innerHTML = '';
      if (upcoming.length === 0) {
        upcomingList.innerHTML = '<li class="empty-hint">No scheduled payments pending.</li>';
      } else {
        upcoming.forEach(item => {
          const li = document.createElement('li');
          li.className = 'reminder-item';
          li.innerHTML = `
            <div class="reminder-info">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="reminder-sub">${formatDate(item.nextDueDate)} · <span class="badge ${item.isUrgent ? 'badge-danger' : 'badge-gold'}">${item.dueText}</span></span>
            </div>
            <div class="reminder-actions">
              <span class="reminder-amt">${formatCurrency(item.amount)}</span>
              <button class="ghost-btn btn-sm btn-pay-recurring" data-id="${item.id}">Pay</button>
            </div>
          `;
          upcomingList.appendChild(li);
        });
      }
    }
  }

  // ---------- 3. Transactions View ----------

  function renderTransactionsView() {
    const typeFilter = document.getElementById('tx-filter-type')?.value || 'all';
    const catFilter = document.getElementById('tx-filter-category')?.value || 'all';
    const accFilter = document.getElementById('tx-filter-account')?.value || 'all';
    const query = document.getElementById('tx-search-input')?.value || '';

    // Populate category dropdown in filters if empty
    const catSelect = document.getElementById('tx-filter-category');
    if (catSelect && catSelect.children.length <= 1) {
      const categories = BudgetBuddy.Accounts.getCategories();
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.icon} ${c.name}`;
        catSelect.appendChild(opt);
      });
    }

    // Populate account dropdown in filters if empty
    const accSelect = document.getElementById('tx-filter-account');
    if (accSelect && accSelect.children.length <= 1) {
      const accounts = BudgetBuddy.Accounts.getAccounts();
      accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.icon} ${a.name}`;
        accSelect.appendChild(opt);
      });
    }

    const transactions = BudgetBuddy.Transactions.getTransactions({
      type: typeFilter,
      category: catFilter,
      accountId: accFilter,
      query: query
    });

    const tbody = document.getElementById('tx-table-body');
    const emptyHint = document.getElementById('tx-empty-hint');
    const countBadge = document.getElementById('tx-count-badge');

    if (countBadge) {
      countBadge.textContent = `${transactions.length} record${transactions.length === 1 ? '' : 's'}`;
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    if (transactions.length === 0) {
      if (emptyHint) emptyHint.style.display = 'block';
    } else {
      if (emptyHint) emptyHint.style.display = 'none';

      transactions.forEach(tx => {
        const tr = document.createElement('tr');
        const isIncome = tx.type === 'income';
        const account = BudgetBuddy.Accounts.getAccountById(tx.accountId);
        const accountName = account ? `${account.icon} ${account.name}` : 'General';

        tr.innerHTML = `
          <td>${formatDate(tx.date)}</td>
          <td>
            <strong>${escapeHtml(tx.description)}</strong>
            ${tx.notes ? `<div class="tx-notes">${escapeHtml(tx.notes)}</div>` : ''}
          </td>
          <td><span class="category-tag category-${tx.category}">${escapeHtml(tx.category)}</span></td>
          <td><span class="account-pill">${accountName}</span></td>
          <td><span class="type-badge type-${tx.type}">${isIncome ? 'Income' : 'Expense'}</span></td>
          <td class="amount-cell ${isIncome ? 'amount-income' : 'amount-expense'}">
            ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
          </td>
          <td class="action-cell">
            <button class="icon-btn btn-edit-tx" data-id="${tx.id}" title="Edit transaction">✎</button>
            <button class="icon-btn btn-delete-tx text-danger" data-id="${tx.id}" title="Delete transaction">✕</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // ---------- 4. Budget View ----------

  function renderBudgetView() {
    const budgetStatus = BudgetBuddy.Budget.getBudgetStatus();

    const monthlyInput = document.getElementById('budget-monthly-input');
    if (monthlyInput && !monthlyInput.matches(':focus')) {
      monthlyInput.value = budgetStatus.monthlyBudget || '';
    }

    const overallTrack = document.getElementById('budget-overall-track');
    const overallText = document.getElementById('budget-overall-text');
    if (overallTrack && overallText) {
      const pct = Math.min(budgetStatus.percent, 100);
      overallTrack.style.width = `${pct}%`;
      overallTrack.className = 'budget-bar-fill';

      if (budgetStatus.isOverBudget) {
        overallTrack.classList.add('over-budget');
        overallText.innerHTML = `<span class="badge badge-danger">Over budget!</span> Spent ${formatCurrency(budgetStatus.monthlySpent)} of ${formatCurrency(budgetStatus.monthlyBudget)} (Excess: ${formatCurrency(Math.abs(budgetStatus.remaining))})`;
      } else if (budgetStatus.monthlyBudget > 0) {
        if (budgetStatus.isWarning) overallTrack.classList.add('warning-budget');
        overallText.innerHTML = `Spent ${formatCurrency(budgetStatus.monthlySpent)} / ${formatCurrency(budgetStatus.monthlyBudget)} &bull; <strong>${formatCurrency(budgetStatus.remaining)} remaining</strong> (${Math.round(budgetStatus.percent)}%)`;
      } else {
        overallText.textContent = 'Set your total monthly spending target above.';
      }
    }

    // Category-wise Budgets list
    const container = document.getElementById('category-budgets-grid');
    if (!container) return;
    container.innerHTML = '';

    if (budgetStatus.categoryStatuses.length === 0) {
      container.innerHTML = '<p class="empty-hint">No category budgets set. Define one below.</p>';
      return;
    }

    budgetStatus.categoryStatuses.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card cat-budget-card';

      const pct = Math.min(item.percent, 100);
      let barClass = 'budget-bar-fill';
      let statusBadge = '';

      if (item.isOverBudget) {
        barClass += ' over-budget';
        statusBadge = `<span class="badge badge-danger">Over by ${formatCurrency(Math.abs(item.remaining))}</span>`;
      } else if (item.isWarning) {
        barClass += ' warning-budget';
        statusBadge = `<span class="badge badge-gold">80%+ Used</span>`;
      } else if (item.budget > 0) {
        statusBadge = `<span class="badge badge-success">On Track</span>`;
      }

      card.innerHTML = `
        <div class="cat-budget-header">
          <h3>${escapeHtml(item.category)}</h3>
          ${statusBadge}
        </div>
        <div class="cat-budget-amounts">
          <span>Spent: <strong>${formatCurrency(item.spent)}</strong></span>
          <span>Budget: <strong>${item.budget > 0 ? formatCurrency(item.budget) : 'None'}</strong></span>
        </div>
        <div class="budget-bar-track">
          <div class="${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="cat-budget-footer">
          <span>Remaining: ${item.budget > 0 ? formatCurrency(item.remaining) : '-'}</span>
          <button class="ghost-btn btn-xs btn-delete-cat-budget" data-category="${escapeHtml(item.category)}">Reset</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ---------- 5. Accounts & Categories View ----------

  function renderAccountsView() {
    const accounts = BudgetBuddy.Accounts.getAccounts();
    const accContainer = document.getElementById('accounts-cards-grid');

    if (accContainer) {
      accContainer.innerHTML = '';
      accounts.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'card account-card';
        card.innerHTML = `
          <div class="acc-top">
            <span class="acc-icon">${acc.icon}</span>
            <span class="acc-type-pill">${acc.type.toUpperCase()}</span>
          </div>
          <h3 class="acc-name">${escapeHtml(acc.name)}</h3>
          <div class="acc-balance ${acc.balance < 0 ? 'text-danger' : ''}">${formatCurrency(acc.balance)}</div>
          <div class="acc-actions">
            <button class="ghost-btn btn-xs btn-delete-acc" data-id="${acc.id}">Delete</button>
          </div>
        `;
        accContainer.appendChild(card);
      });
    }

    // Categories list
    const categories = BudgetBuddy.Accounts.getCategories();
    const catContainer = document.getElementById('categories-tag-cloud');
    if (catContainer) {
      catContainer.innerHTML = '';
      categories.forEach(cat => {
        const pill = document.createElement('div');
        pill.className = 'category-pill';
        pill.style.borderColor = cat.color;
        pill.innerHTML = `
          <span class="cat-icon">${cat.icon}</span>
          <span class="cat-title">${escapeHtml(cat.name)}</span>
          <span class="cat-type-label">${cat.type}</span>
        `;
        catContainer.appendChild(pill);
      });
    }
  }

  // ---------- 6. Recurring View ----------

  function renderRecurringView() {
    const recurringList = BudgetBuddy.Recurring.getUpcomingPayments();
    const container = document.getElementById('recurring-items-list');
    const emptyHint = document.getElementById('recurring-empty-hint');

    if (!container) return;
    container.innerHTML = '';

    if (recurringList.length === 0) {
      if (emptyHint) emptyHint.style.display = 'block';
    } else {
      if (emptyHint) emptyHint.style.display = 'none';

      recurringList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card recurring-card';
        card.innerHTML = `
          <div class="rec-main">
            <div class="rec-title-row">
              <h3>${escapeHtml(item.title)}</h3>
              <span class="badge ${item.isUrgent ? 'badge-danger' : 'badge-gold'}">${item.dueText}</span>
            </div>
            <div class="rec-meta">
              <span>Category: ${escapeHtml(item.category)}</span>
              <span>Frequency: ${escapeHtml(item.frequency)}</span>
              <span>Next Due: ${formatDate(item.nextDueDate)}</span>
            </div>
          </div>
          <div class="rec-side">
            <div class="rec-amount">${formatCurrency(item.amount)}</div>
            <div class="rec-btn-group">
              <button class="primary-btn btn-sm btn-pay-recurring" data-id="${item.id}">Pay Now</button>
              <button class="ghost-btn btn-sm btn-delete-recurring" data-id="${item.id}">✕</button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }
  }

  // ---------- 7. Analytics & Reports View ----------

  function renderAnalyticsView() {
    const filter = document.getElementById('analytics-date-filter')?.value || 'all';
    const data = BudgetBuddy.Analytics.getAnalyticsData(filter);

    const incEl = document.getElementById('analytics-inc');
    const expEl = document.getElementById('analytics-exp');
    const savEl = document.getElementById('analytics-sav');

    if (incEl) incEl.textContent = formatCurrency(data.totalIncome);
    if (expEl) expEl.textContent = formatCurrency(data.totalExpense);
    if (savEl) savEl.textContent = formatCurrency(data.netSavings);

    // Draw HTML5 Canvas Charts
    setTimeout(() => {
      BudgetBuddy.Analytics.drawCategoryChart('chart-category-canvas', data.categoryBreakdown);
      BudgetBuddy.Analytics.drawComparisonChart('chart-comparison-canvas', data.totalIncome, data.totalExpense);
      BudgetBuddy.Analytics.drawTrendChart('chart-trend-canvas', data.monthlyTrends);
    }, 50);

    // Render Text / CSS Distribution Bars
    const distContainer = document.getElementById('distribution-bars-container');
    if (distContainer) {
      distContainer.innerHTML = '';
      if (data.distributionBars.length === 0) {
        distContainer.innerHTML = '<p class="empty-hint">No expense distribution data available.</p>';
      } else {
        data.distributionBars.forEach(bar => {
          const row = document.createElement('div');
          row.className = 'dist-row';
          row.innerHTML = `
            <div class="dist-header">
              <span class="dist-cat">${escapeHtml(bar.category)}</span>
              <span class="dist-amt">${formatCurrency(bar.amount)} (${bar.percent}%)</span>
            </div>
            <div class="dist-bar-track">
              <div class="dist-bar-fill" style="width:${bar.percent}%; background-color:${bar.color}"></div>
            </div>
            <div class="dist-text-blocks">${bar.barText}</div>
          `;
          distContainer.appendChild(row);
        });
      }
    }
  }

  // ---------- 8. Admin View ----------

  function renderAdminView() {
    const currentUser = BudgetBuddy.Auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Admin authorization required', 'error');
      switchTab('dashboard');
      return;
    }

    const metrics = BudgetBuddy.Admin.getSystemMetrics();

    document.getElementById('admin-stat-users').textContent = metrics.totalUsers;
    document.getElementById('admin-stat-active').textContent = metrics.activeUsersCount;
    document.getElementById('admin-stat-tx').textContent = metrics.totalTransactionsCount;
    document.getElementById('admin-stat-volume').textContent = formatCurrency(metrics.totalSystemExpenses);
    document.getElementById('admin-stat-income').textContent = formatCurrency(metrics.totalSystemIncome);

    // Users Table
    const query = document.getElementById('admin-user-search')?.value || '';
    const users = BudgetBuddy.Admin.getUsers(query);
    const tbody = document.getElementById('admin-users-tbody');

    if (tbody) {
      tbody.innerHTML = '';
      users.forEach(u => {
        const tr = document.createElement('tr');
        const isActive = u.status === 'active';
        const isSelf = u.id === currentUser.id;

        tr.innerHTML = `
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role}</span></td>
          <td><span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
          <td>${u.joinedDate || '-'}</td>
          <td class="action-cell">
            ${isSelf ? '<span class="text-muted">Active Admin</span>' : `
              <button class="ghost-btn btn-xs btn-toggle-user" data-id="${u.id}">
                ${isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button class="icon-btn text-danger btn-delete-user" data-id="${u.id}" title="Delete User">✕</button>
            `}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Global Categories Table
    const catList = BudgetBuddy.Admin.getAllCategories();
    const catTbody = document.getElementById('admin-cat-tbody');
    if (catTbody) {
      catTbody.innerHTML = '';
      catList.forEach(c => {
        const tr = document.createElement('tr');
        const isEnabled = c.enabled !== false;
        tr.innerHTML = `
          <td>${c.icon} <strong>${escapeHtml(c.name)}</strong></td>
          <td>${c.type}</td>
          <td><span class="color-dot" style="background:${c.color}"></span> ${c.color}</td>
          <td><span class="badge ${isEnabled ? 'badge-success' : 'badge-danger'}">${isEnabled ? 'Enabled' : 'Disabled'}</span></td>
          <td class="action-cell">
            <button class="ghost-btn btn-xs btn-toggle-cat" data-id="${c.id}">
              ${isEnabled ? 'Disable' : 'Enable'}
            </button>
            <button class="icon-btn text-danger btn-delete-cat" data-id="${c.id}" title="Delete Category">✕</button>
          </td>
        `;
        catTbody.appendChild(tr);
      });
    }

    // Audit Logs
    const logList = BudgetBuddy.Admin.getAuditLogs().slice(0, 8);
    const logContainer = document.getElementById('admin-audit-logs');
    if (logContainer) {
      logContainer.innerHTML = '';
      logList.forEach(log => {
        const li = document.createElement('li');
        li.className = 'audit-log-item';
        li.innerHTML = `
          <span class="log-time">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span class="log-action"><strong>${escapeHtml(log.action)}</strong> (${escapeHtml(log.user)})</span>
          <span class="log-details">${escapeHtml(log.details)}</span>
        `;
        logContainer.appendChild(li);
      });
    }
  }

  // ---------- 9. Settings View ----------

  function renderSettingsView() {
    const currentUser = BudgetBuddy.Auth.getCurrentUser();
    if (!currentUser) return;

    const settings = BudgetBuddy.Settings.getSettings();

    // Populate user profile fields
    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    if (nameInput) nameInput.value = currentUser.name;
    if (emailInput) emailInput.value = currentUser.email;

    // Currency selector
    const currSelect = document.getElementById('settings-currency-select');
    if (currSelect) {
      currSelect.value = settings.currency || '₹';
    }

    // Theme selector
    const themeCheckbox = document.getElementById('settings-darkmode-toggle');
    if (themeCheckbox) {
      themeCheckbox.checked = settings.theme === 'dark';
    }
  }

  // Refresh whole app state
  function refreshAll() {
    const activeSection = document.querySelector('.view-section.active');
    const tabId = activeSection ? activeSection.id.replace('view-', '') : 'dashboard';
    renderCurrentView(tabId);
  }

  // ---------- Modals Handler ----------

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // ---------- Setup All Event Handlers ----------

  function initEventHandlers() {
    // Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        if (tab) switchTab(tab);
      });
    });

    // Close Modal buttons
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = btn.closest('.modal');
        if (modal) closeModal(modal.id);
      });
    });

    // Quick Login Demo buttons
    document.getElementById('btn-demo-user')?.addEventListener('click', () => {
      document.getElementById('login-email').value = 'user@budgetbuddy.com';
      document.getElementById('login-password').value = 'user123';
      document.getElementById('login-form').dispatchEvent(new Event('submit'));
    });

    document.getElementById('btn-demo-admin')?.addEventListener('click', () => {
      document.getElementById('login-email').value = 'admin@budgetbuddy.com';
      document.getElementById('login-password').value = 'admin123';
      document.getElementById('login-form').dispatchEvent(new Event('submit'));
    });

    // Auth Switch between Login & Signup
    document.getElementById('switch-to-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('auth-login-box').style.display = 'none';
      document.getElementById('auth-signup-box').style.display = 'block';
    });

    document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('auth-signup-box').style.display = 'none';
      document.getElementById('auth-login-box').style.display = 'block';
    });

    // Login Form Submit
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;

      const res = BudgetBuddy.Auth.login(email, pass);
      if (res.success) {
        showToast(res.message, 'success');
        if (res.role === 'admin') {
          switchTab('admin');
        } else {
          switchTab('dashboard');
        }
      } else {
        showToast(res.message, 'error');
      }
    });

    // Signup Form Submit
    document.getElementById('signup-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;
      const role = document.getElementById('signup-role').value;

      const res = BudgetBuddy.Auth.signup(name, email, pass, role);
      if (res.success) {
        showToast(res.message, 'success');
        if (res.role === 'admin') {
          switchTab('admin');
        } else {
          switchTab('dashboard');
        }
      } else {
        showToast(res.message, 'error');
      }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      BudgetBuddy.Auth.logout();
      showToast('Logged out successfully.', 'info');
      switchTab('auth');
    });

    // Header Quick Add button
    document.getElementById('btn-quick-add-tx')?.addEventListener('click', () => {
      prepareTxModal();
      openModal('modal-transaction');
    });

    // Transaction Form Submit (Add / Edit)
    document.getElementById('tx-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('tx-id').value;
      const data = {
        type: document.getElementById('tx-type').value,
        description: document.getElementById('tx-desc').value,
        amount: document.getElementById('tx-amount').value,
        category: document.getElementById('tx-category').value,
        accountId: document.getElementById('tx-account').value,
        date: document.getElementById('tx-date').value,
        notes: document.getElementById('tx-notes').value
      };

      let res;
      if (id) {
        res = BudgetBuddy.Transactions.updateTransaction(id, data);
      } else {
        res = BudgetBuddy.Transactions.addTransaction(data);
      }

      if (res.success) {
        showToast(res.message, 'success');
        closeModal('modal-transaction');
        refreshAll();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Delete / Edit Transaction clicks (delegation on table)
    document.getElementById('tx-table-body')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-tx');
      const delBtn = e.target.closest('.btn-delete-tx');

      if (editBtn) {
        const id = editBtn.dataset.id;
        const tx = BudgetBuddy.Transactions.getTransactionById(id);
        if (tx) {
          prepareTxModal(tx);
          openModal('modal-transaction');
        }
      } else if (delBtn) {
        const id = delBtn.dataset.id;
        if (confirm('Are you sure you want to delete this transaction?')) {
          const res = BudgetBuddy.Transactions.deleteTransaction(id);
          if (res.success) {
            showToast(res.message, 'info');
            refreshAll();
          }
        }
      }
    });

    // Filter controls in Transactions View
    ['tx-filter-type', 'tx-filter-category', 'tx-filter-account'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => renderTransactionsView());
    });
    document.getElementById('tx-search-input')?.addEventListener('input', () => renderTransactionsView());

    // Monthly Budget Form Submit
    document.getElementById('budget-monthly-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const amt = document.getElementById('budget-monthly-input').value;
      const res = BudgetBuddy.Budget.saveMonthlyBudget(amt);
      if (res.success) {
        showToast(res.message, 'success');
        refreshAll();
      }
    });

    // Category Budget Form Submit
    document.getElementById('budget-cat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const cat = document.getElementById('budget-cat-select').value;
      const amt = document.getElementById('budget-cat-amount').value;
      const res = BudgetBuddy.Budget.saveCategoryBudget(cat, amt);
      if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('budget-cat-amount').value = '';
        renderBudgetView();
      }
    });

    // Category Budget Delete
    document.getElementById('category-budgets-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete-cat-budget');
      if (btn) {
        const cat = btn.dataset.category;
        BudgetBuddy.Budget.removeCategoryBudget(cat);
        showToast(`Budget for ${cat} removed.`, 'info');
        renderBudgetView();
      }
    });

    // Add Account Form
    document.getElementById('form-add-account')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-acc-name').value;
      const type = document.getElementById('new-acc-type').value;
      const bal = document.getElementById('new-acc-balance').value;

      const res = BudgetBuddy.Accounts.addAccount(name, type, bal);
      if (res.success) {
        showToast(res.message, 'success');
        closeModal('modal-add-account');
        document.getElementById('form-add-account').reset();
        refreshAll();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Delete Account
    document.getElementById('accounts-cards-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete-acc');
      if (btn) {
        const id = btn.dataset.id;
        if (confirm('Delete this account?')) {
          const res = BudgetBuddy.Accounts.deleteAccount(id);
          if (res.success) {
            showToast(res.message, 'info');
            refreshAll();
          } else {
            showToast(res.message, 'error');
          }
        }
      }
    });

    // Add Category Form
    document.getElementById('form-add-category')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-cat-name').value;
      const type = document.getElementById('new-cat-type').value;
      const color = document.getElementById('new-cat-color').value;

      const res = BudgetBuddy.Accounts.addCategory(name, type, color);
      if (res.success) {
        showToast(res.message, 'success');
        closeModal('modal-add-category');
        document.getElementById('form-add-category').reset();
        refreshAll();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Recurring Payment actions
    document.addEventListener('click', (e) => {
      const payBtn = e.target.closest('.btn-pay-recurring');
      const delBtn = e.target.closest('.btn-delete-recurring');

      if (payBtn) {
        const id = payBtn.dataset.id;
        const res = BudgetBuddy.Recurring.payRecurringExpense(id);
        if (res.success) {
          showToast(res.message, 'success');
          refreshAll();
        } else {
          showToast(res.message, 'error');
        }
      } else if (delBtn) {
        const id = delBtn.dataset.id;
        if (confirm('Delete this recurring payment schedule?')) {
          const res = BudgetBuddy.Recurring.deleteRecurringExpense(id);
          if (res.success) {
            showToast(res.message, 'info');
            renderRecurringView();
          }
        }
      }
    });

    // Add Recurring Form
    document.getElementById('form-add-recurring')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        title: document.getElementById('rec-title').value,
        amount: document.getElementById('rec-amount').value,
        category: document.getElementById('rec-category').value,
        accountId: document.getElementById('rec-account').value,
        frequency: document.getElementById('rec-frequency').value,
        dueDate: document.getElementById('rec-duedate').value
      };

      const res = BudgetBuddy.Recurring.addRecurringExpense(data);
      if (res.success) {
        showToast(res.message, 'success');
        closeModal('modal-add-recurring');
        document.getElementById('form-add-recurring').reset();
        refreshAll();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Analytics date filter
    document.getElementById('analytics-date-filter')?.addEventListener('change', () => {
      renderAnalyticsView();
    });

    // Admin Users Management: Toggle Status and Delete
    document.getElementById('admin-users-tbody')?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-user');
      const delBtn = e.target.closest('.btn-delete-user');

      if (toggleBtn) {
        const uid = toggleBtn.dataset.id;
        const res = BudgetBuddy.Admin.toggleUserStatus(uid);
        if (res.success) {
          showToast(res.message, 'info');
          renderAdminView();
        } else {
          showToast(res.message, 'error');
        }
      } else if (delBtn) {
        const uid = delBtn.dataset.id;
        if (confirm('Are you sure you want to permanently delete this user?')) {
          const res = BudgetBuddy.Admin.deleteUser(uid);
          if (res.success) {
            showToast(res.message, 'info');
            renderAdminView();
          } else {
            showToast(res.message, 'error');
          }
        }
      }
    });

    // Admin Search Users
    document.getElementById('admin-user-search')?.addEventListener('input', () => {
      renderAdminView();
    });

    // Admin Categories actions
    document.getElementById('admin-cat-tbody')?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-cat');
      const delBtn = e.target.closest('.btn-delete-cat');

      if (toggleBtn) {
        const cid = toggleBtn.dataset.id;
        const res = BudgetBuddy.Admin.toggleCategoryStatus(cid);
        if (res.success) {
          showToast(res.message, 'info');
          renderAdminView();
        }
      } else if (delBtn) {
        const cid = delBtn.dataset.id;
        if (confirm('Delete this system category?')) {
          const res = BudgetBuddy.Admin.deleteCategory(cid);
          if (res.success) {
            showToast(res.message, 'info');
            renderAdminView();
          }
        }
      }
    });

    // Admin Add Category Form
    document.getElementById('admin-add-cat-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('admin-cat-name').value;
      const type = document.getElementById('admin-cat-type').value;
      const color = document.getElementById('admin-cat-color').value;

      const res = BudgetBuddy.Admin.addSystemCategory(name, type, color);
      if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('admin-add-cat-form').reset();
        renderAdminView();
      }
    });

    // Settings Profile Form
    document.getElementById('settings-profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value;
      const email = document.getElementById('settings-email').value;
      const curPass = document.getElementById('settings-cur-pass').value;
      const newPass = document.getElementById('settings-new-pass').value;

      const res = BudgetBuddy.User.updateProfile(name, email, curPass, newPass);
      if (res.success) {
        showToast(res.message, 'success');
        updateHeaderUI();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Settings Currency Select
    document.getElementById('settings-currency-select')?.addEventListener('change', (e) => {
      BudgetBuddy.Settings.setCurrency(e.target.value);
      showToast(`Currency updated to ${e.target.value}`, 'success');
      refreshAll();
    });

    // Settings Dark Mode Toggle
    document.getElementById('settings-darkmode-toggle')?.addEventListener('change', (e) => {
      const mode = BudgetBuddy.Settings.setTheme(e.target.checked ? 'dark' : 'light');
      showToast(`Switched to ${mode} mode`, 'info');
    });

    // Header Quick Theme toggle
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      const mode = BudgetBuddy.Settings.setTheme();
      const checkbox = document.getElementById('settings-darkmode-toggle');
      if (checkbox) checkbox.checked = (mode === 'dark');
      showToast(`Switched to ${mode} mode`, 'info');
    });

    // Settings Export CSV
    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      const res = BudgetBuddy.Settings.exportCSV();
      if (res.success) showToast(res.message, 'success');
      else showToast(res.message, 'error');
    });

    // Settings Print Report
    document.getElementById('btn-print-report')?.addEventListener('click', () => {
      BudgetBuddy.Settings.printReport();
    });

    // Settings Reset All Data
    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('Warning: This will reset all demo data back to default state. Proceed?')) {
        BudgetBuddy.Storage.resetAll();
        showToast('Database reset to default seed data.', 'info');
        refreshAll();
      }
    });

    // Modal Trigger Buttons
    document.getElementById('btn-open-add-acc')?.addEventListener('click', () => openModal('modal-add-account'));
    document.getElementById('btn-open-add-cat')?.addEventListener('click', () => openModal('modal-add-category'));
    document.getElementById('btn-open-add-rec')?.addEventListener('click', () => {
      prepareRecurringModal();
      openModal('modal-add-recurring');
    });
  }

  // Populate dynamic selects in Transaction Modal
  function prepareTxModal(tx = null) {
    const isEdit = tx !== null;
    document.getElementById('modal-tx-title').textContent = isEdit ? 'Edit Transaction' : 'Record Transaction';
    document.getElementById('tx-id').value = isEdit ? tx.id : '';

    const catSelect = document.getElementById('tx-category');
    catSelect.innerHTML = '';
    const categories = BudgetBuddy.Accounts.getCategories();
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name} (${c.type})`;
      catSelect.appendChild(opt);
    });

    const accSelect = document.getElementById('tx-account');
    accSelect.innerHTML = '';
    const accounts = BudgetBuddy.Accounts.getAccounts();
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.icon} ${a.name}`;
      accSelect.appendChild(opt);
    });

    if (isEdit) {
      document.getElementById('tx-type').value = tx.type;
      document.getElementById('tx-desc').value = tx.description;
      document.getElementById('tx-amount').value = tx.amount;
      document.getElementById('tx-category').value = tx.category;
      document.getElementById('tx-account').value = tx.accountId;
      document.getElementById('tx-date').value = tx.date;
      document.getElementById('tx-notes').value = tx.notes || '';
    } else {
      document.getElementById('tx-form').reset();
      document.getElementById('tx-id').value = '';
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    }
  }

  // Populate dynamic selects in Recurring Modal
  function prepareRecurringModal() {
    const catSelect = document.getElementById('rec-category');
    catSelect.innerHTML = '';
    const categories = BudgetBuddy.Accounts.getCategories('expense');
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.icon} ${c.name}`;
      catSelect.appendChild(opt);
    });

    const accSelect = document.getElementById('rec-account');
    accSelect.innerHTML = '';
    const accounts = BudgetBuddy.Accounts.getAccounts();
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.icon} ${a.name}`;
      accSelect.appendChild(opt);
    });

    document.getElementById('rec-duedate').value = new Date().toISOString().split('T')[0];
  }

  // Application Entry Point
  function init() {
    BudgetBuddy.Settings.applyInitialTheme();
    initEventHandlers();

    // Check auth status
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (current) {
      if (current.role === 'admin') {
        switchTab('admin');
      } else {
        switchTab('dashboard');
      }
    } else {
      switchTab('auth');
    }
  }

  return {
    init,
    switchTab,
    refreshAll,
    formatCurrency,
    formatDate,
    showToast,
    openModal,
    closeModal
  };
})();

// Start App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  BudgetBuddy.App.init();
});
