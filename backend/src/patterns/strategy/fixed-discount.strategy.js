const PricingStrategy = require('./pricing-strategy.interface');

class FixedDiscountStrategy extends PricingStrategy {
  calculate(params = {}) {
    const { subtotal = 0, discountValue = 0 } = params;
    const baseAmount = Math.max(0, Number(subtotal) || 0);
    const fixedAmount = Math.max(0, Number(discountValue) || 0);
    return Math.min(fixedAmount, baseAmount);
  }
}

module.exports = FixedDiscountStrategy;
