function formatCurrency(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')}đ`;
}

function formatServiceLabel(productName, variantName) {
  return [productName, variantName].filter(Boolean).join(' - ');
}

function buildOrderStatusNotification({ orderCode, status, productName, variantName }) {
  const serviceLabel = formatServiceLabel(productName, variantName);

  if (status === 'COMPLETED') {
    return {
      title: 'Đơn hàng đã hoàn thành',
      message: [
        `Mã đơn: ${orderCode}`,
        serviceLabel ? `Sản phẩm: ${serviceLabel}` : null,
        'Đơn hàng của bạn đã được xử lý thành công. Vui lòng kiểm tra thông tin trong mục "Đơn hàng của tôi".',
      ]
        .filter(Boolean)
        .join('\n'),
    };
  }

  return {
    title: 'Đơn hàng đang được xử lý',
    message: [
      `Mã đơn: ${orderCode}`,
      serviceLabel ? `Sản phẩm: ${serviceLabel}` : null,
      'Hệ thống đã ghi nhận thanh toán và đang xử lý đơn hàng. Chúng tôi sẽ thông báo ngay khi hoàn tất.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function buildOrderBalanceNotification({ orderCode, amount, balanceAfter, productName, variantName }) {
  const serviceLabel = formatServiceLabel(productName, variantName);

  return {
    title: 'Thanh toán đơn hàng thành công',
    message: [
      `Mã đơn: ${orderCode}`,
      serviceLabel ? `Sản phẩm: ${serviceLabel}` : null,
      `Đã thanh toán: ${formatCurrency(amount)}`,
      `Số dư còn lại: ${formatCurrency(balanceAfter)}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function buildRenewalSuccessNotification({ orderCode, productName, variantName, expiresAt }) {
  return {
    title: 'Gia hạn dịch vụ thành công',
    message: [
      `Mã gia hạn: ${orderCode}`,
      `Dịch vụ: ${formatServiceLabel(productName, variantName)}`,
      `Thời hạn mới: ${new Date(expiresAt).toLocaleString('vi-VN')}`,
    ].join('\n'),
  };
}

function buildRenewalBalanceNotification({ orderCode, amount, balanceAfter, productName, variantName }) {
  return {
    title: 'Thanh toán gia hạn thành công',
    message: [
      `Mã gia hạn: ${orderCode}`,
      `Dịch vụ: ${formatServiceLabel(productName, variantName)}`,
      `Đã thanh toán: ${formatCurrency(amount)}`,
      `Số dư còn lại: ${formatCurrency(balanceAfter)}`,
    ].join('\n'),
  };
}

function buildAdminBalanceAdjustedNotification({ action, amount, reason }) {
  const isAdd = action === 'ADD';

  return {
    title: isAdd ? 'Số dư vừa được cộng' : 'Số dư vừa được điều chỉnh',
    message: [
      `${isAdd ? 'Số tiền được cộng' : 'Số tiền bị trừ'}: ${formatCurrency(amount)}`,
      reason ? `Lý do: ${reason}` : null,
      'Nếu bạn không thực hiện hoặc không rõ nguyên nhân, vui lòng liên hệ hỗ trợ.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function buildAdminNewOrderNotification({
  orderCode,
  status,
  customerName,
  customerEmail,
  productName,
  variantName,
  quantity,
  totalAmount,
}) {
  const isProcessing = status === 'PROCESSING';

  return {
    title: isProcessing ? 'Cần xử lý ngay: Đơn hàng mới' : 'Đơn hàng mới',
    message: [
      isProcessing ? 'Cảnh báo: đơn hàng này đang chờ admin xử lý.' : 'Hệ thống vừa ghi nhận một đơn hàng mới.',
      `Mã đơn: ${orderCode}`,
      `Trạng thái: ${status === 'PROCESSING' ? 'Chờ admin xử lý' : 'Đã xử lý tự động'}`,
      customerName ? `Khách hàng: ${customerName}` : null,
      customerEmail ? `Email: ${customerEmail}` : null,
      `Sản phẩm: ${formatServiceLabel(productName, variantName)}`,
      `Số lượng: ${Number(quantity || 0)}`,
      `Thanh toán: ${formatCurrency(totalAmount)}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function buildLoginSuccessNotification({ ipAddress }) {
  return {
    title: 'Tài khoản vừa đăng nhập',
    message: [`Địa chỉ IP: ${ipAddress}`, 'Nếu đây không phải là bạn, hãy đổi mật khẩu ngay.'].join('\n'),
  };
}

function buildServiceRenewalReminderNotification({ productName, variantName, expiresAt }) {
  return {
    title: 'Dịch vụ sắp hết hạn',
    message: [
      `Dịch vụ: ${formatServiceLabel(productName, variantName)}`,
      `Hết hạn vào: ${new Date(expiresAt).toLocaleString('vi-VN')}`,
      'Bạn nên gia hạn sớm để tránh gián đoạn sử dụng.',
    ].join('\n'),
  };
}

function buildServiceExpiredNotification({ productName, variantName, canRenew }) {
  return {
    title: 'Dịch vụ đã hết hạn',
    message: [
      `Dịch vụ: ${formatServiceLabel(productName, variantName)}`,
      canRenew
        ? 'Dịch vụ đã hết hạn. Bạn cần mua gói mới để tiếp tục sử dụng.'
        : 'Dịch vụ đã hết hạn và hiện không hỗ trợ gia hạn. Vui lòng mua gói mới để tiếp tục sử dụng.',
    ].join('\n'),
  };
}

function normalizeNotificationContent({ type, title, message, data = {} }) {
  if (type === 'ORDER_SUCCESS' || type === 'ORDER_COMPLETED') {
    if (data?.orderCode && data?.expiresAt) {
      return buildRenewalSuccessNotification({
        orderCode: data.orderCode,
        productName: data.productName,
        variantName: data.variantName,
        expiresAt: data.expiresAt,
      });
    }

    if (data?.orderCode) {
      return buildOrderStatusNotification({
        orderCode: data.orderCode,
        status: data.status,
        productName: data.productName,
        variantName: data.variantName,
      });
    }
  }

  if (type === 'BALANCE_ADJUSTED') {
    if (data?.action === 'SUBTRACT' && data?.orderCode && data?.serviceId) {
      return buildRenewalBalanceNotification({
        orderCode: data.orderCode,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        productName: data.productName,
        variantName: data.variantName,
      });
    }

    if (data?.action === 'SUBTRACT' && data?.orderCode) {
      return buildOrderBalanceNotification({
        orderCode: data.orderCode,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        productName: data.productName,
        variantName: data.variantName,
      });
    }

    return buildAdminBalanceAdjustedNotification({
      action: data.action,
      amount: data.amount,
      reason: data.reason,
    });
  }

  if (type === 'LOGIN_SUCCESS' && data?.ipAddress) {
    return buildLoginSuccessNotification({ ipAddress: data.ipAddress });
  }

  if (type === 'SERVICE_RENEWAL_REMINDER' && data?.expiresAt) {
    return buildServiceRenewalReminderNotification({
      productName: data.productName,
      variantName: data.variantName,
      expiresAt: data.expiresAt,
    });
  }

  if (type === 'SERVICE_EXPIRED') {
    return buildServiceExpiredNotification({
      productName: data.productName,
      variantName: data.variantName,
      canRenew: Boolean(data.canRenew),
    });
  }

  return {
    title: String(title || '').trim(),
    message: String(message || '').trim(),
  };
}

module.exports = {
  buildAdminBalanceAdjustedNotification,
  buildAdminNewOrderNotification,
  buildLoginSuccessNotification,
  buildOrderBalanceNotification,
  buildOrderStatusNotification,
  buildRenewalBalanceNotification,
  buildRenewalSuccessNotification,
  buildServiceExpiredNotification,
  buildServiceRenewalReminderNotification,
  formatCurrency,
  formatServiceLabel,
  normalizeNotificationContent,
};
