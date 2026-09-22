/**
 * BudgetBuddy — Module 7: Analytics & Reports
 * Native Canvas & CSS-based data visualizations without external libraries.
 * Generates category breakdowns, income vs expense charts, spending trends,
 * and text-based distribution progress bars.
 */

window.BudgetBuddy = window.BudgetBuddy || {};

BudgetBuddy.Analytics = (function () {
  'use strict';

  const { KEYS, get } = BudgetBuddy.Storage;

  // Category color palette for visual consistency
  const CATEGORY_COLORS = {
    'Food': '#c99a3b',
    'Travel': '#4c7a6b',
    'Shopping': '#7a5ea8',
    'Education': '#3b7dc9',
    'Bills': '#a4342a',
    'Entertainment': '#d97757',
    'Health': '#2a9d8f',
    'Salary': '#16382c',
    'Freelance': '#2d6a4f',
    'Other': '#8b8778'
  };

  // Get filtered analytics data
  function getAnalyticsData(dateFilter = 'all') {
    const current = BudgetBuddy.Auth.getCurrentUser();
    if (!current) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netSavings: 0,
        categoryBreakdown: {},
        monthlyTrends: [],
        distributionBars: []
      };
    }

    const allTx = get(KEYS.TRANSACTIONS, []).filter(t => t.userId === current.id);
    const now = new Date();

    // Date range filtering
    const filteredTx = allTx.filter(t => {
      if (dateFilter === 'this_month') {
        const d = new Date(t.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      } else if (dateFilter === 'last_3_months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return new Date(t.date) >= threeMonthsAgo;
      }
      return true; // 'all'
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    filteredTx.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;
      }
    });

    const netSavings = totalIncome - totalExpense;

    // Build text/CSS distribution bars
    const sortedCats = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
    const maxCatSpend = sortedCats.length > 0 ? sortedCats[0][1] : 1;

    const distributionBars = sortedCats.map(([cat, amount]) => {
      const percent = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      // Generate block representation e.g. ████████░░
      const filledCount = Math.round((amount / maxCatSpend) * 15);
      const emptyCount = Math.max(0, 15 - filledCount);
      const barText = '█'.repeat(filledCount) + '░'.repeat(emptyCount);

      return {
        category: cat,
        amount,
        percent,
        barText,
        color: CATEGORY_COLORS[cat] || '#8b8778'
      };
    });

    // Monthly trends (group last 6 months)
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`;
      monthlyMap[key] = { monthLabel: key, income: 0, expense: 0 };
    }

    allTx.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`;
      if (monthlyMap[key]) {
        if (t.type === 'income') {
          monthlyMap[key].income += Number(t.amount) || 0;
        } else {
          monthlyMap[key].expense += Number(t.amount) || 0;
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      netSavings,
      categoryBreakdown,
      distributionBars,
      monthlyTrends: Object.values(monthlyMap)
    };
  }

  // Draw Category Pie/Donut Chart on Canvas
  function drawCategoryChart(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const entries = Object.entries(categoryData);
    const total = entries.reduce((sum, [, val]) => sum + val, 0);

    if (total === 0 || entries.length === 0) {
      ctx.fillStyle = '#8b8778';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No expenses recorded for this period', width / 2, height / 2);
      return;
    }

    const centerX = width < 400 ? width / 2 : 110;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = radius * 0.55; // Donut hole

    let startAngle = -Math.PI / 2;

    entries.forEach(([cat, amount]) => {
      const sliceAngle = (amount / total) * Math.PI * 2;
      const color = CATEGORY_COLORS[cat] || '#8b8778';

      // Draw slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      startAngle += sliceAngle;
    });

    // Center text in donut
    ctx.fillStyle = '#16382c';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Total Spend', centerX, centerY - 6);
    ctx.fillStyle = '#c99a3b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`₹${Math.round(total).toLocaleString('en-IN')}`, centerX, centerY + 14);

    // Draw legend if canvas is wide enough
    if (width >= 360) {
      let legendY = 24;
      entries.sort((a, b) => b[1] - a[1]).slice(0, 7).forEach(([cat, amount]) => {
        const percent = Math.round((amount / total) * 100);
        ctx.fillStyle = CATEGORY_COLORS[cat] || '#8b8778';
        ctx.fillRect(230, legendY - 8, 12, 12);

        ctx.fillStyle = '#222';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${cat}: ₹${amount.toLocaleString('en-IN')} (${percent}%)`, 248, legendY + 2);
        legendY += 22;
      });
    }
  }

  // Draw Income vs Expense Bar Chart on Canvas
  function drawComparisonChart(canvasId, totalIncome, totalExpense) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(totalIncome, totalExpense, 1);
    const barWidth = 60;
    const chartBottom = height - 40;
    const chartHeight = height - 70;

    // Income bar
    const incomeHeight = (totalIncome / maxVal) * chartHeight;
    const incomeX = (width / 2) - 80;
    const incomeY = chartBottom - incomeHeight;

    ctx.fillStyle = '#16382c';
    ctx.fillRect(incomeX, incomeY, barWidth, incomeHeight);

    ctx.fillStyle = '#16382c';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`₹${Math.round(totalIncome).toLocaleString('en-IN')}`, incomeX + (barWidth / 2), incomeY - 8);
    ctx.fillText('Income', incomeX + (barWidth / 2), chartBottom + 20);

    // Expense bar
    const expenseHeight = (totalExpense / maxVal) * chartHeight;
    const expenseX = (width / 2) + 20;
    const expenseY = chartBottom - expenseHeight;

    ctx.fillStyle = '#a4342a';
    ctx.fillRect(expenseX, expenseY, barWidth, expenseHeight);

    ctx.fillStyle = '#a4342a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`₹${Math.round(totalExpense).toLocaleString('en-IN')}`, expenseX + (barWidth / 2), expenseY - 8);
    ctx.fillText('Expense', expenseX + (barWidth / 2), chartBottom + 20);

    // Baseline axis
    ctx.strokeStyle = '#d8d2c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, chartBottom);
    ctx.lineTo(width - 30, chartBottom);
    ctx.stroke();
  }

  // Draw Monthly Trend Chart on Canvas
  function drawTrendChart(canvasId, monthlyTrends) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (!monthlyTrends || monthlyTrends.length === 0) return;

    const maxVal = Math.max(...monthlyTrends.map(m => Math.max(m.expense, m.income)), 1000);
    const bottom = height - 35;
    const topPadding = 30;
    const chartHeight = bottom - topPadding;
    const stepX = (width - 60) / (monthlyTrends.length - 1);

    // Draw baseline
    ctx.strokeStyle = '#d8d2c2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, bottom);
    ctx.lineTo(width - 20, bottom);
    ctx.stroke();

    // Expense Line
    ctx.strokeStyle = '#a4342a';
    ctx.lineWidth = 3;
    ctx.beginPath();

    monthlyTrends.forEach((item, index) => {
      const x = 35 + (index * stepX);
      const y = bottom - ((item.expense / maxVal) * chartHeight);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Expense Points & labels
    monthlyTrends.forEach((item, index) => {
      const x = 35 + (index * stepX);
      const y = bottom - ((item.expense / maxVal) * chartHeight);

      ctx.fillStyle = '#a4342a';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Month label
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.monthLabel, x, bottom + 18);
    });

    // Legend
    ctx.fillStyle = '#a4342a';
    ctx.fillRect(width - 120, 10, 12, 12);
    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Expense Trend', width - 102, 20);
  }

  return {
    getAnalyticsData,
    drawCategoryChart,
    drawComparisonChart,
    drawTrendChart
  };
})();
