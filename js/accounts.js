/**
 * BudgetBuddy — Module 4: Account & Category Management
 * Manages financial accounts (Cash, Bank, UPI, Credit Card, etc.) and
 * system / user-defined income & expense categories.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Accounts = (function () {
  'use strict';

  const { KEYS, get, set, generateId, logAudit } = BudgetBuddy.Storage;

  // ---------- Account Operations ----------

  // Get all accounts belonging to the current user
  function getAccounts() {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return [];

    const allAccounts = get(KEYS.ACCOUNTS, []);
    return allAccounts.filter(a => a.userId === current.id);
  }

  // Get a single account
  function getAccountById(accountId) {
    const all = get(KEYS.ACCOUNTS, []);
    return all.find(a => a.id === accountId) || null;
  }

  // Add a new account for the current user
  function addAccount(name, type, initialBalance = 0, icon = '💳') {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    if (!name || !name.trim()) {
      return { success: false, message: 'Account name cannot be empty.' };
    }

    const typeIcons = {
      cash: '💵',
      bank: '🏛️',
      upi: '📱',
      credit_card: '💳',
      savings: '💰',
      wallet: '👛'
    };

    const newAccount = {
      id: generateId('acc'),
      userId: current.id,
      name: name.trim(),
      type: type || 'bank',
      balance: parseFloat(initialBalance) || 0,
      icon: icon || typeIcons[type] || '💳'
    };

    const accounts = get(KEYS.ACCOUNTS, []);
    accounts.push(newAccount);
    set(KEYS.ACCOUNTS, accounts);

    logAudit('Add Account', current.email, `Created account ${newAccount.name} (${newAccount.type})`);

    return {
      success: true,
      account: newAccount,
      message: `Account "${newAccount.name}" created successfully!`
    };
  }

  // Delete an account (and optionally warn if transactions exist)
  function deleteAccount(accountId) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const accounts = get(KEYS.ACCOUNTS, []);
    const acc = accounts.find(a => a.id === accountId && a.userId === current.id);

    if (!acc) {
      return { success: false, message: 'Account not found' };
    }

    // Check if user has other accounts
    const userAccounts = accounts.filter(a => a.userId === current.id);
    if (userAccounts.length <= 1) {
      return { success: false, message: 'You must retain at least one active account.' };
    }

    const remaining = accounts.filter(a => a.id !== accountId);
    set(KEYS.ACCOUNTS, remaining);

    logAudit('Delete Account', current.email, `Deleted account ${acc.name}`);

    return {
      success: true,
      message: `Account "${acc.name}" deleted.`
    };
  }

  // ---------- Category Operations ----------

  // Get active categories, optionally filtered by type ('expense' | 'income')
  function getCategories(type = null) {
    const all = get(KEYS.CATEGORIES, []);
    let list = all.filter(c => c.enabled !== false);
    if (type) {
      list = list.filter(c => c.type === type);
    }
    return list;
  }

  // Add custom category
  function addCategory(name, type, color = '#c99a3b', icon = '🏷️') {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    if (!name || !name.trim()) {
      return { success: false, message: 'Category name is required.' };
    }

    const categories = get(KEYS.CATEGORIES, []);
    const cleanName = name.trim();

    if (categories.some(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.type === type)) {
      return { success: false, message: 'A category with this name already exists.' };
    }

    const newCategory = {
      id: generateId('cat'),
      name: cleanName,
      type: type === 'income' ? 'income' : 'expense',
      color: color || '#c99a3b',
      icon: icon || (type === 'income' ? '💵' : '🏷️'),
      enabled: true,
      custom: true
    };

    categories.push(newCategory);
    set(KEYS.CATEGORIES, categories);

    logAudit('Add Category', current.email, `Added category ${newCategory.name} (${newCategory.type})`);

    return {
      success: true,
      category: newCategory,
      message: `Category "${newCategory.name}" added successfully!`
    };
  }

  return {
    getAccounts,
    getAccountById,
    addAccount,
    deleteAccount,
    getCategories,
    addCategory
  };
})();
