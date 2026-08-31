const AuthLog = require('../models/log.model');
const ActivityLog = require('../models/activity.model');
const Notification = require('../models/notification.model');
const { triggerUserEvent } = require('./pusher.service');
const { sendUserZaloBotNotification } = require('./zalo-bot.service');
const { normalizeNotificationContent } = require('./notification-content.service');

/**
 * System/Error Logging
 */
async function writeLog({ level = 'info', action, message, meta = {} }) {
  try {
    await AuthLog.create({ level, action, message, meta });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to write log to MongoDB:', error.message);
  }
}

/**
 * User Activity Logging
 */
async function logActivity({ 
  user_id = null, 
  email = null, 
  action, 
  target_id = null, 
  target_type = null, 
  description = null, 
  ip_address = null, 
  user_agent = null,
  meta = {} 
}) {
  try {
    await ActivityLog.create({
      user_id: user_id ? String(user_id) : null,
      email,
      action,
      target_id: target_id ? String(target_id) : null,
      target_type,
      description,
      ip_address,
      user_agent,
      meta
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to log activity to MongoDB:', error.message);
  }
}

/**
 * Create a notification for a user
 */
async function createNotification({
  user_id,
  email = null,
  type,
  title,
  message,
  data = {}
}) {
  try {
    const normalized = normalizeNotificationContent({ type, title, message, data });

    const notification = await Notification.create({
      user_id: String(user_id),
      email,
      type,
      title: normalized.title,
      message: normalized.message,
      data
    });

    const unreadCount = await Notification.countDocuments({
      user_id: String(user_id),
      is_read: false,
    });

    const notificationPayload = {
      _id: String(notification._id),
      user_id: String(notification.user_id),
      email: notification.email,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.is_read,
      data: notification.data,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };

    await Promise.all([
      triggerUserEvent(user_id, 'notifications:new', {
        notification: notificationPayload,
        unreadCount,
      }),
      triggerUserEvent(user_id, 'notifications:unread-count', {
        unreadCount,
      }),
      sendUserZaloBotNotification(user_id, normalized.title, normalized.message),
    ]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to create notification:', error.message);
  }
}

module.exports = {
  writeLog,
  logActivity,
  createNotification,
};
