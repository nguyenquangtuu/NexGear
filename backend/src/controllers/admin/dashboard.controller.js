const pool = require('../../config/mysql');

const generateTransactionCode = (prefix = 'TX') => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${Date.now()}${random}`;
};

const DASHBOARD_PERIODS = {
  day: true,
  week: true,
  month: true,
  year: true,
};

function normalizeDashboardPeriod(period) {
  return Object.prototype.hasOwnProperty.call(DASHBOARD_PERIODS, period) ? period : 'month';
}

function parseDateValue(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDashboardReference(period, rawValue) {
  const value = String(rawValue || '').trim();
  const now = new Date();
  now.setMinutes(0, 0, 0);

  if (!value) return now;

  if (period === 'day') {
    return parseDateValue(`${value}T00:00:00`) || now;
  }

  if (period === 'week') {
    const matched = value.match(/^(\d{4})-W(\d{2})$/);
    if (!matched) return now;
    const year = Number(matched[1]);
    const week = Number(matched[2]);
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - jan4Day + 1 + ((week - 1) * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  if (period === 'month') {
    const matched = value.match(/^(\d{4})-(\d{2})$/);
    if (!matched) return now;
    return new Date(Number(matched[1]), Number(matched[2]) - 1, 1);
  }

  if (period === 'year') {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 2000 || year > 3000) return now;
    return new Date(year, 0, 1);
  }

  return now;
}

function getDashboardBucketExpression(period, dateExpr) {
  switch (period) {
    case 'day':
      return `DATE_FORMAT(${dateExpr}, '%Y-%m-%d %H:00:00')`;
    case 'week':
      return `DATE(${dateExpr})`;
    case 'month':
      return `DATE(${dateExpr})`;
    case 'year':
      return `DATE_FORMAT(${dateExpr}, '%Y-%m-01')`;
    default:
      return `DATE(${dateExpr})`;
  }
}

function shiftPeriod(date, period, amount) {
  const next = new Date(date);

  if (period === 'day') next.setDate(next.getDate() + amount);
  if (period === 'week') next.setDate(next.getDate() + (amount * 7));
  if (period === 'month') next.setMonth(next.getMonth() + amount);
  if (period === 'year') next.setFullYear(next.getFullYear() + amount);

  return next;
}

function startOfPeriod(date, period) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  if (period === 'day') return next;

  if (period === 'week') {
    const day = next.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    next.setDate(next.getDate() + diff);
    return next;
  }

  if (period === 'month') {
    next.setDate(1);
    return next;
  }

  next.setMonth(0, 1);
  return next;
}

function endOfPeriod(date, period) {
  const next = new Date(date);

  if (period === 'day') {
    next.setHours(23, 59, 59, 999);
    return next;
  }

  if (period === 'week') {
    const start = startOfPeriod(date, 'week');
    start.setDate(start.getDate() + 6);
    start.setHours(23, 59, 59, 999);
    return start;
  }

  if (period === 'month') {
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const end = new Date(date.getFullYear(), 11, 31);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatPeriodKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHourKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:00:00`;
}

