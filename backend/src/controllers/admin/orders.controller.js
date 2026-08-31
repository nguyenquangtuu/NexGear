const pool = require('../../config/mysql');
const { createNotification } = require('../../services/log.service');
const { getServiceStatus, provisionOrderItemService } = require('../../services/user-service.service');
const { normalizeUploadPathsDeep } = require('../../utils/asset-url');
const { generateTransactionCode } = require('./dashboard.controller');

function normalizeRequiredInputsPayload(value) {
  if (Array.isArray(value)) {
    return value.reduce((acc, item, index) => {
      if (!item || typeof item !== 'object') {
        return acc;
      }

      const normalizedKey = String(item.key ?? '').trim() || `custom_${Date.now()}_${index}`;
      const normalizedLabel = String(item.label ?? item.key ?? '').trim();
      const normalizedValue = String(item.value ?? '').trim();

      if (normalizedLabel && normalizedValue) {
        acc.push({
          key: normalizedKey,
          label: normalizedLabel,
          value: normalizedValue,
        });
      }

      return acc;
    }, []);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value).reduce((acc, [key, rawValue]) => {
    const normalizedKey = String(key || '').trim();
    const normalizedValue = String(rawValue ?? '').trim();

    if (normalizedKey && normalizedValue) {
      acc.push({
        key: normalizedKey,
        label: normalizedKey,
        value: normalizedValue,
      });
    }

    return acc;
  }, []);
}



