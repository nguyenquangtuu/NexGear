const rateLimit = require('express-rate-limit');

/**
 * Giới hạn spam đánh giá
 * Mỗi IP tối đa 5 lần thử đánh giá thất bại trong 10 phút.
 * Nếu vượt quá sẽ bị chặn hoàn toàn việc gọi API đánh giá trong thời gian này để tránh tốn phí AI.
 */
const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 phút
  max: 5, // Tối đa 5 lần thử đánh giá thất bại trong 10 phút.
  message: {
    success: false,
    message: 'Bạn đã thử đánh giá quá nhiều lần. Vui lòng thử lại sau 10 phút để tránh spam.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Chỉ đếm các request thất bại (4xx, 5xx)
});

// Giới hạn cứng cho tất cả request đánh giá (kể cả thành công) để tránh spam tool
const reviewGlobalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 30, // Tối đa 30 đánh giá mỗi giờ cho mỗi IP
  message: {
    success: false,
    message: 'Hệ thống nhận thấy bạn đang đánh giá quá nhanh. Vui lòng chậm lại một chút.'
  }
});

module.exports = {
  reviewLimiter,
  reviewGlobalLimiter
};
