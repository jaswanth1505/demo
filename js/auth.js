/**
 * BudgetBuddy — Module 1: Authentication & Role Management
 * Handles login, registration, session checks, and role redirection (User vs Admin).
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Auth = (function () {
  'use strict';

  const { KEYS, get, set, generateId, logAudit } = BudgetBuddy.Storage;

  // Get currently logged-in user session
  function getCurrentUser() {
    return get(KEYS.CURRENT_USER, null);
  }

  // Check if session is authenticated
  function isAuthenticated() {
    return getCurrentUser() !== null;
  }

  // Check if currently logged in user is admin
  function isAdmin() {
    const user = getCurrentUser();
    return user !== null && user.role === 'admin';
  }

  // Login with email and password
  function login(email, password) {
    const users = get(KEYS.USERS, []);
    const cleanEmail = email.trim().toLowerCase();

    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No account found with this email address.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    if (user.status !== 'active') {
      return {
        success: false,
        message: 'This account has been deactivated by the administrator. Please contact faculty admin.'
      };
    }

    // Save session
    set(KEYS.CURRENT_USER, user);
    logAudit('User Login', user.email, `Logged in successfully as ${user.role}`);

    return {
      success: true,
      user,
      role: user.role,
      message: `Welcome back, ${user.name}!`
    };
  }

  // Sign up a new user
  function signup(name, email, password, role = 'user') {
    const users = get(KEYS.USERS, []);
    const cleanEmail = email.trim().toLowerCase();

    if (!name.trim()) {
      return { success: false, message: 'Please provide your full name.' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (!password || password.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'An account with this email already exists.' };
    }

    const newUser = {
      id: generateId('usr'),
      name: name.trim(),
      email: cleanEmail,
      password: password,
      role: role === 'admin' ? 'admin' : 'user',
      status: 'active',
      avatar: role === 'admin' ? '👑' : '👤',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    set(KEYS.USERS, users);

    // Create default accounts for new user
    const accounts = get(KEYS.ACCOUNTS, []);
    accounts.push(
      { id: generateId('acc'), userId: newUser.id, name: 'Cash', type: 'cash', balance: 1000, icon: '💵' },
      { id: generateId('acc'), userId: newUser.id, name: 'Bank Account', type: 'bank', balance: 15000, icon: '🏛️' },
      { id: generateId('acc'), userId: newUser.id, name: 'UPI Wallet', type: 'upi', balance: 2500, icon: '📱' },
      { id: generateId('acc'), userId: newUser.id, name: 'Credit Card', type: 'credit_card', balance: 0, icon: '💳' }
    );
    set(KEYS.ACCOUNTS, accounts);

    // Create default budget configuration
    const budgets = get(KEYS.BUDGETS, {});
    budgets[newUser.id] = {
      monthlyBudget: 15000,
      categoryBudgets: {
        'Food': 4000,
        'Travel': 1500,
        'Shopping': 2500,
        'Bills': 2000
      }
    };
    set(KEYS.BUDGETS, budgets);

    // Automatically log in
    set(KEYS.CURRENT_USER, newUser);
    logAudit('User Signup', newUser.email, `New account registered as ${newUser.role}`);

    return {
      success: true,
      user: newUser,
      role: newUser.role,
      message: `Account created successfully! Welcome, ${newUser.name}.`
    };
  }

  // Logout current user
  function logout() {
    const user = getCurrentUser();
    if (user) {
      logAudit('User Logout', user.email, 'User logged out');
    }
    localStorage.removeItem(KEYS.CURRENT_USER);
    return true;
  }

  return {
    getCurrentUser,
    isAuthenticated,
    isAdmin,
    login,
    signup,
    logout
  };
})();
