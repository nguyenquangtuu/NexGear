function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Only strip non-printable/control characters and trim
    return value
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    const sanitized = {};
    Object.keys(value).forEach((key) => {
      sanitized[key] = sanitizeValue(value[key]);
    });
    return sanitized;
  }

  return value;
}

function sanitizeRequest(req, _res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}

module.exports = {
  sanitizeRequest,
};
