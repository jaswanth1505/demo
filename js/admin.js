/**
 * BudgetBuddy — Module 8: Admin Module
 * Dedicated administration module for faculty review.
 * Provides system-wide overview, user lifecycle management,
 * global category administration, and system audit reports.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Admin = (function () {
  'use strict';

  const { KEYS, get, set, generateId, logAudit } = BudgetBuddy.Storage;

  // Compute system-wide high-level metrics
  function getSystemMetrics() {
    const users = get(KEYS.USERS, []);
    const transactions = get(KEYS.TRANSACTIONS, []);
    const categories = get(KEYS.CATEGORIES, []);

    const activeUsers = users.filter(u => u.status === 'active');
    const inactiveUsers = users.filter(u => u.status !== 'active');

    let totalSystemIncome = 0;
    let totalSystemExpenses = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalSystemIncome += amt;
      } else {
        totalSystemExpenses += amt;
      }
    });

    return {
      totalUsers: users.length,
      activeUsersCount: activeUsers.length,
      inactiveUsersCount: inactiveUsers.length,
      totalTransactionsCount: transactions.length,
      totalSystemIncome,
      totalSystemExpenses,
      categoriesCount: categories.length
    };
  }

  // ---------- User Management ----------

  // Get all users with search filtering
  function getUsers(searchQuery = '') {
    let users = get(KEYS.USERS, []);
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      users = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    }
    return users;
  }

  // Get rich details for a single user (including stats)
  function getUserDetails(userId) {
    const users = get(KEYS.USERS, []);
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    const allTx = get(KEYS.TRANSACTIONS, []).filter(t => t.userId === userId);
    const accounts = get(KEYS.ACCOUNTS, []).filter(a => a.userId === userId);

    let totalSpent = 0;
    let totalEarned = 0;

    allTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalEarned += amt;
      else totalSpent += amt;
    });

    return {
      user,
      accountCount: accounts.length,
      transactionCount: allTx.length,
      totalSpent,
      totalEarned,
      accounts
    };
  }

  // Toggle user status (Activate / Deactivate)
  function toggleUserStatus(userId) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current || current.role !== 'admin') {
      return { success: false, message: 'Unauthorized: Admin privileges required.' };
    }

    if (current.id === userId) {
      return { success: false, message: 'You cannot deactivate your own administrator account.' };
    }

    const users = get(KEYS.USERS, []);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'User not found.' };
    }

    const newStatus = users[index].status === 'active' ? 'inactive' : 'active';
    users[index].status = newStatus;
    set(KEYS.USERS, users);

    logAudit('Admin Action', current.email, `Set user ${users[index].email} status to ${newStatus}`);

    return {
      success: true,
      newStatus,
      message: `User ${users[index].name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`
    };
  }

  // Delete user and cascade their transactions
  function deleteUser(userId) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current || current.role !== 'admin') {
      return { success: false, message: 'Unauthorized: Admin privileges required.' };
    }

    if (current.id === userId) {
      return { success: false, message: 'You cannot delete your own administrator account.' };
    }

    const users = get(KEYS.USERS, []);
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }

    // Remove user
    const updatedUsers = users.filter(u => u.id !== userId);
    set(KEYS.USERS, updatedUsers);

    // Cascade delete transactions
    const allTx = get(KEYS.TRANSACTIONS, []);
    const remainingTx = allTx.filter(t => t.userId !== userId);
    set(KEYS.TRANSACTIONS, remainingTx);

    // Cascade delete accounts
    const allAcc = get(KEYS.ACCOUNTS, []);
    const remainingAcc = allAcc.filter(a => a.userId !== userId);
    set(KEYS.ACCOUNTS, remainingAcc);

    logAudit('Admin Action', current.email, `Deleted user account: ${target.email}`);

    return {
      success: true,
      message: `User ${target.name} and associated records were permanently deleted.`
    };
  }

  // ---------- Category Management ----------

  // Get all categories including disabled ones
  function getAllCategories() {
    return get(KEYS.CATEGORIES, []);
  }

  // Admin: Add new system category
  function addSystemCategory(name, type, color, icon) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current || current.role !== 'admin') {
      return { success: false, message: 'Unauthorized: Admin access required.' };
    }

    if (!name || !name.trim()) {
      return { success: false, message: 'Category name is required.' };
    }

    const categories = get(KEYS.CATEGORIES, []);
    const cleanName = name.trim();

    if (categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.type === type)) {
      return { success: false, message: 'Category already exists.' };
    }

    const newCategory = {
      id: generateId('cat'),
      name: cleanName,
      type: type || 'expense',
      color: color || '#c99a3b',
      icon: icon || '🏷️',
      enabled: true
    };

    categories.push(newCategory);
    set(KEYS.CATEGORIES, categories);

    logAudit('Admin Action', current.email, `Created system category "${newCategory.name}"`);

    return {
      success: true,
      category: newCategory,
      message: `Category "${newCategory.name}" created.`
    };
  }

  // Admin: Toggle enable/disable category
  function toggleCategoryStatus(categoryId) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current || current.role !== 'admin') {
      return { success: false, message: 'Unauthorized: Admin access required.' };
    }

    const categories = get(KEYS.CATEGORIES, []);
    const index = categories.findIndex(c => c.id === categoryId);
    if (index === -1) {
      return { success: false, message: 'Category not found.' };
    }

    const currentStatus = categories[index].enabled !== false;
    categories[index].enabled = !currentStatus;
    set(KEYS.CATEGORIES, categories);

    logAudit('Admin Action', current.email, `${categories[index].enabled ? 'Enabled' : 'Disabled'} category "${categories[index].name}"`);

    return {
      success: true,
      enabled: categories[index].enabled,
      message: `Category "${categories[index].name}" is now ${categories[index].enabled ? 'enabled' : 'disabled'}.`
    };
  }

  // Admin: Delete category
  function deleteCategory(categoryId) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current || current.role !== 'admin') {
      return { success: false, message: 'Unauthorized: Admin access required.' };
    }

    const categories = get(KEYS.CATEGORIES, []);
    const target = categories.find(c => c.id === categoryId);
    if (!target) {
      return { success: false, message: 'Category not found.' };
    }

    const remaining = categories.filter(c => c.id !== categoryId);
    set(KEYS.CATEGORIES, remaining);

    logAudit('Admin Action', current.email, `Deleted category "${target.name}"`);

    return {
      success: true,
      message: `Category "${target.name}" deleted.`
    };
  }

  // ---------- Audit & System Reports ----------

  function getAuditLogs() {
    return get(KEYS.LOGS, []);
  }

  return {
    getSystemMetrics,
    getUsers,
    getUserDetails,
    toggleUserStatus,
    deleteUser,
    getAllCategories,
    addSystemCategory,
    toggleCategoryStatus,
    deleteCategory,
    getAuditLogs
  };
})();
