/**
 * @file percentage-discount.strategy.js
 * @description Concrete Strategy tính toán chiết khấu theo tỷ lệ phần trăm (%).
 * Kế thừa từ PricingStrategy trong mẫu thiết kế Strategy (GoF).
 */

const PricingStrategy = require('./pricing-strategy.interface');

class PercentageDiscountStrategy extends PricingStrategy {
  /**
   * Tính số tiền chiết khấu dựa trên % giá trị đơn hàng và chặn mức giảm tối đa (nếu có).
   * 
   * @param {Object} params - Tham số tính toán
   * @param {number} params.subtotal - Tổng tiền đơn hàng trước giảm giá
   * @param {number} params.discountValue - Tỷ lệ phần trăm giảm giá (ví dụ: 10 nghĩa là 10%)
   * @param {number} [params.maxDiscountAmount=0] - Mức giảm tối đa cho phép (0: không giới hạn trần)
   * @returns {number} Số tiền được giảm giá
   */
  calculate(params = {}) {
    const { subtotal = 0, discountValue = 0, maxDiscountAmount = 0 } = params;

    const numericSubtotal = Math.max(0, Number(subtotal) || 0);
    const percentage = Math.max(0, Number(discountValue) || 0);
    const maxCap = Math.max(0, Number(maxDiscountAmount) || 0);

    if (numericSubtotal === 0 || percentage === 0) {
      return 0;
    }

    let discountAmount = (numericSubtotal * percentage) / 100;

    // Chặn mức giảm tối đa nếu có thiết lập trần
    if (maxCap > 0) {
      discountAmount = Math.min(discountAmount, maxCap);
    }

    return Math.max(0, discountAmount);
  }
}

module.exports = PercentageDiscountStrategy;
