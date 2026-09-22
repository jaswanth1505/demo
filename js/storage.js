/**
 * BudgetBuddy — Storage & Data Layer Module
 * Simulated persistence layer using localStorage.
 * Pre-seeded with realistic demo data for User and Admin roles.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Storage = (function () {
  'use strict';

  const KEYS = {
    USERS: 'budgetbuddy_users',
    CURRENT_USER: 'budgetbuddy_current_user',
    TRANSACTIONS: 'budgetbuddy_transactions',
    ACCOUNTS: 'budgetbuddy_accounts',
    CATEGORIES: 'budgetbuddy_categories',
    BUDGETS: 'budgetbuddy_budgets',
    RECURRING: 'budgetbuddy_recurring',
    SETTINGS: 'budgetbuddy_settings',
    LOGS: 'budgetbuddy_audit_logs'
  };

  // Helper to format ISO date relative to today
  function relativeDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  // Initial Seed Data
  function getSeedData() {
    const defaultUsers = [
      {
        id: 'usr_admin',
        name: 'Faculty Administrator',
        email: 'admin@budgetbuddy.com',
        password: 'admin123',
        role: 'admin',
        status: 'active',
        avatar: '👑',
        joinedDate: '2026-01-10'
      },
      {
        id: 'usr_demo',
        name: 'Aarav Sharma',
        email: 'user@budgetbuddy.com',
        password: 'user123',
        role: 'user',
        status: 'active',
        avatar: '👤',
        joinedDate: '2026-02-15'
      },
      {
        id: 'usr_rahul',
        name: 'Rahul Verma',
        email: 'rahul@budgetbuddy.com',
        password: 'user123',
        role: 'user',
        status: 'active',
        avatar: '👤',
        joinedDate: '2026-03-01'
      }
    ];

    const defaultAccounts = [
      { id: 'acc_cash', userId: 'usr_demo', name: 'Cash', type: 'cash', balance: 3500, icon: '💵' },
      { id: 'acc_bank', userId: 'usr_demo', name: 'Bank Account (HDFC)', type: 'bank', balance: 48500, icon: '🏛️' },
      { id: 'acc_upi', userId: 'usr_demo', name: 'UPI (PhonePe / GPay)', type: 'upi', balance: 6200, icon: '📱' },
      { id: 'acc_card', userId: 'usr_demo', name: 'Credit Card', type: 'credit_card', balance: -2450, icon: '💳' },
      
      { id: 'acc_cash_r', userId: 'usr_rahul', name: 'Cash', type: 'cash', balance: 1200, icon: '💵' },
      { id: 'acc_bank_r', userId: 'usr_rahul', name: 'SBI Bank', type: 'bank', balance: 22000, icon: '🏛️' }
    ];

    const defaultCategories = [
      // Expense Categories
      { id: 'cat_food', name: 'Food', type: 'expense', color: '#c99a3b', icon: '🍲', enabled: true },
      { id: 'cat_travel', name: 'Travel', type: 'expense', color: '#4c7a6b', icon: '🚌', enabled: true },
      { id: 'cat_shopping', name: 'Shopping', type: 'expense', color: '#7a5ea8', icon: '🛍️', enabled: true },
      { id: 'cat_education', name: 'Education', type: 'expense', color: '#3b7dc9', icon: '📚', enabled: true },
      { id: 'cat_bills', name: 'Bills', type: 'expense', color: '#a4342a', icon: '⚡', enabled: true },
      { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', color: '#d97757', icon: '🍿', enabled: true },
      { id: 'cat_health', name: 'Health', type: 'expense', color: '#2a9d8f', icon: '💊', enabled: true },
      { id: 'cat_other_exp', name: 'Other Expense', type: 'expense', color: '#8b8778', icon: '📦', enabled: true },
      
      // Income Categories
      { id: 'cat_salary', name: 'Salary', type: 'income', color: '#16382c', icon: '💼', enabled: true },
      { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#2d6a4f', icon: '💻', enabled: true },
      { id: 'cat_investment', name: 'Investments', type: 'income', color: '#40916c', icon: '📈', enabled: true },
      { id: 'cat_gifts', name: 'Gifts & Cashback', type: 'income', color: '#52b788', icon: '🎁', enabled: true },
      { id: 'cat_other_inc', name: 'Other Income', type: 'income', color: '#74c69d', icon: '💵', enabled: true }
    ];

    const defaultTransactions = [
      // Monthly Salary
      {
        id: 'tx_1',
        userId: 'usr_demo',
        type: 'income',
        description: 'Monthly Salary Credit',
        amount: 55000,
        category: 'Salary',
        accountId: 'acc_bank',
        date: relativeDate(20),
        notes: 'Tech Corp September Salary'
      },
      {
        id: 'tx_2',
        userId: 'usr_demo',
        type: 'income',
        description: 'Web Development Project',
        amount: 14000,
        category: 'Freelance',
        accountId: 'acc_upi',
        date: relativeDate(12),
        notes: 'College alumni portfolio website'
      },
      // Expenses matching prompt example
      {
        id: 'tx_3',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Team Lunch Buffet',
        amount: 250,
        category: 'Food',
        accountId: 'acc_upi',
        date: relativeDate(0), // Today
        notes: 'Lunch with classmates'
      },
      {
        id: 'tx_4',
        userId: 'usr_demo',
        type: 'expense',
        description: 'City Bus Pass',
        amount: 50,
        category: 'Travel',
        accountId: 'acc_cash',
        date: relativeDate(1),
        notes: 'Bus ticket to campus'
      },
      {
        id: 'tx_5',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Computer Algorithms Textbook',
        amount: 800,
        category: 'Education',
        accountId: 'acc_upi',
        date: relativeDate(2),
        notes: 'Purchased for semester exam'
      },
      {
        id: 'tx_6',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Supermarket Groceries & Fruits',
        amount: 2450,
        category: 'Food',
        accountId: 'acc_card',
        date: relativeDate(4),
        notes: 'Weekly kitchen restock'
      },
      {
        id: 'tx_7',
        userId: 'usr_demo',
        type: 'expense',
        description: 'High Speed Fiber Internet',
        amount: 799,
        category: 'Bills',
        accountId: 'acc_bank',
        date: relativeDate(6),
        notes: 'Broadband monthly bill'
      },
      {
        id: 'tx_8',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Campus Canteen Snacks',
        amount: 800,
        category: 'Food',
        accountId: 'acc_cash',
        date: relativeDate(8),
        notes: 'Snacks and beverages'
      },
      {
        id: 'tx_9',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Metro Transit Smart Card Recharge',
        amount: 500,
        category: 'Travel',
        accountId: 'acc_upi',
        date: relativeDate(10),
        notes: 'Monthly metro pass'
      },
      {
        id: 'tx_10',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Weekend Cinema & Popcorn',
        amount: 650,
        category: 'Entertainment',
        accountId: 'acc_card',
        date: relativeDate(14),
        notes: 'Movie night with friends'
      },
      {
        id: 'tx_11',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Prescription Vitamins & Cough Syrup',
        amount: 420,
        category: 'Health',
        accountId: 'acc_cash',
        date: relativeDate(16),
        notes: 'Pharmacy bill'
      },
      {
        id: 'tx_12',
        userId: 'usr_demo',
        type: 'expense',
        description: 'Casual Denim Jacket',
        amount: 1800,
        category: 'Shopping',
        accountId: 'acc_card',
        date: relativeDate(18),
        notes: 'Autumn shopping festival'
      }
    ];

    const defaultBudgets = {
      usr_demo: {
        monthlyBudget: 20000,
        categoryBudgets: {
          'Food': 5000,
          'Travel': 2000,
          'Shopping': 3000,
          'Education': 2000,
          'Bills': 3500,
          'Entertainment': 2000,
          'Health': 1500
        }
      }
    };

    const defaultRecurring = [
      {
        id: 'rec_1',
        userId: 'usr_demo',
        title: 'Netflix Premium Subscription',
        amount: 649,
        category: 'Entertainment',
        accountId: 'acc_card',
        frequency: 'monthly',
        dueDate: relativeDate(-3), // 3 days in future (e.g. 25 Sep)
        autoLog: false
      },
      {
        id: 'rec_2',
        userId: 'usr_demo',
        title: 'Apartment Rent',
        amount: 12000,
        category: 'Bills',
        accountId: 'acc_bank',
        frequency: 'monthly',
        dueDate: relativeDate(-9), // e.g. 01 Oct
        autoLog: false
      },
      {
        id: 'rec_3',
        userId: 'usr_demo',
        title: 'Airtel Fiber Broadband',
        amount: 799,
        category: 'Bills',
        accountId: 'acc_bank',
        frequency: 'monthly',
        dueDate: relativeDate(-13), // e.g. 05 Oct
        autoLog: false
      }
    ];

    const defaultSettings = {
      currency: '₹',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY'
    };

    const defaultLogs = [
      { id: 'log_1', timestamp: new Date().toISOString(), action: 'System Init', user: 'System', details: 'BudgetBuddy database initialized with seed data' },
      { id: 'log_2', timestamp: new Date().toISOString(), action: 'User Sign In', user: 'admin@budgetbuddy.com', details: 'Admin logged into control dashboard' }
    ];

    return {
      [KEYS.USERS]: defaultUsers,
      [KEYS.ACCOUNTS]: defaultAccounts,
      [KEYS.CATEGORIES]: defaultCategories,
      [KEYS.TRANSACTIONS]: defaultTransactions,
      [KEYS.BUDGETS]: defaultBudgets,
      [KEYS.RECURRING]: defaultRecurring,
      [KEYS.SETTINGS]: defaultSettings,
      [KEYS.LOGS]: defaultLogs
    };
  }

  // Initialize data if not already existing
  function init() {
    const seed = getSeedData();
    Object.keys(seed).forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(seed[key]));
      }
    });

    // Default logged in user to demo user if not logged in
    if (!localStorage.getItem(KEYS.CURRENT_USER)) {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
      const demoUser = users.find(u => u.id === 'usr_demo') || users[0];
      if (demoUser) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(demoUser));
      }
    }
  }

  // Generic Get & Save
  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Storage get error for', key, e);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error for', key, e);
      return false;
    }
  }

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Reset all data back to original seed data
  function resetAll() {
    localStorage.clear();
    init();
    return true;
  }

  // Log an audit action for admin view
  function logAudit(action, user, details) {
    const logs = get(KEYS.LOGS, []);
    logs.unshift({
      id: generateId('log'),
      timestamp: new Date().toISOString(),
      action,
      user: user || 'Anonymous',
      details
    });
    if (logs.length > 200) logs.pop();
    set(KEYS.LOGS, logs);
  }

  // Run initial setup immediately
  init();

  return {
    KEYS,
    get,
    set,
    generateId,
    resetAll,
    logAudit
  };
})();