const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, u.full_name as user_name, u.email as user_email,
             oi.product_name, oi.variant_name, oi.quantity,
             o.delivery_method, o.pickup_store, o.shipping_fee
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders o JOIN users u ON o.user_id = u.id';
    const params = [];
    const whereClauses = [];

    if (status) {
      whereClauses.push('o.status = ?');
      params.push(status);
    }

    if (search) {
      whereClauses.push('(o.order_code LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [orders] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, params.slice(0, params.length - 2));

    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getOrderDetail = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
    }

    const [rows] = await pool.query(
      `SELECT o.*, u.full_name as user_name, u.email as user_email, u.balance as user_balance,
              d.code as discount_code,
              oi.id as order_item_id, oi.product_id, oi.variant_id, oi.product_name, oi.variant_name,
              o.delivery_method, o.pickup_store, o.shipping_fee,
              oi.quantity, oi.unit_price, oi.unit_cost, oi.total_price, oi.total_cost,
              oi.required_inputs,
              oi.service_id, oi.service_action, oi.service_has_expiry, oi.service_duration_days,
              oi.service_allow_renewal, oi.service_started_at, oi.service_expires_at, oi.service_status,
              pv.required_inputs as variant_required_inputs, pv.guide_link,
              p.thumbnail as product_thumbnail
       FROM orders o
       INNER JOIN users u ON u.id = o.user_id
       LEFT JOIN discount_codes d ON d.id = o.discount_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.id = ?`,
      [orderId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const base = rows[0];
    const items = rows
      .filter((row) => row.order_item_id)
      .map((row) => ({
        id: row.order_item_id,
        product_id: row.product_id,
        variant_id: row.variant_id,
        product_name: row.product_name,
        variant_name: row.variant_name,
        quantity: row.quantity,
        unit_price: row.unit_price,
        unit_cost: row.unit_cost,
        total_price: row.total_price,
        total_cost: row.total_cost,
        required_inputs: row.required_inputs,
        product_thumbnail: row.product_thumbnail,
        variant_required_inputs: row.variant_required_inputs,
        guide_link: row.guide_link || '',
        service: row.service_id
          ? {
              id: row.service_id,
              action: row.service_action,
              hasExpiry: Number(row.service_has_expiry) === 1,
              durationDays: Number(row.service_duration_days || 0),
              allowRenewal: Number(row.service_allow_renewal) === 1,
              startedAt: row.service_started_at,
              expiresAt: row.service_expires_at,
              status: row.service_status,
            }
          : null,
      }));

    return res.json({
      success: true,
      data: normalizeUploadPathsDeep({
        id: base.id,
        order_code: base.order_code,
        status: base.status,
        subtotal_amount: base.subtotal_amount,
        discount_amount: base.discount_amount,
        total_amount: base.total_amount,
        balance_applied: base.balance_applied,
        payment_amount: base.payment_amount,
        payment_status: base.sepay_status,
        sepay_status: base.sepay_status,
        created_at: base.created_at,
        completed_at: base.completed_at,
        processed_at: base.processed_at,
        refunded_at: base.refunded_at,
        payment_meta: base.payment_meta,
        discount_code: base.discount_code,
        delivery_method: base.delivery_method,
        pickup_store: base.pickup_store,
        shipping_fee: Number(base.shipping_fee || 0),
        user: {
          id: base.user_id,
          full_name: base.user_name,
          email: base.user_email,
          balance: base.user_balance,
        },
        items,
      }),
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const { refundOrderAmountToBalance, processOrderAfterPayment } = require('../../services/order.service');

const updateOrderStatus = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING_PAYMENT', 'PROCESSING', 'SHIPPING', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    await conn.beginTransaction();

    const [orders] = await conn.query(
      `SELECT o.status, o.order_code, o.user_id, o.balance_applied, o.refunded_at, u.email, u.balance
       FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.id = ? FOR UPDATE`, 
      [id]
    );

    if (!orders.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    const order = orders[0];
    const previousStatus = order.status;

    if (status === previousStatus) {
      await conn.rollback();
      return res.json({ success: true, message: 'Trạng thái không thay đổi' });
    }

    // Case 1: Admin marks as COMPLETED -> Trigger fulfillment logic
    if (status === 'COMPLETED') {
      await processOrderAfterPayment(conn, id, {
        source: 'ADMIN_MANUAL',
        paymentStatus: 'PAID',
        adminId: req.user?.id,
        forceStatus: 'COMPLETED'
      });
      
      createNotification({
        user_id: order.user_id,
        email: order.email,
        type: 'ORDER_COMPLETED',
        title: 'Đơn hàng hoàn thành!',
        message: `Đơn hàng ${order.order_code} của bạn đã được quản trị viên xác nhận thanh toán và xử lý thành công.`,
        data: { orderId: id, orderCode: order.order_code, status: 'COMPLETED' }
      }).catch(err => console.error('Failed to create order completed notification:', err.message));
    } 
    // Case 2: Admin marks as CANCELLED -> Handle refund if needed
    else if (status === 'CANCELLED') {
      if (Number(order.balance_applied || 0) > 0 && !order.refunded_at) {
        await refundOrderAmountToBalance(
          conn,
          order,
          Number(order.balance_applied),
          `Hoàn số dư đơn hàng ${order.order_code} bị hủy bởi quản trị viên`
        );
      }
      
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

      createNotification({
        user_id: order.user_id,
        email: order.email,
        type: 'ORDER_CANCELLED',
        title: 'Đơn hàng đã bị hủy',
        message: `Đơn hàng ${order.order_code} của bạn đã bị hủy bởi quản trị viên.`,
        data: { orderId: id, orderCode: order.order_code, status: 'CANCELLED' }
      }).catch(err => console.error('Failed to create order cancelled notification:', err.message));
    }
    // Case 3: Other statuses (PENDING_PAYMENT, PROCESSING)
    else {
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }

    await conn.commit();
    return res.json({ success: true, message: 'Cập nhật trạng thái đơn hàng thành công' });
  } catch (error) {
    await conn.rollback();
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ' });
  } finally {
    conn.release();
  }
};

const updateOrderItemData = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(itemId) || itemId <= 0) {
      return res.status(400).json({ success: false, message: 'ID đơn hàng hoặc sản phẩm trong đơn không hợp lệ' });
    }

    const [items] = await pool.query(
      'SELECT id FROM order_items WHERE id = ? AND order_id = ? LIMIT 1',
      [itemId, orderId]
    );

    if (!items.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong đơn hàng' });
    }

    const requiredInputs = normalizeRequiredInputsPayload(req.body.required_inputs);

    await pool.query(
      'UPDATE order_items SET required_inputs = ? WHERE id = ? AND order_id = ?',
      [JSON.stringify(requiredInputs), itemId, orderId]
    );

    return res.json({
      success: true,
      message: 'Cập nhật dữ liệu đơn hàng thành công',
      data: {
        item_id: itemId,
        required_inputs: requiredInputs,
      },
    });
  } catch (error) {
    console.error('Error updating order item data:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getAdminServices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const whereClauses = ['us.has_expiry = 1'];
    const params = [];

    if (status) {
      if (status === 'ACTIVE') {
        whereClauses.push('us.expires_at > DATE_ADD(NOW(), INTERVAL 3 DAY)');
      } else if (status === 'EXPIRING_SOON') {
        whereClauses.push('us.expires_at > NOW() AND us.expires_at <= DATE_ADD(NOW(), INTERVAL 3 DAY)');
      } else if (status === 'EXPIRED') {
        whereClauses.push('us.expires_at <= NOW()');
      }
    }

    if (search) {
      whereClauses.push('(CAST(us.id AS CHAR) LIKE ? OR us.product_name LIKE ? OR us.variant_name LIKE ? OR u.email LIKE ? OR u.full_name LIKE ? OR o.order_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT us.*, u.full_name as user_name, u.email as user_email, p.thumbnail as product_thumbnail, o.order_code as latest_order_code
       FROM user_services us
       INNER JOIN users u ON u.id = us.user_id
       LEFT JOIN products p ON p.id = us.product_id
       LEFT JOIN orders o ON o.id = us.latest_order_id
       ${whereSql}
       ORDER BY us.id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM user_services us
       INNER JOIN users u ON u.id = us.user_id
       LEFT JOIN orders o ON o.id = us.latest_order_id
       ${whereSql}`,
      params
    );

    return res.json({
      success: true,
      data: {
        services: normalizeUploadPathsDeep(rows.map((service) => {
          const computedStatus = getServiceStatus(service.expires_at);
          return {
            ...service,
            computed_status: computedStatus,
            can_renew: computedStatus !== 'EXPIRED' && Number(service.allow_renewal) === 1,
          };
        })),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit || 1)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin services:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const updateAdminService = async (req, res) => {
  try {
    const serviceId = Number(req.params.id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({ success: false, message: 'ID dịch vụ không hợp lệ' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM user_services WHERE id = ? LIMIT 1',
      [serviceId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
    }

    const current = rows[0];
    const startedAtInput = req.body.started_at ?? current.started_at;
    const expiresAtInput = req.body.expires_at ?? current.expires_at;
    const productName = String(req.body.product_name ?? current.product_name ?? '').trim();
    const variantName = String(req.body.variant_name ?? current.variant_name ?? '').trim();
    const quantity = Number(req.body.quantity ?? current.quantity ?? 1);
    const durationDays = Number(req.body.duration_days ?? current.duration_days ?? 0);
    const allowRenewal = req.body.allow_renewal === undefined
      ? Number(current.allow_renewal) === 1
      : Boolean(req.body.allow_renewal);

    const startedAt = new Date(startedAtInput);
    const expiresAt = new Date(expiresAtInput);

    if (!productName || !variantName) {
      return res.status(400).json({ success: false, message: 'Tên dịch vụ không được để trống' });
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });
    }

    if (!Number.isFinite(durationDays) || durationDays < 0) {
      return res.status(400).json({ success: false, message: 'Chu kỳ không hợp lệ' });
    }

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      return res.status(400).json({ success: false, message: 'Ngày bắt đầu hoặc hết hạn không hợp lệ' });
    }

    if (expiresAt.getTime() <= startedAt.getTime()) {
      return res.status(400).json({ success: false, message: 'Ngày hết hạn phải lớn hơn ngày bắt đầu' });
    }

    const computedStatus = getServiceStatus(expiresAt);
    const hasDateChanged =
      new Date(current.started_at).getTime() !== startedAt.getTime() ||
      new Date(current.expires_at).getTime() !== expiresAt.getTime();

    await pool.query(
      `UPDATE user_services
       SET product_name = ?, variant_name = ?, quantity = ?, duration_days = ?, allow_renewal = ?,
           started_at = ?, expires_at = ?, status = ?, renewal_reminder_sent_at = ?, expired_notice_sent_at = ?
       WHERE id = ?`,
      [
        productName,
        variantName,
        Math.floor(quantity),
        Math.floor(durationDays),
        allowRenewal ? 1 : 0,
        startedAt,
        expiresAt,
        computedStatus,
        hasDateChanged ? null : current.renewal_reminder_sent_at,
        hasDateChanged ? null : current.expired_notice_sent_at,
        serviceId,
      ]
    );

    const [updatedRows] = await pool.query(
      `SELECT us.*, u.full_name as user_name, u.email as user_email, p.thumbnail as product_thumbnail, o.order_code as latest_order_code
       FROM user_services us
       INNER JOIN users u ON u.id = us.user_id
       LEFT JOIN products p ON p.id = us.product_id
       LEFT JOIN orders o ON o.id = us.latest_order_id
       WHERE us.id = ?
       LIMIT 1`,
      [serviceId]
    );

    const updated = updatedRows[0];

    return res.json({
      success: true,
      message: 'Cập nhật dịch vụ thành công',
      data: normalizeUploadPathsDeep({
        ...updated,
        computed_status: getServiceStatus(updated.expires_at),
        can_renew: getServiceStatus(updated.expires_at) !== 'EXPIRED' && Number(updated.allow_renewal) === 1,
      }),
    });
  } catch (error) {
    console.error('Error updating admin service:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, u.full_name as user_name, u.email as user_email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM transactions t JOIN users u ON t.user_id = u.id';
    const params = [];
    const whereClauses = [];

    if (type) {
      whereClauses.push('t.type = ?');
      params.push(type);
    }

    if (search) {
      whereClauses.push('(t.transaction_code LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [transactions] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, params.slice(0, params.length - 2));

    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

const getAdminServiceDetail = async (req, res) => {
  try {
    const serviceId = Number(req.params.id);
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({ success: false, message: 'ID dịch vụ không hợp lệ' });
    }

    const [rows] = await pool.query(
      `SELECT us.*, u.full_name as user_name, u.email as user_email, u.balance as user_balance, p.thumbnail as product_thumbnail
       FROM user_services us
       INNER JOIN users u ON u.id = us.user_id
       LEFT JOIN products p ON p.id = us.product_id
       WHERE us.id = ?
       LIMIT 1`,
      [serviceId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
    }

    const service = rows[0];

    // Get order history for this service
    const [orderHistory] = await pool.query(
      `SELECT o.id as order_id, o.order_code, o.status as order_status, o.created_at as order_date,
              oi.product_name, oi.variant_name, oi.quantity, oi.total_price, oi.service_action
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE oi.service_id = ?
       ORDER BY o.created_at DESC`,
      [serviceId]
    );

    return res.json({
      success: true,
      data: normalizeUploadPathsDeep({
        ...service,
        computed_status: getServiceStatus(service.expires_at),
        order_history: orderHistory
      })
    });
  } catch (error) {
    console.error('Error fetching admin service detail:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  updateOrderItemData,
  getAdminServices,
  getAdminServiceDetail,
  updateAdminService,
  getTransactions,
};
