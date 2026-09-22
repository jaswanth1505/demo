/**
 * BudgetBuddy — Module 2: User Module
 * Manages user profile, balance calculations, income/expense aggregation,
 * and user dashboard metrics.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.User = (function () {
  'use strict';

  const { KEYS, get, set, logAudit } = BudgetBuddy.Storage;

  // Compute overall financial metrics for current user
  function getFinancialSummary(userId = null) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    const uid = userId || (current ? current.id : null);

    if (!uid) {
      return { totalBalance: 0, totalIncome: 0, totalExpenses: 0, netSavings: 0, transactionCount: 0 };
    }

    const allTx = get(KEYS.TRANSACTIONS, []);
    const userTx = allTx.filter(t => t.userId === uid);

    let totalIncome = 0;
    let totalExpenses = 0;

    userTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpenses += amt;
      }
    });

    // Accounts balance calculation
    const allAccounts = get(KEYS.ACCOUNTS, []);
    const userAccounts = allAccounts.filter(a => a.userId === uid);
    const totalBalance = userAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      transactionCount: userTx.length
    };
  }

  // Get recent transactions (e.g. latest 5 entries)
  function getRecentTransactions(limit = 5) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return [];

    const allTx = get(KEYS.TRANSACTIONS, []);
    return allTx
      .filter(t => t.userId === current.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }

  // Update profile information
  function updateProfile(name, email, currentPassword = '', newPassword = '') {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'User not authenticated' };

    const users = get(KEYS.USERS, []);
    const userIndex = users.findIndex(u => u.id === current.id);

    if (userIndex === -1) {
      return { success: false, message: 'User record not found' };
    }

    const cleanEmail = email.trim().toLowerCase();
    // Check if another user has this email
    const duplicate = users.find(u => u.email.toLowerCase() === cleanEmail && u.id !== current.id);
    if (duplicate) {
      return { success: false, message: 'Email address is already in use by another user.' };
    }

    if (newPassword) {
      if (current.password !== currentPassword) {
        return { success: false, message: 'Current password does not match.' };
      }
      if (newPassword.length < 4) {
        return { success: false, message: 'New password must be at least 4 characters long.' };
      }
      users[userIndex].password = newPassword;
    }

    users[userIndex].name = name.trim();
    users[userIndex].email = cleanEmail;

    set(KEYS.USERS, users);
    set(KEYS.CURRENT_USER, users[userIndex]);

    logAudit('Profile Update', users[userIndex].email, 'User updated personal profile');

    return {
      success: true,
      user: users[userIndex],
      message: 'Profile updated successfully!'
    };
  }

  return {
    getFinancialSummary,
    getRecentTransactions,
    updateProfile
  };
})();
