const { createNotification } = require('./log.service');

const EXPIRING_SOON_DAYS = 3;

function addDays(dateInput, days) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + Number(days || 0));
  return date;
}

function getServiceStatus(expiresAtInput) {
  if (!expiresAtInput) return 'ACTIVE';

  const now = Date.now();
  const expiresAt = new Date(expiresAtInput).getTime();

  if (Number.isNaN(expiresAt)) return 'ACTIVE';
  if (expiresAt <= now) return 'EXPIRED';

  const diffDays = (expiresAt - now) / (1000 * 60 * 60 * 24);
  if (diffDays <= EXPIRING_SOON_DAYS) return 'EXPIRING_SOON';

  return 'ACTIVE';
}

function getServiceStatusLabel(status) {
  if (status === 'EXPIRED') return 'Hết hạn';
  if (status === 'EXPIRING_SOON') return 'Sắp hết hạn';
  return 'Đang hoạt động';
}

async function syncUserServices(pool, userId = null) {
  const params = [];
  let whereClause = '';

  if (userId) {
    whereClause = 'WHERE us.user_id = ?';
    params.push(userId);
  }

  const [services] = await pool.query(
    `SELECT us.*, u.email as user_email
     FROM user_services us
     INNER JOIN users u ON u.id = us.user_id
     ${whereClause}
     ORDER BY us.id DESC`,
    params
  );

  for (const service of services) {
    const nextStatus = getServiceStatus(service.expires_at);

    if (nextStatus !== service.status) {
      await pool.query('UPDATE user_services SET status = ? WHERE id = ?', [nextStatus, service.id]);
    }

    const shouldSendRenewalReminder =
      nextStatus === 'EXPIRING_SOON' &&
      Number(service.allow_renewal) === 1 &&
      !service.renewal_reminder_sent_at;

    if (shouldSendRenewalReminder) {
      await createNotification({
        user_id: service.user_id,
        email: service.user_email,
        type: 'SERVICE_RENEWAL_REMINDER',
        title: 'Dịch vụ sắp hết hạn',
        message: `${service.product_name} - ${service.variant_name} sắp hết hạn. Bạn có thể gia hạn trước ${new Date(service.expires_at).toLocaleString('vi-VN')}.`,
        data: {
          serviceId: service.id,
          productName: service.product_name,
          variantName: service.variant_name,
          expiresAt: service.expires_at,
          status: nextStatus,
          canRenew: true,
        },
      }).catch((error) => console.error('Failed to create renewal reminder:', error.message));

      await pool.query('UPDATE user_services SET renewal_reminder_sent_at = NOW() WHERE id = ?', [service.id]);
    }

    const shouldSendExpiredNotice = nextStatus === 'EXPIRED' && !service.expired_notice_sent_at;
    if (shouldSendExpiredNotice) {
      const canRenew = Number(service.allow_renewal) === 1;
      await createNotification({
        user_id: service.user_id,
        email: service.user_email,
        type: 'SERVICE_EXPIRED',
        title: 'Dịch vụ đã hết hạn',
        message: canRenew
          ? `${service.product_name} - ${service.variant_name} đã hết hạn. Sau thời điểm hết hạn bạn không thể gia hạn nữa, vui lòng mua gói mới.`
          : `${service.product_name} - ${service.variant_name} đã hết hạn. Gói này không hỗ trợ gia hạn, vui lòng mua mới để tiếp tục sử dụng.`,
        data: {
          serviceId: service.id,
          productName: service.product_name,
          variantName: service.variant_name,
          expiresAt: service.expires_at,
          status: nextStatus,
          canRenew,
        },
      }).catch((error) => console.error('Failed to create expired notice:', error.message));

      await pool.query('UPDATE user_services SET expired_notice_sent_at = NOW() WHERE id = ?', [service.id]);
    }
  }
}

