const { authenticateChannel, getUserChannel, getAdminChatChannel } = require('../services/pusher.service');

function getCurrentUser(req) {
  return req.session?.user || req.user || null;
}

async function authorizePusherChannel(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
  }

  const { socket_id: socketId, channel_name: channelName } = req.body || {};
  if (!socketId || !channelName) {
    return res.status(400).json({ success: false, message: 'Thiếu socket_id hoặc channel_name' });
  }

  const expectedUserChannel = getUserChannel(user.id);
  const adminChatChannel = getAdminChatChannel();

  try {
    if (channelName === expectedUserChannel) {
      const auth = authenticateChannel(socketId, channelName, {
        user_id: String(user.id),
        user_info: {
          id: String(user.id),
          name: user.fullName || user.email || `User ${user.id}`,
          role: user.role || 'USER',
        },
      });
      return res.json(auth);
    }

    if (channelName === adminChatChannel && user.role === 'ADMIN') {
      const auth = authenticateChannel(socketId, channelName, {
        user_id: String(user.id),
        user_info: {
          id: String(user.id),
          name: user.fullName || user.email || `Admin ${user.id}`,
          role: user.role || 'ADMIN',
        },
      });
      return res.json(auth);
    }
  } catch (error) {
    console.error('Failed to authorize pusher channel:', error);
    return res.status(500).json({ success: false, message: 'Realtime chưa được cấu hình' });
  }

  return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập kênh này' });
}

module.exports = {
  authorizePusherChannel,
};
