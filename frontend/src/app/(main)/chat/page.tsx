'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, SendHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { subscribePrivateChannel, unsubscribePrivateChannel } from '@/lib/realtime';

type ChatMessage = {
  _id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'USER' | 'ADMIN' | 'AI';
  sender_name: string;
  content: string;
  createdAt: string;
  is_pending?: boolean;
};

type ChatConversation = {
  _id: string;
  user_unread_count: number;
};

type ChatPagination = {
  hasMore?: boolean;
  nextCursor?: string | null;
};

function renderMessageContent(content: string): ReactNode {
  if (!content) return null;

  const lines = content.split('\n');
  const result: ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: ReactNode[] } | null = null;

  const parseInline = (text: string): ReactNode[] => {
    // Regex for bold (**text**), italic (*text* or _text_), links ([text](url)), and absolute URLs
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__| _.*?_|\[.*?\]\(.*?\)|https?:\/\/[^\s]+)/g);
    return parts.map((part, i) => {
      if (!part) return null;
      
      // Bold
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      // Italic
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      }
      // Markdown Link [text](url)
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <Link key={i} href={linkMatch[2]} className="text-blue-500 hover:underline font-medium">
            {linkMatch[1]}
          </Link>
        );
      }
      // plain URL
      if (part.startsWith('http')) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const flushList = (key: number) => {
    if (!currentList) return null;
    const ListTag = currentList.type;
    const element = (
      <ListTag key={`list-${key}`} className={`my-2 ml-4 ${currentList.type === 'ul' ? 'list-disc' : 'list-decimal'} space-y-1`}>
        {currentList.items.map((item, i) => (
          <li key={i} className="pl-1">
            {item}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
    return element;
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Bullet list match
    const bulletMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        if (currentList) result.push(flushList(index));
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(parseInline(bulletMatch[1]));
      return;
    }

    // Numbered list match
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        if (currentList) result.push(flushList(index));
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(parseInline(numberedMatch[2]));
      return;
    }

    // Not a list item
    if (currentList) {
      result.push(flushList(index));
    }

    if (!trimmedLine) {
      result.push(<div key={`br-${index}`} className="h-2" />);
    } else {
      result.push(
        <div key={`p-${index}`} className="leading-relaxed">
          {parseInline(trimmedLine)}
        </div>
      );
    }
  });

  if (currentList) {
    result.push(flushList(lines.length));
  }

  return <div className="space-y-1">{result}</div>;
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadChat = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/chat/my?limit=30');
        if (res.success) {
          setConversation(res.data?.conversation || null);
          setMessages(res.data?.messages || []);
          const pagination = (res.data?.pagination || {}) as ChatPagination;
          setHasMoreOldMessages(Boolean(pagination.hasMore));
          setNextCursor(pagination.nextCursor || null);
          setTimeout(() => scrollMessagesToBottom('auto'), 0);
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channelName = `private-user-${user.id}`;
    const channel = subscribePrivateChannel(channelName);
    if (!channel) return;

    const onChatNewMessage = (payload: { message?: ChatMessage }) => {
      const incoming = payload?.message;
      if (!incoming?._id) return;

      setMessages((prev) => {
        if (prev.some((item) => item._id === incoming._id)) return prev;
        const withoutPending = prev.filter(
          (item) => !(item.is_pending && item.content === incoming.content && item.sender_role === incoming.sender_role)
        );
        return [...withoutPending, incoming];
      });
      setTimeout(() => scrollMessagesToBottom('smooth'), 0);
    };

    const onConversationUpdated = (payload: { conversation?: ChatConversation }) => {
      if (payload?.conversation) setConversation(payload.conversation);
    };

    channel.bind('chat:new-message', onChatNewMessage);
    channel.bind('chat:conversation-updated', onConversationUpdated);

    return () => {
      channel.unbind('chat:new-message', onChatNewMessage);
      channel.unbind('chat:conversation-updated', onConversationUpdated);
      unsubscribePrivateChannel(channelName);
    };
  }, [user]);

  const loadOlderMessages = async () => {
    if (!nextCursor || loadingOlder || !hasMoreOldMessages || !user) return;

    const container = messagesContainerRef.current;
    if (!container) return;
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    setLoadingOlder(true);
    try {
      const res = await apiFetch(`/chat/my?limit=30&before=${encodeURIComponent(nextCursor)}`);
      if (res.success) {
        const olderMessages = (res.data?.messages || []) as ChatMessage[];
        const pagination = (res.data?.pagination || {}) as ChatPagination;

        setHasMoreOldMessages(Boolean(pagination.hasMore));
        setNextCursor(pagination.nextCursor || null);

        if (olderMessages.length > 0) {
          setMessages((prev) => {
            const existing = new Set(prev.map((item) => item._id));
            const mergedOlder = olderMessages.filter((item) => !existing.has(item._id));
            return [...mergedOlder, ...prev];
          });

          setTimeout(() => {
            const nextContainer = messagesContainerRef.current;
            if (!nextContainer) return;
            const diff = nextContainer.scrollHeight - prevScrollHeight;
            nextContainer.scrollTop = prevScrollTop + diff;
          }, 0);
        }
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop <= 40) {
      loadOlderMessages();
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const content = messageText.trim();
    if (!content || sending || !user) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      conversation_id: conversation?._id || 'pending',
      sender_id: String(user.id),
      sender_role: 'USER',
      sender_name: user.fullName || user.email || `User ${user.id}`,
      content,
      createdAt: new Date().toISOString(),
      is_pending: true,
    };

    setSending(true);
    setMessageText('');
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollMessagesToBottom('smooth');

    try {
      const res = await apiFetch('/chat/my/messages', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      if (res.success) {
        const incoming = res.data?.message as ChatMessage;
        const incomingConversation = res.data?.conversation as ChatConversation;

        if (incomingConversation) setConversation(incomingConversation);

        if (incoming?._id) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((item) => item._id !== tempId);
            if (withoutTemp.some((item) => item._id === incoming._id)) return withoutTemp;
            return [...withoutTemp, incoming];
          });
          setTimeout(() => scrollMessagesToBottom('smooth'), 0);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="p-4 rounded-full bg-secondary">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Đăng nhập để chat với AI CSKH</h1>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">Bạn cần đăng nhập để nhận tư vấn sản phẩm và hỗ trợ cơ bản.</p>
        <Link href="/login" className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:opacity-95 active:scale-[0.99]">
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-6">
      <div className="flex h-[calc(100vh-9.5rem)] min-h-[560px] max-h-[760px] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl shadow-black/10 backdrop-blur-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/98 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">AI CSKH VEXTRO</h1>
              <p className="text-xs text-muted-foreground">Tự động tư vấn sản phẩm và hỗ trợ vấn đề cơ bản 24/7</p>
            </div>
          </div>
          {conversation?.user_unread_count ? (
            <span className="text-xs font-bold text-primary">{conversation.user_unread_count} chưa đọc</span>
          ) : null}
        </div>

        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 min-h-0 space-y-3 overflow-y-auto bg-background/80 p-4 md:p-5"
        >
          {loadingOlder ? (
            <div className="text-center text-[11px] text-muted-foreground">Đang tải tin cũ...</div>
          ) : null}
          {loading ? (
            <div className="text-sm text-muted-foreground">Đang tải cuộc trò chuyện...</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Chưa có tin nhắn. Hãy đặt câu hỏi đầu tiên cho AI.
            </div>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_role === 'USER';
              const isAi = message.sender_role === 'AI';
              return (
                <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] md:max-w-[72%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? 'rounded-br-md bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : isAi
                          ? 'rounded-bl-md border border-border bg-card text-card-foreground shadow-sm'
                          : 'rounded-bl-md border border-border bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <div className="break-words">{renderMessageContent(message.content)}</div>
                    <p className={`mt-1 text-[10px] ${isMine ? 'text-blue-100/90' : 'text-muted-foreground'}`}>
                      {message.is_pending ? 'Đang gửi...' : new Date(message.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendMessage} className="shrink-0 border-t border-border bg-card/98 p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Nhập câu hỏi để AI tư vấn sản phẩm..."
              className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              maxLength={4000}
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="h-11 px-4 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50 inline-flex items-center gap-2 hover:bg-blue-500 transition-colors"
            >
              <SendHorizontal className="h-4 w-4" />
              Gửi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
