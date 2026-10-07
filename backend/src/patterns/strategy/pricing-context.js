const PricingStrategy = require('./pricing-strategy.interface');
const PercentageDiscountStrategy = require('./percentage-discount.strategy');
const FixedDiscountStrategy = require('./fixed-discount.strategy');

class PricingContext {
  constructor(strategy) {
    if (strategy && !(strategy instanceof PricingStrategy)) {
      throw new TypeError('Strategy must inherit from PricingStrategy');
    }
    this.strategy = strategy || null;
  }

  setStrategy(strategy) {
    if (strategy && !(strategy instanceof PricingStrategy)) {
      throw new TypeError('Strategy must inherit from PricingStrategy');
    }
    this.strategy = strategy;
  }

  calculateDiscount(params = {}) {
    if (!this.strategy) {
      throw new Error('PricingStrategy has not been set');
    }

    const { subtotal = 0 } = params;
    const numericSubtotal = Math.max(0, Number(subtotal) || 0);
    const calculatedDiscount = this.strategy.calculate(params);

    return Math.max(0, Math.min(Number(calculatedDiscount) || 0, numericSubtotal));
  }

  static fromDiscountType(type) {
    const normalizedType = String(type || '').toUpperCase().trim();

    if (normalizedType === 'PERCENT') {
      return new PricingContext(new PercentageDiscountStrategy());
    }

    if (normalizedType === 'FIXED') {
      return new PricingContext(new FixedDiscountStrategy());
    }

    return new PricingContext(new FixedDiscountStrategy());
  }
}

module.exports = PricingContext;
