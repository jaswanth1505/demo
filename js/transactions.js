/**
 * BudgetBuddy — Module 3: Expense & Income Management
 * Core CRUD operations for transactions with search, multi-criteria filtering,
 * and automatic synchronization with account balances.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Transactions = (function () {
  'use strict';

  const { KEYS, get, set, generateId, logAudit } = BudgetBuddy.Storage;

  // Adjust account balance based on transaction delta
  function updateAccountBalance(accountId, amountDelta, type) {
    if (!accountId) return;
    const accounts = get(KEYS.ACCOUNTS, []);
    const accIndex = accounts.findIndex(a => a.id === accountId);
    if (accIndex !== -1) {
      // Income increases balance, expense reduces balance
      const multiplier = (type === 'income') ? 1 : -1;
      accounts[accIndex].balance = (Number(accounts[accIndex].balance) || 0) + (amountDelta * multiplier);
      set(KEYS.ACCOUNTS, accounts);
    }
  }

  // Get all transactions for the current user with optional filtering
  function getTransactions(filters = {}) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return [];

    let list = get(KEYS.TRANSACTIONS, []).filter(t => t.userId === current.id);

    // Filter by type: 'income', 'expense', or 'all'
    if (filters.type && filters.type !== 'all') {
      list = list.filter(t => t.type === filters.type);
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      list = list.filter(t => t.category === filters.category);
    }

    // Filter by account
    if (filters.accountId && filters.accountId !== 'all') {
      list = list.filter(t => t.accountId === filters.accountId);
    }

    // Filter by search query (description or notes)
    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      list = list.filter(t => 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Filter by date range
    if (filters.startDate) {
      list = list.filter(t => t.date >= filters.startDate);
    }
    if (filters.endDate) {
      list = list.filter(t => t.date <= filters.endDate);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    return list;
  }

  // Get a single transaction by ID
  function getTransactionById(id) {
    const all = get(KEYS.TRANSACTIONS, []);
    return all.find(t => t.id === id) || null;
  }

  // Add a new transaction
  function addTransaction(data) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Must be logged in to add transaction' };

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Please enter a valid positive amount.' };
    }

    if (!data.description || !data.description.trim()) {
      return { success: false, message: 'Please enter a description.' };
    }

    if (!data.date) {
      return { success: false, message: 'Please select a date.' };
    }

    const newTx = {
      id: generateId('tx'),
      userId: current.id,
      type: data.type === 'income' ? 'income' : 'expense',
      description: data.description.trim(),
      amount: amount,
      category: data.category || 'Other',
      accountId: data.accountId || 'acc_cash',
      date: data.date,
      notes: data.notes ? data.notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    const allTx = get(KEYS.TRANSACTIONS, []);
    allTx.push(newTx);
    set(KEYS.TRANSACTIONS, allTx);

    // Update account balance
    updateAccountBalance(newTx.accountId, newTx.amount, newTx.type);

    logAudit('Add Transaction', current.email, `${newTx.type.toUpperCase()}: ${newTx.description} (₹${newTx.amount})`);

    return {
      success: true,
      transaction: newTx,
      message: `${newTx.type === 'income' ? 'Income' : 'Expense'} recorded successfully!`
    };
  }

  // Edit an existing transaction
  function updateTransaction(id, updatedData) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const allTx = get(KEYS.TRANSACTIONS, []);
    const index = allTx.findIndex(t => t.id === id && t.userId === current.id);

    if (index === -1) {
      return { success: false, message: 'Transaction not found or permission denied' };
    }

    const oldTx = allTx[index];
    const newAmount = parseFloat(updatedData.amount);

    if (isNaN(newAmount) || newAmount <= 0) {
      return { success: false, message: 'Please enter a valid positive amount.' };
    }

    // Revert old account balance
    updateAccountBalance(oldTx.accountId, -oldTx.amount, oldTx.type);

    // Update fields
    allTx[index] = {
      ...oldTx,
      type: updatedData.type === 'income' ? 'income' : 'expense',
      description: updatedData.description.trim(),
      amount: newAmount,
      category: updatedData.category || oldTx.category,
      accountId: updatedData.accountId || oldTx.accountId,
      date: updatedData.date || oldTx.date,
      notes: updatedData.notes ? updatedData.notes.trim() : ''
    };

    // Apply new account balance
    updateAccountBalance(allTx[index].accountId, allTx[index].amount, allTx[index].type);

    set(KEYS.TRANSACTIONS, allTx);
    logAudit('Edit Transaction', current.email, `Updated transaction #${id} to ₹${newAmount}`);

    return {
      success: true,
      transaction: allTx[index],
      message: 'Transaction updated successfully!'
    };
  }

  // Delete a transaction
  function deleteTransaction(id) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const allTx = get(KEYS.TRANSACTIONS, []);
    const tx = allTx.find(t => t.id === id && t.userId === current.id);

    if (!tx) {
      return { success: false, message: 'Transaction not found' };
    }

    // Revert account balance
    updateAccountBalance(tx.accountId, -tx.amount, tx.type);

    // Remove from array
    const remaining = allTx.filter(t => t.id !== id);
    set(KEYS.TRANSACTIONS, remaining);

    logAudit('Delete Transaction', current.email, `Deleted ${tx.type}: ${tx.description} (₹${tx.amount})`);

    return {
      success: true,
      message: 'Transaction deleted successfully.'
    };
  }

  return {
    getTransactions,
    getTransactionById,
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
})();