function isSamePeriod(a, b, period) {
  if (period === 'day') {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  if (period === 'week') {
    return startOfPeriod(a, 'week').getTime() === startOfPeriod(b, 'week').getTime();
  }

  if (period === 'month') {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  return a.getFullYear() === b.getFullYear();
}

function formatDashboardLabel(date, period) {
  if (period === 'day') {
    return `${String(date.getHours()).padStart(2, '0')}:00`;
  }

  if (period === 'week') {
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  if (period === 'month') {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  return date.toLocaleDateString('vi-VN', { month: '2-digit' });
}

function buildDashboardPeriods(period, referenceDate) {
  const now = new Date();
  const isCurrentReference = isSamePeriod(referenceDate, now, period);
  const points = [];

  if (period === 'day') {
    const start = startOfPeriod(referenceDate, 'day');
    const lastHour = isCurrentReference ? now.getHours() : 23;
    for (let hour = 0; hour <= lastHour; hour += 1) {
      const date = new Date(start);
      date.setHours(hour, 0, 0, 0);
      points.push({
        key: formatHourKey(date),
        label: formatDashboardLabel(date, period),
      });
    }
    return points;
  }

  if (period === 'week') {
    const start = startOfPeriod(referenceDate, 'week');
    const totalDays = isCurrentReference
      ? Math.max(1, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1)
      : 7;
    for (let index = 0; index < totalDays; index += 1) {
      const date = shiftPeriod(start, 'day', index);
      points.push({
        key: formatPeriodKey(date),
        label: formatDashboardLabel(date, period),
      });
    }
    return points;
  }

  if (period === 'month') {
    const start = startOfPeriod(referenceDate, 'month');
    const totalDays = isCurrentReference
      ? now.getDate()
      : new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
    for (let index = 0; index < totalDays; index += 1) {
      const date = shiftPeriod(start, 'day', index);
      points.push({
        key: formatPeriodKey(date),
        label: formatDashboardLabel(date, period),
      });
    }
    return points;
  }

  const start = startOfPeriod(referenceDate, 'year');
  const monthLimit = isCurrentReference ? now.getMonth() : 11;
  for (let monthIndex = 0; monthIndex <= monthLimit; monthIndex += 1) {
    const date = new Date(start);
    date.setMonth(monthIndex, 1);
    points.push({
      key: `${date.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-01`,
      label: formatDashboardLabel(date, period),
    });
  }

  return points;
}

function getDashboardDateRange(period, referenceDate) {
  const now = new Date();
  const start = startOfPeriod(referenceDate, period);
  const end = isSamePeriod(referenceDate, now, period) ? now : endOfPeriod(referenceDate, period);
  return { start, end };
}

const getDashboardStats = async (req, res) => {
  try {
    const period = normalizeDashboardPeriod(String(req.query.period || 'month').toLowerCase());
    const referenceDate = parseDashboardReference(period, req.query.reference);
    const completedDateExpr = 'COALESCE(o.completed_at, o.created_at)';
    const bucketExpr = getDashboardBucketExpression(period, completedDateExpr);
    const { start, end } = getDashboardDateRange(period, referenceDate);

    // Total Users
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');

    // Total Products
    const [[{ totalProducts }]] = await pool.query('SELECT COUNT(*) as totalProducts FROM products');

    // Total Orders
    const [[{ totalOrders }]] = await pool.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [[{ completedOrders }]] = await pool.query("SELECT COUNT(*) as completedOrders FROM orders WHERE status = 'COMPLETED'");

    const [[salesSummary]] = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as totalSales
      FROM orders
      WHERE status = 'COMPLETED'
    `);

    const [[costSummary]] = await pool.query(`
      SELECT COALESCE(SUM(COALESCE(oi.total_cost, oi.quantity * COALESCE(oi.unit_cost, pv.cost_price, 0))), 0) as totalCost
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.status = 'COMPLETED'
    `);

    const totalSales = Number(salesSummary?.totalSales || 0);
    const totalCost = Number(costSummary?.totalCost || 0);
    const totalRevenue = totalSales - totalCost;

    // Recent Orders (last 5)
    const [recentOrders] = await pool.query(`
      SELECT o.*, u.full_name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // Recent Transactions (last 5)
    const [recentTransactions] = await pool.query(`
      SELECT t.*, u.full_name as user_name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    const [salesRows] = await pool.query(`
      SELECT
        ${bucketExpr} as bucket,
        COALESCE(SUM(o.total_amount), 0) as sales
      FROM orders o
      WHERE o.status = 'COMPLETED'
        AND ${completedDateExpr} BETWEEN ? AND ?
      GROUP BY bucket
      ORDER BY bucket ASC
    `, [start, end]);

    const [costRows] = await pool.query(`
      SELECT
        ${bucketExpr} as bucket,
        COALESCE(SUM(COALESCE(oi.total_cost, oi.quantity * COALESCE(oi.unit_cost, pv.cost_price, 0))), 0) as cost
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.status = 'COMPLETED'
        AND ${completedDateExpr} BETWEEN ? AND ?
      GROUP BY bucket
      ORDER BY bucket ASC
    `, [start, end]);

    const salesMap = new Map(salesRows.map((row) => [String(row.bucket), Number(row.sales || 0)]));
    const costMap = new Map(costRows.map((row) => [String(row.bucket), Number(row.cost || 0)]));

    const revenueStats = buildDashboardPeriods(period, referenceDate).map((point) => {
      const sales = salesMap.get(point.key) || 0;
      const cost = costMap.get(point.key) || 0;

      return {
        key: point.key,
        label: point.label,
        sales,
        cost,
        revenue: sales - cost,
      };
    });

    const currentPoint = revenueStats[revenueStats.length - 1] || { revenue: 0 };
    const previousPoint = revenueStats[revenueStats.length - 2] || { revenue: 0 };
    const previousRevenue = Number(previousPoint.revenue || 0);
    const revenueChange = previousRevenue === 0
      ? (Number(currentPoint.revenue || 0) > 0 ? 100 : 0)
      : ((Number(currentPoint.revenue || 0) - previousRevenue) / Math.abs(previousRevenue)) * 100;

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalSales,
          totalCost,
          totalRevenue,
          completedOrders,
          activePeriod: period,
          revenueChange,
        },
        reference: String(req.query.reference || ''),
        recentOrders,
        recentTransactions,
        revenueStats,
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  getDashboardStats,
  generateTransactionCode
};
