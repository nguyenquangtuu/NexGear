'use client';

import Pusher, { Channel } from 'pusher-js';
import type { ChannelAuthorizationCallback } from 'pusher-js';

type ChannelAuthorizationRequestParams = {
  socketId: string;
  channelName: string;
};

let pusherClient: Pusher | null = null;
let cachedCsrfToken: string | undefined;

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

async function ensureCsrfToken(apiUrl: string) {
  const existingToken = getCookie('XSRF-TOKEN');
  if (existingToken) {
    cachedCsrfToken = existingToken;
    return existingToken;
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json().catch(() => null);
    const token = getCookie('XSRF-TOKEN') || (typeof data?.token === 'string' ? data.token : undefined);
    if (token) {
      cachedCsrfToken = token;
    }
    return token;
  } catch {
    return cachedCsrfToken;
  }
}

async function authorizePrivateChannel(
  apiUrl: string,
  params: ChannelAuthorizationRequestParams,
  callback: ChannelAuthorizationCallback,
) {
  try {
    const csrfToken = (await ensureCsrfToken(apiUrl)) || cachedCsrfToken;
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/realtime/pusher/auth`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      },
      body: JSON.stringify({
        socket_id: params.socketId,
        channel_name: params.channelName,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.auth) {
      const message =
        typeof data?.message === 'string' ? data.message : `Realtime auth thất bại (${response.status})`;
      callback(new Error(message), null);
      return;
    }

    callback(null, data);
  } catch (error) {
    callback(error instanceof Error ? error : new Error('Không thể xác thực realtime'), null);
  }
}

function getPusherClient() {
  if (typeof window === 'undefined') return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  if (!key || !cluster) return null;

  if (!pusherClient) {
    pusherClient = new Pusher(key, {
      cluster,
      forceTLS: true,
      channelAuthorization: {
        customHandler: (params, callback) => {
          void authorizePrivateChannel(apiUrl, params, callback);
        },
      },
    });
  }

  return pusherClient;
}

export function subscribePrivateChannel(channelName: string): Channel | null {
  const client = getPusherClient();
  if (!client) return null;
  return client.subscribe(channelName);
}

export function unsubscribePrivateChannel(channelName: string) {
  const client = getPusherClient();
  if (!client) return;
  client.unsubscribe(channelName);
}
