const PricingStrategy = require('./pricing-strategy.interface');

class FixedDiscountStrategy extends PricingStrategy {
  calculate(params = {}) {
    const { discountValue = 0 } = params;
    const amount = Math.max(0, Number(discountValue) || 0);
    return amount;
  }
}

module.exports = FixedDiscountStrategy;
