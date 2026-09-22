/**
 * BudgetBuddy — Module 5: Budget Management
 * Allows setting monthly and category-wise budgets, tracking expenditures,
 * visual progress bars, and alerting on threshold breaches.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Budget = (function () {
  'use strict';

  const { KEYS, get, set, logAudit } = BudgetBuddy.Storage;

  // Get current user's budget settings
  function getUserBudget() {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { monthlyBudget: 0, categoryBudgets: {} };

    const budgets = get(KEYS.BUDGETS, {});
    return budgets[current.id] || { monthlyBudget: 0, categoryBudgets: {} };
  }

  // Save overall monthly budget
  function saveMonthlyBudget(amount) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) {
      return { success: false, message: 'Please enter a valid budget amount.' };
    }

    const budgets = get(KEYS.BUDGETS, {});
    if (!budgets[current.id]) {
      budgets[current.id] = { monthlyBudget: 0, categoryBudgets: {} };
    }

    budgets[current.id].monthlyBudget = val;
    set(KEYS.BUDGETS, budgets);

    logAudit('Set Budget', current.email, `Updated monthly budget limit to ₹${val}`);

    return {
      success: true,
      monthlyBudget: val,
      message: 'Monthly budget updated successfully!'
    };
  }

  // Set or update a category-specific budget
  function saveCategoryBudget(categoryName, amount) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) {
      return { success: false, message: 'Please enter a valid amount.' };
    }

    const budgets = get(KEYS.BUDGETS, {});
    if (!budgets[current.id]) {
      budgets[current.id] = { monthlyBudget: 0, categoryBudgets: {} };
    }
    if (!budgets[current.id].categoryBudgets) {
      budgets[current.id].categoryBudgets = {};
    }

    budgets[current.id].categoryBudgets[categoryName] = val;
    set(KEYS.BUDGETS, budgets);

    logAudit('Set Category Budget', current.email, `Set ${categoryName} budget to ₹${val}`);

    return {
      success: true,
      message: `Budget for "${categoryName}" updated!`
    };
  }

  // Delete category budget limit
  function removeCategoryBudget(categoryName) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const budgets = get(KEYS.BUDGETS, {});
    if (budgets[current.id] && budgets[current.id].categoryBudgets) {
      delete budgets[current.id].categoryBudgets[categoryName];
      set(KEYS.BUDGETS, budgets);
    }

    return { success: true, message: `Removed budget for ${categoryName}.` };
  }

  // Calculate current month's spending vs budget
  function getBudgetStatus() {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) {
      return {
        monthlyBudget: 0,
        monthlySpent: 0,
        remaining: 0,
        percent: 0,
        isOverBudget: false,
        isWarning: false,
        categoryStatuses: []
      };
    }

    const budgetConfig = getUserBudget();
    const monthlyLimit = budgetConfig.monthlyBudget || 0;

    // Filter transactions for the current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const userTx = get(KEYS.TRANSACTIONS, []).filter(t => {
      if (t.userId !== current.id || t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const monthlySpent = userTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const remaining = monthlyLimit - monthlySpent;
    const percent = monthlyLimit > 0 ? (monthlySpent / monthlyLimit) * 100 : 0;
    const isOverBudget = monthlyLimit > 0 && monthlySpent > monthlyLimit;
    const isWarning = monthlyLimit > 0 && percent >= 80 && !isOverBudget;

    // Calculate category-wise breakdown
    const categorySpentMap = {};
    userTx.forEach(t => {
      categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + (Number(t.amount) || 0);
    });

    const catBudgets = budgetConfig.categoryBudgets || {};
    const categoryStatuses = [];

    // All categories that have either a budget or spending
    const allCatNames = Array.from(new Set([...Object.keys(catBudgets), ...Object.keys(categorySpentMap)]));

    allCatNames.forEach(catName => {
      const budget = catBudgets[catName] || 0;
      const spent = categorySpentMap[catName] || 0;
      const catRemaining = budget - spent;
      const catPercent = budget > 0 ? (spent / budget) * 100 : 0;

      categoryStatuses.push({
        category: catName,
        budget,
        spent,
        remaining: catRemaining,
        percent: catPercent,
        isOverBudget: budget > 0 && spent > budget,
        isWarning: budget > 0 && catPercent >= 80 && spent <= budget
      });
    });

    return {
      monthlyBudget: monthlyLimit,
      monthlySpent,
      remaining,
      percent,
      isOverBudget,
      isWarning,
      categoryStatuses
    };
  }

  return {
    getUserBudget,
    saveMonthlyBudget,
    saveCategoryBudget,
    removeCategoryBudget,
    getBudgetStatus
  };
})();
