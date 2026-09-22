/**
 * BudgetBuddy — Module 6: Recurring Expense Management
 * Manages recurring expenses (Subscriptions, Rent, EMI, Utilities)
 * and upcoming payment reminders with one-click payment execution.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Recurring = (function () {
  'use strict';

  const { KEYS, get, set, generateId, logAudit } = BudgetBuddy.Storage;

  // Compute next due date from a base date and frequency
  function calculateNextDueDate(baseDateStr, frequency) {
    const base = new Date(baseDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let next = new Date(base);
    next.setHours(0, 0, 0, 0);

    // If next is in the past, advance until it's today or in future
    while (next < today) {
      if (frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (frequency === 'yearly') {
        next.setFullYear(next.getFullYear() + 1);
      } else {
        // default monthly
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next.toISOString().split('T')[0];
  }

  // Get all recurring expenses for current user
  function getRecurringExpenses() {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return [];

    const all = get(KEYS.RECURRING, []);
    return all.filter(r => r.userId === current.id);
  }

  // Get upcoming payments with days remaining calculation
  function getUpcomingPayments() {
    const list = getRecurringExpenses();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return list.map(item => {
      const nextDate = calculateNextDueDate(item.dueDate, item.frequency);
      const target = new Date(nextDate);
      target.setHours(0, 0, 0, 0);

      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dueText = '';
      if (diffDays === 0) {
        dueText = 'Due Today';
      } else if (diffDays === 1) {
        dueText = 'Due Tomorrow';
      } else if (diffDays < 0) {
        dueText = `Overdue by ${Math.abs(diffDays)} days`;
      } else {
        dueText = `Due in ${diffDays} days`;
      }

      return {
        ...item,
        nextDueDate: nextDate,
        diffDays,
        dueText,
        isUrgent: diffDays <= 3
      };
    }).sort((a, b) => a.diffDays - b.diffDays);
  }

  // Add a recurring expense rule
  function addRecurringExpense(data) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: 'Please provide a valid positive amount.' };
    }

    if (!data.title || !data.title.trim()) {
      return { success: false, message: 'Please provide a title (e.g. Netflix, Rent).' };
    }

    const newRule = {
      id: generateId('rec'),
      userId: current.id,
      title: data.title.trim(),
      amount: amount,
      category: data.category || 'Bills',
      accountId: data.accountId || 'acc_bank',
      frequency: data.frequency || 'monthly',
      dueDate: data.dueDate || new Date().toISOString().split('T')[0],
      autoLog: !!data.autoLog
    };

    const all = get(KEYS.RECURRING, []);
    all.push(newRule);
    set(KEYS.RECURRING, all);

    logAudit('Add Recurring', current.email, `Created recurring bill: ${newRule.title} (₹${newRule.amount})`);

    return {
      success: true,
      recurring: newRule,
      message: `Recurring payment for "${newRule.title}" scheduled!`
    };
  }

  // Delete a recurring expense rule
  function deleteRecurringExpense(id) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const all = get(KEYS.RECURRING, []);
    const rule = all.find(r => r.id === id && r.userId === current.id);

    if (!rule) {
      return { success: false, message: 'Recurring payment not found.' };
    }

    const remaining = all.filter(r => r.id !== id);
    set(KEYS.RECURRING, remaining);

    logAudit('Delete Recurring', current.email, `Removed recurring bill: ${rule.title}`);

    return {
      success: true,
      message: `Recurring bill "${rule.title}" deleted.`
    };
  }

  // Quick "Pay Now / Log Expense" action: Logs the expense into Module 3 and advances due date
  function payRecurringExpense(id) {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) return { success: false, message: 'Authentication required' };

    const all = get(KEYS.RECURRING, []);
    const ruleIndex = all.findIndex(r => r.id === id && r.userId === current.id);

    if (ruleIndex === -1) {
      return { success: false, message: 'Payment record not found.' };
    }

    const rule = all[ruleIndex];
    const todayStr = new Date().toISOString().split('T')[0];

    // Log directly into Transactions module
    const txResult = BudgetBuddy.Transactions.addTransaction({
      type: 'expense',
      description: `Recurring: ${rule.title}`,
      amount: rule.amount,
      category: rule.category,
      accountId: rule.accountId,
      date: todayStr,
      notes: `Recurring payment recorded on ${todayStr} (${rule.frequency})`
    });

    if (!txResult.success) {
      return txResult;
    }

    // Advance the recurring item's due date
    const nextDate = new Date();
    if (rule.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (rule.frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    all[ruleIndex].dueDate = nextDate.toISOString().split('T')[0];
    set(KEYS.RECURRING, all);

    logAudit('Pay Recurring', current.email, `Paid recurring bill: ${rule.title} (₹${rule.amount})`);

    return {
      success: true,
      message: `Successfully logged payment for "${rule.title}" of ₹${rule.amount}!`
    };
  }

  return {
    getRecurringExpenses,
    getUpcomingPayments,
    addRecurringExpense,
    deleteRecurringExpense,
    payRecurringExpense
  };
})();
