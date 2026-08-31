const pool = require('../config/mysql');
const { generateCustomerSupportReply } = require('../services/ai.service');
const { triggerUserEvent, triggerAdminChatEvent } = require('../services/pusher.service');

const AI_SENDER_ID = null; // Use null for AI in sender_id
const AI_SENDER_NAME = 'AI CSKH';
const AI_FALLBACK_REPLY =
  'Cảm ơn bạn đã nhắn tin. Hiện mình chưa đủ dữ liệu để trả lời chính xác. Bạn vui lòng mô tả chi tiết hơn hoặc để lại yêu cầu để admin hỗ trợ tiếp nhé.';

function getCurrentUser(req) {
  return req.session?.user || req.user || null;
}

function normalizeMessage(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: row.id,
    conversation_id: String(row.conversation_id),
    sender_id: String(row.sender_id),
    sender_role: row.sender_role,
    sender_name: row.sender_name || (row.sender_role === 'AI' ? AI_SENDER_NAME : 'User'),
    content: row.message,
    createdAt: row.created_at,
  };
}

function normalizeConversation(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: row.id,
    user_id: String(row.user_id),
    user_email: row.user_email,
    user_name: row.user_full_name || row.user_name,
    last_message: row.last_message || '',
    last_message_at: row.last_message_at || row.updated_at || row.created_at,
    admin_unread_count: row.unread_count_admin || 0,
    user_unread_count: row.unread_count_user || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchConversationMessages(conversationId, options = {}) {
  const limit = Math.min(Math.max(parseInt(options.limit) || 30, 1), 100);
  const beforeDate = options.before ? new Date(options.before) : null;

  let query = 'SELECT * FROM chat_messages WHERE conversation_id = ?';
  const params = [conversationId];

  if (beforeDate && !isNaN(beforeDate.getTime())) {
    query += ' AND created_at < ?';
    params.push(beforeDate);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit + 1);

  const [rows] = await pool.query(query, params);
  
  const hasMore = rows.length > limit;
  const limitedRows = hasMore ? rows.slice(0, limit) : rows;
  const messages = limitedRows.reverse().map(normalizeMessage);
  const nextCursor = hasMore && messages.length ? messages[0].createdAt : null;

  return {
    messages,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
}

async function ensureConversationForUser(user) {
  const [existing] = await pool.query(
    `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
     FROM chat_conversations c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.user_id = ?`,
    [user.id]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new conversation
  const [result] = await pool.query(
    'INSERT INTO chat_conversations (user_id) VALUES (?)',
    [user.id]
  );

  const [newConv] = await pool.query(
    `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
     FROM chat_conversations c 
     JOIN users u ON c.user_id = u.id 
     WHERE c.id = ?`,
    [result.insertId]
  );

  return newConv[0];
}

async function getAdminAiConfigDoc() {
  const [rows] = await pool.query('SELECT * FROM chat_ai_configs LIMIT 1');
  if (rows.length > 0) return rows[0];

  // Default config if not exists
  const defaultConfig = {
    auto_reply_enabled: 1,
    system_prompt: 'Bạn là AI CSKH của VEXTRO. Chào hỏi thân thiện và tư vấn sản phẩm nhiệt tình.',
    training_instructions: 'VEXTRO chuyên bán Laptop và các sản phẩm công nghệ cao cấp.'
  };

  const [result] = await pool.query(
    'INSERT INTO chat_ai_configs (auto_reply_enabled, system_prompt, training_instructions) VALUES (?, ?, ?)',
    [defaultConfig.auto_reply_enabled, defaultConfig.system_prompt, defaultConfig.training_instructions]
  );

  return { id: result.insertId, ...defaultConfig };
}

async function fetchProductCatalogForAi() {
  const [rows] = await pool.query(
    `SELECT p.name, p.slug, p.tagline, c.name AS category_name,
            MIN(v.price) AS min_price, MAX(v.price) AS max_price
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_variants v ON v.product_id = p.id AND v.status <> 'HIDDEN'
     WHERE p.is_active = 1
     GROUP BY p.id, p.name, p.slug, p.tagline, c.name
     ORDER BY p.created_at DESC
     LIMIT 80`
  );

  return rows.map((item) => ({
    name: item.name,
    slug: item.slug,
    tagline: item.tagline || '',
    categoryName: item.category_name || '',
    priceRange: item.min_price ? `${Number(item.min_price).toLocaleString('vi-VN')}đ` : 'Liên hệ',
  }));
}

async function fetchUserOrdersForAi(userId) {
  if (!userId) return [];
  const [rows] = await pool.query(
    `SELECT o.order_code, o.status, o.total_amount, o.created_at,
            oi.product_name, oi.variant_name, oi.quantity
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ?
     ORDER BY o.id DESC
     LIMIT 10`,
    [userId]
  );
  return rows;
}

async function generateAndSendAutoReply(conversationId, userMessage) {
  try {
    const [convRows] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [conversationId]);
    const conversation = convRows[0];
    const aiConfig = await getAdminAiConfigDoc();

    if (!conversation || !aiConfig?.auto_reply_enabled) return;

    const [recentMessages, products, userOrders] = await Promise.all([
      pool.query('SELECT sender_role, message as content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10', [conversationId]).then(r => r[0].reverse()),
      fetchProductCatalogForAi(),
      fetchUserOrdersForAi(conversation.user_id),
    ]);

    const aiReply = await generateCustomerSupportReply({
      userMessage,
      systemPrompt: aiConfig.system_prompt,
      trainingInstructions: aiConfig.training_instructions,
      conversationHistory: recentMessages,
      productContext: products,
      userOrderContext: userOrders,
    });

    const finalReply = (aiReply || AI_FALLBACK_REPLY).trim();

    const [msgResult] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
      [conversationId, AI_SENDER_ID, 'AI', finalReply]
    );

    await pool.query(
      `UPDATE chat_conversations 
       SET last_message = ?, last_message_at = NOW(), unread_count_user = unread_count_user + 1 
       WHERE id = ?`,
      [finalReply, conversationId]
    );

    const [newMsgRows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [msgResult.insertId]);
    const [updatedConvRows] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [conversationId]
    );

    const messagePayload = normalizeMessage(newMsgRows[0]);
    const conversationPayload = normalizeConversation(updatedConvRows[0]);

    await Promise.all([
      triggerUserEvent(conversation.user_id, 'chat:new-message', {
        conversationId: String(conversationId),
        message: messagePayload,
      }),
      triggerUserEvent(conversation.user_id, 'chat:conversation-updated', {
        conversation: conversationPayload,
      }),
      triggerAdminChatEvent('chat:new-message', {
        conversationId: String(conversationId),
        message: messagePayload,
        conversation: conversationPayload,
      }),
    ]);
  } catch (error) {
    console.error('Error generating AI chat reply:', error);
  }
}