async function provisionOrderItemService(conn, payload) {
  const {
    orderId,
    orderItemId,
    userId,
    productId,
    variantId,
    productName,
    variantName,
    quantity,
    completedAt,
    hasExpiry,
    expiryDays,
    allowRenewal,
    renewalServiceId = null,
  } = payload;

  if (!hasExpiry || Number(expiryDays || 0) <= 0) {
    return null;
  }

  const completedDate = completedAt ? new Date(completedAt) : new Date();
  let serviceId = null;
  let serviceStartedAt = completedDate;
  let serviceExpiresAt = addDays(completedDate, expiryDays);
  let serviceAction = 'NEW';

  if (renewalServiceId) {
    const [serviceRows] = await conn.query(
      'SELECT * FROM user_services WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE',
      [renewalServiceId, userId]
    );

    if (!serviceRows.length) {
      const error = new Error('Không tìm thấy dịch vụ cần gia hạn');
      error.statusCode = 404;
      throw error;
    }

    const service = serviceRows[0];
    const currentStatus = getServiceStatus(service.expires_at);

    if (currentStatus === 'EXPIRED') {
      const error = new Error('Dịch vụ đã hết hạn, vui lòng mua gói mới');
      error.statusCode = 400;
      throw error;
    }

    if (!Number(service.allow_renewal)) {
      const error = new Error('Gói này không hỗ trợ gia hạn, vui lòng mua mới');
      error.statusCode = 400;
      throw error;
    }

    serviceId = service.id;
    serviceStartedAt = new Date(service.expires_at) > completedDate ? new Date(service.expires_at) : completedDate;
    serviceExpiresAt = addDays(serviceStartedAt, expiryDays);
    serviceAction = 'RENEWAL';

    await conn.query(
      `UPDATE user_services
       SET latest_order_id = ?, latest_order_item_id = ?, product_name = ?, variant_name = ?, quantity = ?,
           duration_days = ?, allow_renewal = ?, started_at = started_at, expires_at = ?, status = ?,
           renewal_reminder_sent_at = NULL, expired_notice_sent_at = NULL, last_renewed_at = NOW()
       WHERE id = ?`,
      [
        orderId,
        orderItemId,
        productName,
        variantName,
        Number(quantity || 1),
        Number(expiryDays || 0),
        allowRenewal ? 1 : 0,
        serviceExpiresAt,
        getServiceStatus(serviceExpiresAt),
        serviceId,
      ]
    );
  } else {
    const [insertService] = await conn.query(
      `INSERT INTO user_services (
        user_id, product_id, variant_id, original_order_id, original_order_item_id, latest_order_id, latest_order_item_id,
        product_name, variant_name, quantity, has_expiry, duration_days, allow_renewal, started_at, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        productId,
        variantId,
        orderId,
        orderItemId,
        orderId,
        orderItemId,
        productName,
        variantName,
        Number(quantity || 1),
        1,
        Number(expiryDays || 0),
        allowRenewal ? 1 : 0,
        serviceStartedAt,
        serviceExpiresAt,
        getServiceStatus(serviceExpiresAt),
      ]
    );
    serviceId = insertService.insertId;
  }

  const serviceStatus = getServiceStatus(serviceExpiresAt);

  await conn.query(
    `UPDATE order_items
     SET service_id = ?, service_action = ?, service_has_expiry = ?, service_duration_days = ?,
         service_allow_renewal = ?, service_started_at = ?, service_expires_at = ?, service_status = ?
     WHERE id = ?`,
    [
      serviceId,
      serviceAction,
      1,
      Number(expiryDays || 0),
      allowRenewal ? 1 : 0,
      serviceStartedAt,
      serviceExpiresAt,
      serviceStatus,
      orderItemId,
    ]
  );

  return {
    id: serviceId,
    action: serviceAction,
    status: serviceStatus,
    statusLabel: getServiceStatusLabel(serviceStatus),
    startedAt: serviceStartedAt,
    expiresAt: serviceExpiresAt,
    hasExpiry: true,
    durationDays: Number(expiryDays || 0),
    allowRenewal: !!allowRenewal,
  };
}

module.exports = {
  EXPIRING_SOON_DAYS,
  addDays,
  getServiceStatus,
  getServiceStatusLabel,
  syncUserServices,
  provisionOrderItemService,
};
