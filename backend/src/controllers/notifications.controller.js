const Notification = require('../models/notification.model');
const { triggerUserEvent } = require('../services/pusher.service');

function getCurrentUserId(req) {
  return req.session?.user?.id || req.user?.id || null;
}

async function emitNotificationSyncEvent(userId, action, payload = {}) {
  try {
    const unreadCount = await Notification.countDocuments({
      user_id: String(userId),
      is_read: false,
    });

    await Promise.all([
      triggerUserEvent(userId, 'notifications:changed', { action, ...payload, unreadCount }),
      triggerUserEvent(userId, 'notifications:unread-count', { unreadCount }),
    ]);
  } catch (error) {
    console.error('Failed to emit notification realtime event:', error);
  }
}

async function getNotifications(req, res) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ user_id: String(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user_id: String(userId) })
    ]);

    const unreadCount = await Notification.countDocuments({ 
      user_id: String(userId), 
      is_read: false 
    });

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông báo' });
  }
}

async function getUnreadCount(req, res) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
  }

  try {
    const count = await Notification.countDocuments({ 
      user_id: String(userId), 
      is_read: false 
    });

    return res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
}

async function markAsRead(req, res) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
  }

  const { notificationId } = req.params;

  try {
    if (notificationId) {
      await Notification.updateOne(
        { _id: notificationId, user_id: String(userId) },
        { is_read: true }
      );
      await emitNotificationSyncEvent(userId, 'mark-read', { notificationId });
    } else {
      await Notification.updateMany(
        { user_id: String(userId), is_read: false },
        { is_read: true }
      );
      await emitNotificationSyncEvent(userId, 'mark-read-all');
    }

    return res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
}

async function deleteNotification(req, res) {
  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
  }

  const { notificationId } = req.params;

  try {
    await Notification.deleteOne({ 
      _id: notificationId, 
      user_id: String(userId) 
    });

    await emitNotificationSyncEvent(userId, 'delete', { notificationId });

    return res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification
};
