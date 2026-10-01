class PricingStrategy {
  constructor() {
    if (new.target === PricingStrategy) {
      throw new TypeError('Cannot construct PricingStrategy instances directly');
    }
  }

  calculate(params) {
    throw new Error('Method calculate() must be implemented');
  }
}

module.exports = PricingStrategy;
