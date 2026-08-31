const axios = require('axios');
const env = require('../config/env');

/**
 * Xác thực nội dung đánh giá bằng AI qua OpenRouter
 * @param {string} comment - Nội dung đánh giá
 * @param {number} rating - Số sao đánh giá
 * @returns {Promise<{valid: boolean, reason: string}>}
 */
async function validateReviewContent(comment, rating) {
  // Nếu không có nội dung, mặc định là hợp lệ (chỉ có số sao)
  if (!comment || comment.trim().length === 0) {
    return { valid: true };
  }

  const apiKey = env.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY is not set. Skipping AI validation.');
    return { valid: true };
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.0-flash-001', // Update to a more stable model name
        messages: [
          {
            role: 'system',
            content: `Bạn là một chuyên gia kiểm duyệt nội dung cho sàn thương mại điện tử NexGear (chuyên bán laptop, linh kiện, thiết bị điện tử). 
            Nhiệm vụ của bạn là kiểm tra xem nội dung đánh giá của khách hàng có hợp lệ và văn minh hay không.
            
            Quy tắc:
            1. Không chứa từ ngữ thô tục, chửi thề, xúc phạm.
            2. Không phải là thư rác (spam) hoặc các ký tự vô nghĩa (ví dụ: "asdfghjkl").
            3. Không chứa thông tin quảng cáo cho đối thủ hoặc link lừa đảo.
            4. Nội dung bằng tiếng Việt hoặc tiếng Anh.
            
            Hãy trả về kết quả dưới định dạng JSON:
            {
              "valid": true/false,
              "reason": "Lý do nếu không hợp lệ (tiếng Việt), nếu hợp lệ thì để trống"
            }`
          },
          {
            role: 'user',
            content: `Nội dung đánh giá (${rating} sao): "${comment}"`
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexgear.vn', // Optional, for OpenRouter rankings
          'X-Title': 'NexGear'
        }
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    return {
      valid: !!result.valid,
      reason: result.reason || ''
    };
  } catch (error) {
    console.error('OpenRouter AI Validation Error:', error.response?.data || error.message);
    // Nếu lỗi API AI, mặc định không cho qua để đảm bảo an toàn, hoặc thông báo hệ thống bận
    return { valid: false, reason: 'Hệ thống kiểm duyệt đang bận, vui lòng thử lại sau giây lát.' };
  }
}

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildConversationHistoryText(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) return 'Không có lịch sử hội thoại.';

  return messages
    .slice(-12)
    .map((item) => {
      const role = item?.sender_role || 'USER';
      const content = cleanText(item?.content || '');
      return `${role}: ${content}`;
    })
    .join('\n');
}

