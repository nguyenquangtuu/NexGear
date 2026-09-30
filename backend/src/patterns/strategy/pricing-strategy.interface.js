/**
 * @file pricing-strategy.interface.js
 * @description Base Interface / Abstract Class cho các thuật toán tính giá & chiết khấu trong NexGear.
 * 
 * Strategy Pattern (GoF):
 * Định nghĩa một họ thuật toán tính giá, đóng gói từng thuật toán lại và làm cho chúng
 * có thể hoán đổi cho nhau mà không ảnh hưởng đến client gọi tới.
 */

class PricingStrategy {
  constructor() {
    if (new.target === PricingStrategy) {
      throw new TypeError('Không thể khởi tạo trực tiếp instance từ Abstract Class [PricingStrategy].');
    }
  }

  /**
   * Tính toán số tiền chiết khấu dựa trên thông số đơn hàng.
   * @abstract
   * @param {Object} params - Dữ liệu tính toán
   * @param {number} params.subtotal - Tổng tiền đơn hàng trước giảm giá
   * @param {number} params.discountValue - Giá trị giảm (% hoặc tiền mặt)
   * @param {number} [params.maxDiscountAmount] - Giới hạn giảm tối đa (nếu có)
   * @returns {number} Số tiền được giảm
   * @throws {Error} Nếu class con chưa thực thi phương thức này
   */
  calculate(params) {
    throw new Error(
      `Phương thức trừu tượng 'calculate()' chưa được triển khai tại class con [${this.constructor.name}].`
    );
  }
}

module.exports = PricingStrategy;