async function getMyConversation(req, res) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

  try {
    const conversation = await ensureConversationForUser(user);
    const { messages, pagination } = await fetchConversationMessages(conversation.id, {
      limit: req.query?.limit,
      before: req.query?.before,
    });

    if (!req.query?.before && conversation.unread_count_user > 0) {
      await pool.query('UPDATE chat_conversations SET unread_count_user = 0 WHERE id = ?', [conversation.id]);
      conversation.unread_count_user = 0;
      await triggerUserEvent(user.id, 'chat:conversation-updated', {
        conversation: normalizeConversation(conversation),
      });
    }

    return res.json({
      success: true,
      data: {
        conversation: normalizeConversation(conversation),
        messages,
        pagination,
      },
    });
  } catch (error) {
    console.error('Error getting my conversation:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}

async function sendMyMessage(req, res) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });

  try {
    const conversation = await ensureConversationForUser(user);

    const [msgResult] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
      [conversation.id, user.id, 'USER', content]
    );

    await pool.query(
      `UPDATE chat_conversations 
       SET last_message = ?, last_message_at = NOW(), unread_count_admin = unread_count_admin + 1 
       WHERE id = ?`,
      [content, conversation.id]
    );

    const [newMsgRows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [msgResult.insertId]);
    const [updatedConvRows] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [conversation.id]
    );

    const messagePayload = normalizeMessage(newMsgRows[0]);
    const conversationPayload = normalizeConversation(updatedConvRows[0]);

    await Promise.all([
      triggerUserEvent(user.id, 'chat:new-message', {
        conversationId: String(conversation.id),
        message: messagePayload,
      }),
      triggerUserEvent(user.id, 'chat:conversation-updated', {
        conversation: conversationPayload,
      }),
      triggerAdminChatEvent('chat:new-message', {
        conversationId: String(conversation.id),
        message: messagePayload,
        conversation: conversationPayload,
      }),
    ]);

    void generateAndSendAutoReply(conversation.id, content);

    return res.status(201).json({
      success: true,
      data: {
        conversation: conversationPayload,
        message: messagePayload,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi tin nhắn' });
  }
}

async function markMyConversationRead(req, res) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

  try {
    const [convs] = await pool.query('SELECT * FROM chat_conversations WHERE user_id = ?', [user.id]);
    if (convs.length === 0) return res.json({ success: true });

    await pool.query('UPDATE chat_conversations SET unread_count_user = 0 WHERE id = ?', [convs[0].id]);
    
    const [updated] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [convs[0].id]
    );

    await triggerUserEvent(user.id, 'chat:conversation-updated', {
      conversation: normalizeConversation(updated[0]),
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}

async function getAdminConversations(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       ORDER BY last_message_at DESC, updated_at DESC LIMIT 200`
    );

    return res.json({
      success: true,
      data: {
        conversations: rows.map(normalizeConversation),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách' });
  }
}

async function getAdminConversationMessages(req, res) {
  const { conversationId } = req.params;
  try {
    const [convRows] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [conversationId]
    );
    if (convRows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    const conversation = convRows[0];
    const { messages, pagination } = await fetchConversationMessages(conversationId, {
      limit: req.query?.limit,
      before: req.query?.before,
    });

    if (!req.query?.before && conversation.unread_count_admin > 0) {
      await pool.query('UPDATE chat_conversations SET unread_count_admin = 0 WHERE id = ?', [conversationId]);
      conversation.unread_count_admin = 0;
      const conversationPayload = normalizeConversation(conversation);
      await Promise.all([
        triggerUserEvent(conversation.user_id, 'chat:conversation-updated', {
          conversation: conversationPayload,
        }),
        triggerAdminChatEvent('chat:conversation-updated', {
          conversation: conversationPayload,
        }),
      ]);
    }

    return res.json({
      success: true,
      data: {
        conversation: normalizeConversation(conversation),
        messages,
        pagination,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
}

async function sendAdminMessage(req, res) {
  const admin = getCurrentUser(req);
  const { conversationId } = req.params;
  const content = String(req.body?.content || '').trim();

  if (!content) return res.status(400).json({ success: false, message: 'Nội dung trống' });

  try {
    const [convRows] = await pool.query('SELECT * FROM chat_conversations WHERE id = ?', [conversationId]);
    if (convRows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    const conversation = convRows[0];

    const [msgResult] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?)',
      [conversationId, admin.id, 'ADMIN', content]
    );

    await pool.query(
      `UPDATE chat_conversations 
       SET last_message = ?, last_message_at = NOW(), unread_count_user = unread_count_user + 1 
       WHERE id = ?`,
      [content, conversationId]
    );

    const [newMsgRows] = await pool.query('SELECT * FROM chat_messages WHERE id = ?', [msgResult.insertId]);
    const [updatedConvRows] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [conversationId]
    );

    const messagePayload = normalizeMessage(newMsgRows[0]);
    const conversationPayload = normalizeConversation(updatedConvRows[0]);

    await Promise.all([
      triggerUserEvent(conversation.user_id, 'chat:new-message', {
        conversationId: String(conversationId),
        message: messagePayload,
      }),
      triggerUserEvent(conversation.user_id, 'chat:conversation-updated', {
        conversation: conversationPayload,
      }),
      triggerAdminChatEvent('chat:new-message', {
        conversationId: String(conversationId),
        message: messagePayload,
        conversation: conversationPayload,
      }),
    ]);

    return res.status(201).json({ success: true, data: { message: messagePayload, conversation: conversationPayload } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi' });
  }
}

async function markAdminConversationRead(req, res) {
  const { conversationId } = req.params;
  try {
    await pool.query('UPDATE chat_conversations SET unread_count_admin = 0 WHERE id = ?', [conversationId]);
    const [updated] = await pool.query(
      `SELECT c.*, u.email as user_email, u.full_name as user_full_name 
       FROM chat_conversations c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [conversationId]
    );
    if (updated.length > 0) {
      const conversationPayload = normalizeConversation(updated[0]);
      await Promise.all([
        triggerUserEvent(updated[0].user_id, 'chat:conversation-updated', { conversation: conversationPayload }),
        triggerAdminChatEvent('chat:conversation-updated', { conversation: conversationPayload }),
      ]);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi' });
  }
}

async function getAdminAiConfig(_req, res) {
  try {
    const config = await getAdminAiConfigDoc();
    return res.json({ success: true, data: { config } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi' });
  }
}

async function updateAdminAiConfig(req, res) {
  const admin = getCurrentUser(req);
  const { auto_reply_enabled, system_prompt, training_instructions } = req.body;

  try {
    const config = await getAdminAiConfigDoc();
    await pool.query(
      `UPDATE chat_ai_configs 
       SET auto_reply_enabled = ?, system_prompt = ?, training_instructions = ?, updated_by_id = ?, updated_by_name = ? 
       WHERE id = ?`,
      [
        auto_reply_enabled !== undefined ? auto_reply_enabled : config.auto_reply_enabled,
        system_prompt !== undefined ? system_prompt : config.system_prompt,
        training_instructions !== undefined ? training_instructions : config.training_instructions,
        admin.id,
        admin.fullName,
        config.id
      ]
    );

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi' });
  }
}

module.exports = {
  getMyConversation,
  sendMyMessage,
  markMyConversationRead,
  getAdminConversations,
  getAdminConversationMessages,
  sendAdminMessage,
  markAdminConversationRead,
  getAdminAiConfig,
  updateAdminAiConfig,
};