function buildProductContextText(products = []) {
  if (!Array.isArray(products) || products.length === 0) return 'Không có dữ liệu sản phẩm.';

  return products
    .slice(0, 15)
    .map((item, index) => {
      const parts = [
        `${index + 1}. ${item.name || 'Sản phẩm'}`,
        item.tagline ? `- ${cleanText(item.tagline)}` : '',
        item.categoryName ? `Danh mục: ${item.categoryName}` : '',
        item.priceRange ? `Giá: ${item.priceRange}` : '',
        item.slug ? `Slug: ${item.slug}` : '',
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function buildProductKnowledgeText(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return 'Không có dữ liệu chi tiết sản phẩm.';
  }

  return products
    .slice(0, 10)
    .map((item, index) => {
      const featureText = parseJsonArray(item.features)
        .slice(0, 6)
        .map((f) => cleanText(typeof f === 'string' ? f : f?.text || ''))
        .filter(Boolean)
        .join('; ');

      const variants = Array.isArray(item.variants) ? item.variants : [];
      const variantText = variants
        .slice(0, 4)
        .map((v) => {
          const requiredInputs = parseJsonArray(v.required_inputs)
            .map((field) => cleanText(field?.label || field?.id || ''))
            .filter(Boolean)
            .join(', ');
          return [
            `Biến thể: ${v.name || 'Không rõ tên'}`,
            v.price ? `Giá: ${Number(v.price).toLocaleString('vi-VN')} VND` : '',
            v.delivery_type ? `Giao: ${String(v.delivery_type).toUpperCase()}` : '',
            requiredInputs ? `Can nhap: ${requiredInputs}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
        })
        .filter(Boolean)
        .join('\n');

      const description = stripHtml(item.description || item.info_html || '').slice(0, 260);

      return [
        `${index + 1}. ${item.name || 'Sản phẩm'}${item.slug ? ` (/${item.slug})` : ''}`,
        item.category_name ? `Danh mục: ${item.category_name}` : '',
        item.tagline ? `Tagline: ${cleanText(item.tagline)}` : '',
        description ? `Mo ta: ${description}` : '',
        featureText ? `Tinh nang: ${featureText}` : '',
        variantText ? `Chi tiết biến thể:\n${variantText}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function buildUserOrderContextText(orders = []) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return 'Khách hàng chưa có đơn hàng nào.';
  }

  return orders
    .slice(0, 10)
    .map((item, index) => {
      const pieces = [
        `${index + 1}. Đơn ${item.order_code || ''}`.trim(),
        item.status ? `Trạng thái: ${item.status}` : '',
        item.product_name ? `Sản phẩm: ${item.product_name}` : '',
        item.variant_name ? `Bien the: ${item.variant_name}` : '',
        item.quantity ? `SL: ${item.quantity}` : '',
        item.total_amount ? `Tong: ${Number(item.total_amount).toLocaleString('vi-VN')} VND` : '',
        item.created_at ? `Ngày tạo: ${new Date(item.created_at).toLocaleString('vi-VN')}` : '',
        item.completed_at ? `Hoàn tất: ${new Date(item.completed_at).toLocaleString('vi-VN')}` : '',
      ].filter(Boolean);
      return pieces.join(' | ');
    })
    .join('\n');
}

/**
 * Sinh phan hoi CSKH tu dong cho chat.
 * @param {{
 *   userMessage: string,
 *   systemPrompt?: string,
 *   trainingInstructions?: string,
 *   conversationHistory?: Array<{sender_role: string, content: string}>,
 *   productContext?: Array<{name?: string, tagline?: string, categoryName?: string, priceRange?: string, slug?: string}>,
 *   productKnowledgeContext?: Array<any>,
 *   userOrderContext?: Array<any>
 * }} input
 * @returns {Promise<string|null>}
 */
async function generateCustomerSupportReply(input = {}) {
  const apiKey = env.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY is not set. Skipping AI auto reply.');
    return null;
  }

  const userMessage = cleanText(input.userMessage || '');
  if (!userMessage) {
    return null;
  }

  const systemPrompt = cleanText(input.systemPrompt) || 'Bạn là AI CSKH của NexGear.';
  const trainingInstructions = String(input.trainingInstructions || '').trim();
  const conversationHistoryText = buildConversationHistoryText(input.conversationHistory);
  const productContextText = buildProductContextText(input.productContext);
  const productKnowledgeText = buildProductKnowledgeText(input.productKnowledgeContext);
  const userOrderContextText = buildUserOrderContextText(input.userOrderContext);

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt} (Lưu ý: Cửa hàng hiện đang kinh doanh Laptop, linh kiện và thiết bị công nghệ).

Quy tắc bắt buộc:
- Trả lời bằng tiếng Việt, thân thiện, rõ ý.
- Có thể hướng dẫn chi tiết theo bước khi khách cần.
- Tập trung tư vấn sản phẩm trên website, trạng thái đơn hàng, và hướng dẫn sử dụng.
- Không tự tạo thông tin ngoài dữ liệu được cung cấp.
- Nếu không chắc chắn, nói rõ và đề xuất khách liên hệ admin.
- Nếu phù hợp, đề xuất sản phẩm cụ thể từ danh sách đã cho.
- Nếu khách hỏi về đơn hàng, ưu tiên dựa trên dữ liệu đơn hàng của chính khách đó.
- Nếu khách hỏi cách sử dụng, dựa trên mô tả sản phẩm + biến thể + input bắt buộc để hướng dẫn.
- Không liệt kê thông tin nhạy cảm (mã tài khoản, mật khẩu, key giao hàng).`,
          },
          {
            role: 'user',
            content: `Hướng dẫn train bổ sung từ admin:
${trainingInstructions || '(Không có)'}

Dữ liệu sản phẩm:
${productContextText}

Dữ liệu chi tiết để hướng dẫn sử dụng:
${productKnowledgeText}

Dữ liệu đơn hàng của khách:
${userOrderContextText}

Lịch sử hội thoại gần đây:
${conversationHistoryText}

Tin nhắn mới của khách:
${userMessage}

Hãy viết 1 phản hồi CSKH phù hợp.
- Nếu câu hỏi đơn giản: trả lời ngắn gọn.
- Nếu câu hỏi cần thao tác: đưa "các bước thực hiện" rõ ràng.`,
          },
        ],
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexgear.vn',
          'X-Title': 'NexGear',
        },
        timeout: 20000,
      }
    );

    const content = cleanText(response.data?.choices?.[0]?.message?.content || '');
    if (!content) {
      return null;
    }
    return content.slice(0, 2000);
  } catch (error) {
    console.error('OpenRouter AI Support Reply Error:', error.response?.data || error.message);
    return null;
  }
}

module.exports = {
  validateReviewContent,
  generateCustomerSupportReply,
};
