const Pusher = require('pusher');
const env = require('../config/env');

const hasPusherConfig =
  Boolean(env.pusher.appId) &&
  Boolean(env.pusher.key) &&
  Boolean(env.pusher.secret) &&
  Boolean(env.pusher.cluster);

const pusher = hasPusherConfig
  ? new Pusher({
      appId: env.pusher.appId,
      key: env.pusher.key,
      secret: env.pusher.secret,
      cluster: env.pusher.cluster,
      useTLS: true,
    })
  : null;

function getUserChannel(userId) {
  return `private-user-${String(userId)}`;
}

function getAdminChatChannel() {
  return 'private-admin-chat';
}

async function triggerChannelEvent(channel, eventName, payload) {
  if (!pusher) return;
  await pusher.trigger(channel, eventName, payload);
}

async function triggerUserEvent(userId, eventName, payload) {
  await triggerChannelEvent(getUserChannel(userId), eventName, payload);
}

async function triggerAdminChatEvent(eventName, payload) {
  await triggerChannelEvent(getAdminChatChannel(), eventName, payload);
}

function authenticateChannel(socketId, channel, customData) {
  if (!pusher) {
    throw new Error('Pusher is not configured');
  }
  return pusher.authorizeChannel(socketId, channel, customData);
}

module.exports = {
  hasPusherConfig,
  getUserChannel,
  getAdminChatChannel,
  triggerChannelEvent,
  triggerUserEvent,
  triggerAdminChatEvent,
  authenticateChannel,
};
