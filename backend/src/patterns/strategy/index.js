const PricingStrategy = require('./pricing-strategy.interface');
const PercentageDiscountStrategy = require('./percentage-discount.strategy');
const FixedDiscountStrategy = require('./fixed-discount.strategy');
const PricingContext = require('./pricing-context');

module.exports = {
  PricingStrategy,
  PercentageDiscountStrategy,
  FixedDiscountStrategy,
  PricingContext,
};
