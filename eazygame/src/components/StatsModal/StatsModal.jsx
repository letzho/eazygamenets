import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import styles from './StatsModal.module.css';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const StatsModal = ({ open, onClose, transactions }) => {
  const [chartData, setChartData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);

  // Categorize transactions based on the rules provided
  const categorizeTransaction = (transaction) => {
    const name = transaction.name.toLowerCase();
    const amount = Math.abs(transaction.amount);
    
    // a) NearMe orders are considered food
    if (name.includes('food') || 
        name.includes('cafe') || 
        name.includes('restaurant') || 
        name.includes('burger') || 
        name.includes('coffee') ||
        name.includes('kitchen') ||
        name.includes('chefs') ||
        name.includes('(enets)') ||
        name.includes('(nets qr)') ||
        name.includes('(prepaid card)')) {
      return { category: 'Food', amount: transaction.type === 'expense' ? -amount : amount };
    }
    
    // b) Shop orders are categorized as merchant
    if (name.includes('purchase:') || 
        name.includes('merchant') ||
        name.includes('shop') ||
        name.includes('store')) {
      return { category: 'Merchant', amount: transaction.type === 'expense' ? -amount : amount };
    }
    
    // c) Top-up in transfer is considered income
    if (name.includes('top-up') && transaction.type === 'income') {
      return { category: 'Income', amount: amount };
    }
    
    // d) Top-up using another card is "top up out transfer"
    if (name.includes('top-up payment for card') && transaction.type === 'expense') {
      return { category: 'Top Up Out Transfer', amount: -amount };
    }
    
    // e) Transfer money (quick send or transfer to friend) is "peer transfer"
    if (name.includes('sent to') || 
        name.includes('quick send to') ||
        name.includes('transfer to')) {
      return { category: 'Peer Transfer', amount: -amount };
    }
    
    // Default category for other transactions
    return { category: 'Other', amount: transaction.type === 'expense' ? -amount : amount };
  };

  // Process transactions for the current month
  const processMonthlyData = () => {
    if (!transactions || transactions.length === 0) {
      setChartData(null);
      setMonthlyData(null);
      return;
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter transactions for current month
    const monthlyTransactions = transactions.filter(txn => {
      const txnDate = new Date(txn.time);
      return txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear;
    });

    // Categorize and sum amounts
    const categories = {};
    let totalExpenses = 0;
    let totalIncome = 0;

    monthlyTransactions.forEach(txn => {
      const { category, amount } = categorizeTransaction(txn);
      
      if (!categories[category]) {
        categories[category] = 0;
      }
      
      categories[category] += amount;
      
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpenses += Math.abs(amount);
      }
    });

    // Prepare chart data
    const labels = Object.keys(categories);
    const data = Object.values(categories).map(Math.abs);
    const colors = [
      '#FF6384', // Food - Red
      '#36A2EB', // Merchant - Blue
      '#4BC0C0', // Income - Teal
      '#FF9F40', // Top Up Out Transfer - Orange
      '#9966FF', // Peer Transfer - Purple
      '#FFCD56', // Other - Yellow
    ];

    const backgroundColors = labels.map((label, index) => {
      switch (label) {
        case 'Food': return '#FF6384';
        case 'Merchant': return '#36A2EB';
        case 'Income': return '#4BC0C0';
        case 'Top Up Out Transfer': return '#FF9F40';
        case 'Peer Transfer': return '#9966FF';
        default: return '#FFCD56';
      }
    });

    setChartData({
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color + '80'),
          borderWidth: 2,
        },
      ],
    });

    setMonthlyData({
      categories,
      totalExpenses,
      totalIncome,
      netAmount: totalIncome - totalExpenses,
      transactionCount: monthlyTransactions.length
    });
  };

  useEffect(() => {
    processMonthlyData();
  }, [transactions]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Monthly Financial Health</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {chartData && monthlyData ? (
            <>
              {/* Summary Cards */}
              <div className={styles.summaryCards}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Income</div>
                  <div className={styles.summaryValueIncome}>
                    +${monthlyData.totalIncome.toFixed(2)}
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Total Expenses</div>
                  <div className={styles.summaryValueExpense}>
                    -${monthlyData.totalExpenses.toFixed(2)}
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Net Amount</div>
                  <div className={`${styles.summaryValue} ${
                    monthlyData.netAmount >= 0 ? styles.positive : styles.negative
                  }`}>
                    {monthlyData.netAmount >= 0 ? '+' : ''}${monthlyData.netAmount.toFixed(2)}
                  </div>
                </div>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>Transactions</div>
                  <div className={styles.summaryValue}>
                    {monthlyData.transactionCount}
                  </div>
                </div>
              </div>

              {/* Pie Chart */}
              <div className={styles.chartContainer}>
                <Pie data={chartData} options={chartOptions} />
              </div>

              {/* Category Breakdown */}
              <div className={styles.categoryBreakdown}>
                <h3 className={styles.breakdownTitle}>Category Breakdown</h3>
                <div className={styles.categoryList}>
                  {Object.entries(monthlyData.categories).map(([category, amount]) => (
                    <div key={category} className={styles.categoryItem}>
                      <div className={styles.categoryInfo}>
                        <div 
                          className={styles.categoryColor}
                          style={{
                            backgroundColor: chartData.datasets[0].backgroundColor[
                              chartData.labels.indexOf(category)
                            ]
                          }}
                        ></div>
                        <span className={styles.categoryName}>{category}</span>
                      </div>
                      <span className={`${styles.categoryAmount} ${
                        amount >= 0 ? styles.positive : styles.negative
                      }`}>
                        {amount >= 0 ? '+' : ''}${amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noData}>
              <div className={styles.noDataIcon}>📊</div>
              <div className={styles.noDataText}>No transaction data available for this month</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
