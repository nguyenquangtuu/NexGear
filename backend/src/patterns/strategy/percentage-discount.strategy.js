const PricingStrategy = require('./pricing-strategy.interface');

class PercentageDiscountStrategy extends PricingStrategy {
  calculate(params = {}) {
    const { subtotal = 0, discountValue = 0, maxDiscountAmount = 0 } = params;

    const numericSubtotal = Math.max(0, Number(subtotal) || 0);
    const percentage = Math.max(0, Number(discountValue) || 0);
    const maxCap = Math.max(0, Number(maxDiscountAmount) || 0);

    if (numericSubtotal === 0 || percentage === 0) {
      return 0;
    }

    let discountAmount = (numericSubtotal * percentage) / 100;

    if (maxCap > 0) {
      discountAmount = Math.min(discountAmount, maxCap);
    }

    return Math.max(0, discountAmount);
  }
}

module.exports = PercentageDiscountStrategy;
