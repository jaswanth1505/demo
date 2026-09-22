/**
 * BudgetBuddy — Module 9: Settings & Data Management
 * Handles theme preferences (Dark/Light), multi-currency selection (₹, $, €, £, ¥),
 * RFC 4180 CSV export via JavaScript Blob, and printable financial report generation.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Settings = (function () {
  'use strict';

  const { KEYS, get, set, logAudit } = BudgetBuddy.Storage;

  // Supported Currencies
  const CURRENCIES = [
    { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)' },
    { symbol: '$', code: 'USD', name: 'US Dollar ($)' },
    { symbol: '€', code: 'EUR', name: 'Euro (€)' },
    { symbol: '£', code: 'GBP', name: 'British Pound (£)' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen (¥)' }
  ];

  // Get current settings
  function getSettings() {
    return get(KEYS.SETTINGS, {
      currency: '₹',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY'
    });
  }

  // Update currency symbol
  function setCurrency(symbol) {
    const settings = getSettings();
    settings.currency = symbol || '₹';
    set(KEYS.SETTINGS, settings);

    // Apply currency change globally
    if (window.BudgetBuddy.App && typeof window.BudgetBuddy.App.refreshAll === 'function') {
      window.BudgetBuddy.App.refreshAll();
    }

    return settings.currency;
  }

  // Toggle or set Theme (Dark vs Light)
  function setTheme(theme) {
    const settings = getSettings();
    const newTheme = theme || (settings.theme === 'dark' ? 'light' : 'dark');
    settings.theme = newTheme;
    set(KEYS.SETTINGS, settings);

    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    return newTheme;
  }

  // Apply initial theme on startup
  function applyInitialTheme() {
    const settings = getSettings();
    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // ---------- CSV Data Export ----------

  // Export current user's transactions as CSV file using plain JavaScript
  function exportCSV() {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) {
      return { success: false, message: 'Authentication required' };
    }

    const allTx = get(KEYS.TRANSACTIONS, []).filter(t => t.userId === current.id);
    if (allTx.length === 0) {
      return { success: false, message: 'No transactions recorded to export.' };
    }

    // Sort by date
    const sorted = [...allTx].sort((a, b) => new Date(b.date) - new Date(a.date));

    // CSV Header row
    const headers = ['Transaction ID', 'Date', 'Type', 'Description', 'Category', 'Account ID', 'Amount', 'Notes'];

    // Convert rows
    const rows = sorted.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type.toUpperCase()}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      `"${t.accountId || ''}"`,
      t.amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    // Create a Blob and trigger instant browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `BudgetBuddy_${current.name.replace(/\s+/g, '_')}_Transactions_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logAudit('Data Export', current.email, `Exported ${sorted.length} transactions to CSV`);

    return {
      success: true,
      count: sorted.length,
      message: `Exported ${sorted.length} transactions to CSV file.`
    };
  }

  // ---------- Print Report ----------

  // Trigger browser print dialog formatted for print stylesheets
  function printReport() {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (current) {
      logAudit('Print Report', current.email, 'User printed financial report');
    }
    window.print();
  }

  return {
    CURRENCIES,
    getSettings,
    setCurrency,
    setTheme,
    applyInitialTheme,
    exportCSV,
    printReport
  };
})();
