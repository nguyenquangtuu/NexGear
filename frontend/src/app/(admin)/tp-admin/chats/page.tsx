'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  SendHorizontal,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { subscribePrivateChannel, unsubscribePrivateChannel } from '@/lib/realtime';
import { useAuth } from '@/contexts/AuthContext';

type ChatConversation = {
  _id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  last_message: string;
  last_message_at: string;
  admin_unread_count: number;
  user_unread_count: number;
  last_sender_role?: 'USER' | 'ADMIN' | 'AI';
};

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

type ChatPagination = {
  hasMore?: boolean;
  nextCursor?: string | null;
};

type ChatAiConfig = {
  auto_reply_enabled: boolean;
  system_prompt: string;
  training_instructions: string;
  updated_by_name?: string | null;
  updatedAt?: string;
};

type TrainingGuide = {
  id: string;
  title: string;
  content: string;
};

const DEFAULT_AI_CONFIG: ChatAiConfig = {
  auto_reply_enabled: true,
  system_prompt: '',
  training_instructions: '',
};

const TRAINING_GUIDES_PREFIX = '__TRAINING_GUIDES_V1__';

function createTrainingGuide(partial?: Partial<TrainingGuide>): TrainingGuide {
  return {
    id: partial?.id || `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: partial?.title || '',
    content: partial?.content || '',
  };
}

function parseTrainingGuides(raw: string): TrainingGuide[] {
  const normalized = String(raw || '').trim();
  if (!normalized) return [];

  if (normalized.startsWith(TRAINING_GUIDES_PREFIX)) {
    try {
      const parsed = JSON.parse(normalized.slice(TRAINING_GUIDES_PREFIX.length)) as Array<{
        id?: string;
        title?: string;
        content?: string;
      }>;

      return parsed.map((item, index) =>
        createTrainingGuide({
          id: item.id || `guide-import-${index + 1}`,
          title: item.title || '',
          content: item.content || '',
        })
      );
    } catch {
      return [createTrainingGuide({ title: 'Hướng dẫn tổng quát', content: normalized })];
    }
  }

  return [createTrainingGuide({ title: 'Hướng dẫn tổng quát', content: normalized })];
}

function serializeTrainingGuides(guides: TrainingGuide[]): string {
  const normalized = guides
    .map((guide) => ({
      id: guide.id,
      title: guide.title.trim(),
      content: guide.content.trim(),
    }))
    .filter((guide) => guide.title || guide.content);

  if (normalized.length === 0) return '';
  return `${TRAINING_GUIDES_PREFIX}${JSON.stringify(normalized)}`;
}

function renderMessageContent(content: string): ReactNode {
  const plain = String(content || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .trim();

  const lines = plain.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={`sp-${index}`} className="h-2" />;

        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div key={`n-${index}`} className="leading-relaxed">
              <span className="font-semibold">{numberedMatch[1]}.</span> {numberedMatch[2]}
            </div>
          );
        }

        const bulletMatch = line.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={`b-${index}`} className="leading-relaxed">
              • {bulletMatch[1]}
            </div>
          );
        }

        return (
          <div key={`t-${index}`} className="leading-relaxed">
            {line}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminChatsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'conversations' | 'training'>('conversations');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const [aiConfig, setAiConfig] = useState<ChatAiConfig>(DEFAULT_AI_CONFIG);
  const [loadingAiConfig, setLoadingAiConfig] = useState(true);
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [trainingGuides, setTrainingGuides] = useState<TrainingGuide[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item._id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const selectedGuide = useMemo(
    () => trainingGuides.find((guide) => guide.id === selectedGuideId) || null,
    [trainingGuides, selectedGuideId]
  );

  const trainingContentLength = useMemo(
    () => trainingGuides.reduce((total, guide) => total + guide.content.trim().length, 0),
    [trainingGuides]
  );

  const trainingGuidesWithContentCount = useMemo(
    () => trainingGuides.filter((guide) => guide.content.trim().length > 0).length,
    [trainingGuides]
  );

  const selectedGuideWordCount = useMemo(() => {
    if (!selectedGuide?.content.trim()) return 0;
    return selectedGuide.content.trim().split(/\s+/).length;
  }, [selectedGuide]);

  const scrollMessagesToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  const syncTrainingGuides = (nextGuides: TrainingGuide[], nextSelectedId?: string | null) => {
    setTrainingGuides(nextGuides);
    setAiConfig((prev) => ({
      ...prev,
      training_instructions: serializeTrainingGuides(nextGuides),
    }));

    if (typeof nextSelectedId !== 'undefined') {
      setSelectedGuideId(nextSelectedId);
      return;
    }

    if (nextGuides.length === 0) {
      setSelectedGuideId(null);
      return;
    }

    setSelectedGuideId((current) =>
      current && nextGuides.some((guide) => guide.id === current) ? current : nextGuides[0].id
    );
  };

  const addTrainingGuide = () => {
    const newGuide = createTrainingGuide({
      title: `Hướng dẫn ${trainingGuides.length + 1}`,
    });
    syncTrainingGuides([...trainingGuides, newGuide], newGuide.id);
  };

  const updateSelectedGuide = (field: 'title' | 'content', value: string) => {
    if (!selectedGuideId) return;
    const nextGuides = trainingGuides.map((guide) =>
      guide.id === selectedGuideId ? { ...guide, [field]: value } : guide
    );
    syncTrainingGuides(nextGuides, selectedGuideId);
  };

  const removeTrainingGuide = (guideId: string) => {
    const currentIndex = trainingGuides.findIndex((guide) => guide.id === guideId);
    const nextGuides = trainingGuides.filter((guide) => guide.id !== guideId);
    const nextSelected =
      nextGuides[currentIndex]?.id || nextGuides[currentIndex - 1]?.id || nextGuides[0]?.id || null;
    syncTrainingGuides(nextGuides, nextSelected);
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await apiFetch('/chat/admin/conversations');
      if (res.success) {
        const list: ChatConversation[] = res.data?.conversations || [];
        setConversations(list);
        if (!activeConversationId && list.length > 0) {
          setActiveConversationId(list[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadAiConfig = async () => {
    setLoadingAiConfig(true);
    try {
      const res = await apiFetch('/chat/admin/ai-config');
      if (res.success && res.data?.config) {
        const nextConfig = res.data.config as ChatAiConfig;
        const nextGuides = parseTrainingGuides(nextConfig.training_instructions);
        setAiConfig(nextConfig);
        setTrainingGuides(nextGuides);
        setSelectedGuideId(nextGuides[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    } finally {
      setLoadingAiConfig(false);
    }
  };

  useEffect(() => {
    loadConversations();
    loadAiConfig();
  }, []);

  const loadMessages = async (conversationId: string, options?: { before?: string | null; appendOlder?: boolean }) => {
    const isOlderLoad = Boolean(options?.appendOlder);
    if (isOlderLoad) {
      setLoadingOlder(true);
    } else {
      setLoadingMessages(true);
    }

    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    const prevScrollTop = container?.scrollTop || 0;

    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (options?.before) {
        params.set('before', options.before);
      }

      const res = await apiFetch(`/chat/admin/conversations/${conversationId}/messages?${params.toString()}`);
      if (res.success) {
        const incomingMessages = (res.data?.messages || []) as ChatMessage[];
        const pagination = (res.data?.pagination || {}) as ChatPagination;
        setHasMoreOldMessages(Boolean(pagination.hasMore));
        setNextCursor(pagination.nextCursor || null);

        if (isOlderLoad) {
          setMessages((prev) => {
            const existing = new Set(prev.map((item) => item._id));
            const older = incomingMessages.filter((item) => !existing.has(item._id));
            return [...older, ...prev];
          });

          setTimeout(() => {
            const nextContainer = messagesContainerRef.current;
            if (!nextContainer) return;
            const diff = nextContainer.scrollHeight - prevScrollHeight;
            nextContainer.scrollTop = prevScrollTop + diff;
          }, 0);
        } else {
          setMessages(incomingMessages);
          setTimeout(() => scrollMessagesToBottom('auto'), 0);
        }

        if (res.data?.conversation) {
          setConversations((prev) => {
            const next = prev.map((item) =>
              item._id === conversationId ? { ...item, ...res.data.conversation } : item
            );
            return next.sort(
              (a, b) =>
                new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
            );
          });
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      if (isOlderLoad) {
        setLoadingOlder(false);
      } else {
        setLoadingMessages(false);
      }
    }
  };

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setHasMoreOldMessages(false);
      setNextCursor(null);
      return;
    }
    loadMessages(activeConversationId, { before: null, appendOlder: false });
  }, [activeConversationId]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const channelName = 'private-admin-chat';
    const channel = subscribePrivateChannel(channelName);
    if (!channel) return;

    const onConversationUpdated = (payload: { conversation?: ChatConversation }) => {
      const conversation = payload?.conversation;
      if (!conversation?._id) return;

      setConversations((prev) => {
        const existed = prev.some((item) => item._id === conversation._id);
        const merged = existed
          ? prev.map((item) => (item._id === conversation._id ? { ...item, ...conversation } : item))
          : [conversation, ...prev];
        return merged.sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
        );
      });
    };

    const onNewMessage = (payload: { conversationId?: string; message?: ChatMessage }) => {
      const conversationId = payload?.conversationId;
      const incoming = payload?.message;
      if (!conversationId || !incoming?._id) return;

      if (activeConversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((item) => item._id === incoming._id)) return prev;
          const withoutPending = prev.filter(
            (item) => !(item.is_pending && item.content === incoming.content && item.sender_role === incoming.sender_role)
          );
          return [...withoutPending, incoming];
        });
        setTimeout(() => scrollMessagesToBottom('smooth'), 0);
      }
    };

    channel.bind('chat:conversation-updated', onConversationUpdated);
    channel.bind('chat:new-message', onNewMessage);

    return () => {
      channel.unbind('chat:conversation-updated', onConversationUpdated);
      channel.unbind('chat:new-message', onNewMessage);
      unsubscribePrivateChannel(channelName);
    };
  }, [user, activeConversationId]);

  const loadOlderMessages = async () => {
    if (!activeConversationId || !nextCursor || !hasMoreOldMessages || loadingOlder) return;
    await loadMessages(activeConversationId, { before: nextCursor, appendOlder: true });
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop <= 40) {
      loadOlderMessages();
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const content = messageText.trim();
    if (!content || !activeConversationId || sending || !user) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      conversation_id: activeConversationId,
      sender_id: String(user.id),
      sender_role: 'ADMIN',
      sender_name: user.fullName || user.email || `Admin ${user.id}`,
      content,
      createdAt: new Date().toISOString(),
      is_pending: true,
    };

    setSending(true);
    setMessageText('');
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollMessagesToBottom('smooth');

    try {
      const res = await apiFetch(`/chat/admin/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      if (res.success) {
        const message = res.data?.message as ChatMessage;
        const conversation = res.data?.conversation as ChatConversation;

        if (message?._id) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((item) => item._id !== tempId);
            if (withoutTemp.some((item) => item._id === message._id)) return withoutTemp;
            return [...withoutTemp, message];
          });
          setTimeout(() => scrollMessagesToBottom('smooth'), 0);
        }

        if (conversation?._id) {
          setConversations((prev) =>
            prev
              .map((item) => (item._id === conversation._id ? { ...item, ...conversation } : item))
              .sort(
                (a, b) =>
                  new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
              )
          );
        }
      }
    } catch (error) {
      console.error('Failed to send admin message:', error);
      setMessages((prev) => prev.filter((item) => item._id !== tempId));
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const handleSaveAiConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingAiConfig(true);
    try {
      const res = await apiFetch('/chat/admin/ai-config', {
        method: 'PUT',
        body: JSON.stringify({
          auto_reply_enabled: aiConfig.auto_reply_enabled,
          system_prompt: aiConfig.system_prompt,
          training_instructions: serializeTrainingGuides(trainingGuides),
        }),
      });

      if (res.success && res.data?.config) {
        const nextConfig = res.data.config as ChatAiConfig;
        const nextGuides = parseTrainingGuides(nextConfig.training_instructions);
        setAiConfig(nextConfig);
        setTrainingGuides(nextGuides);
        setSelectedGuideId(nextGuides[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);
    } finally {
      setSavingAiConfig(false);
    }
  };

  return (
    <div className="h-[calc(100vh-11rem)]">
      <div className="grid h-full grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[340px_1fr]">
        <aside className="h-full overflow-y-auto border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <h1 className="text-lg font-bold">AI Chat CSKH</h1>
            <p className="text-xs text-muted-foreground">Theo dõi hội thoại và quản lý dữ liệu training AI</p>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-border p-2">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'conversations' ? 'bg-primary text-white' : 'bg-secondary text-foreground'
              }`}
            >
              Hội thoại
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`inline-flex h-9 items-center justify-center gap-1 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'training' ? 'bg-primary text-white' : 'bg-secondary text-foreground'
              }`}
            >
              <Settings2 className="h-4 w-4" />
              Training AI
            </button>
          </div>

          {activeTab === 'conversations' ? (
            loadingConversations ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải hội thoại...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Chưa có cuộc trò chuyện nào.</div>
            ) : (
              <div className="space-y-1 p-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    onClick={() => {
                      setActiveConversationId(conversation._id);
                      setActiveTab('conversations');
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      activeConversationId === conversation._id
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {conversation.user_name || conversation.user_email || `User ${conversation.user_id}`}
                      </p>
                      {conversation.admin_unread_count > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {conversation.admin_unread_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.last_message || '...'}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {conversation.last_message_at
                        ? new Date(conversation.last_message_at).toLocaleString('vi-VN')
                        : ''}
                    </p>
                  </button>
                ))}
              </div>
            )
          ) : loadingAiConfig ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải cấu hình AI...
            </div>
          ) : (
            <form onSubmit={handleSaveAiConfig} className="space-y-4 p-3">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Phản hồi tự động</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Bật để AI tự trả lời dựa trên system prompt và các hướng dẫn training hiện có.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={aiConfig.auto_reply_enabled}
                      onChange={(e) => setAiConfig((prev) => ({ ...prev, auto_reply_enabled: e.target.checked }))}
                    />
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trạng thái</p>
                    <p className={`mt-1 text-sm font-semibold ${aiConfig.auto_reply_enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {aiConfig.auto_reply_enabled ? 'Đang bật' : 'Đang tắt'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hướng dẫn</p>
                    <p className="mt-1 text-sm font-semibold">{trainingGuides.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Có nội dung</p>
                    <p className="mt-1 text-sm font-semibold">{trainingGuidesWithContentCount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    System prompt
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {aiConfig.system_prompt.trim().length.toLocaleString('vi-VN')}/4.000 ký tự
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Đây là lớp định hướng chung cho vai trò, giọng điệu và nguyên tắc trả lời của AI CSKH.
                </p>
                <textarea
                  value={aiConfig.system_prompt}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, system_prompt: e.target.value }))}
                  rows={7}
                  maxLength={4000}
                  className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Định hướng vai trò, giọng điệu và nguyên tắc trả lời của AI CSKH..."
                />
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Danh sách hướng dẫn</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {trainingGuides.length} hướng dẫn • {trainingContentLength.toLocaleString('vi-VN')} ký tự nội dung
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTrainingGuide}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold transition-colors hover:bg-secondary"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm
                  </button>
                </div>

                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {trainingGuides.length === 0 ? (
                    <button
                      type="button"
                      onClick={addTrainingGuide}
                      className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-6 text-center transition-colors hover:bg-secondary/50"
                    >
                      <FileText className="mb-2 h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-semibold">Chưa có hướng dẫn nào</span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        Tạo từng hướng dẫn riêng cho FAQ, quy trình, chính sách hoặc nhóm sản phẩm.
                      </span>
                    </button>
                  ) : (
                    trainingGuides.map((guide, index) => (
                      <button
                        key={guide.id}
                        type="button"
                        onClick={() => setSelectedGuideId(guide.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                          guide.id === selectedGuideId
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:bg-secondary/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {guide.title.trim() || `Hướng dẫn ${index + 1}`}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {guide.content.trim() || 'Chưa có nội dung chi tiết.'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {guide.content.trim().length.toLocaleString('vi-VN')} ký tự
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <p className="text-sm font-semibold">Cách sắp xếp dễ dùng</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  <li>Mỗi hướng dẫn chỉ nên xử lý một chủ đề rõ ràng như hoàn tiền, bảo hành, giao hàng hoặc FAQ.</li>
                  <li>Đầu mỗi hướng dẫn nên ghi điều kiện áp dụng để AI chọn đúng ngữ cảnh.</li>
                  <li>Nếu cần văn phong cố định, thêm mẫu câu trả lời ngay trong nội dung hướng dẫn.</li>
                </ul>
              </div>

              {aiConfig.updatedAt ? (
                <p className="text-[11px] text-muted-foreground">
                  Cập nhật bởi {aiConfig.updated_by_name || 'Admin'} lúc{' '}
                  {new Date(aiConfig.updatedAt).toLocaleString('vi-VN')}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={savingAiConfig}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:opacity-50"
              >
                {savingAiConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu cấu hình AI
              </button>
            </form>
          )}
        </aside>

        <section className="flex h-full flex-col">
          {activeTab === 'training' ? (
            loadingAiConfig ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải dữ liệu training...
              </div>
            ) : (
              <div className="flex h-full flex-col overflow-hidden">
                  <div className="border-b border-border px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          AI Training Workspace
                        </p>
                        <h2 className="mt-2 text-2xl font-bold">Quản lý bộ hướng dẫn AI</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          Chọn một hướng dẫn ở cột trái để chỉnh sửa. Bố cục này tập trung vào một luồng thao tác:
                          chọn tài liệu, viết nội dung, xem nhanh kết quả AI sẽ đọc.
                        </p>
                      </div>
                      <div className="hidden rounded-2xl border border-border bg-background/70 px-4 py-3 text-right lg:block">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Đang chọn</p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedGuide?.title.trim() || 'Chưa chọn hướng dẫn'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedGuide ? `${selectedGuideWordCount.toLocaleString('vi-VN')} từ` : 'Chọn tài liệu để chỉnh sửa'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedGuide ? (
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
                        <div className="space-y-6">
                          <div className="rounded-2xl border border-border bg-background/60 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Hướng dẫn chi tiết
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Mỗi hướng dẫn nên tập trung vào một chủ đề rõ ràng để AI dễ ưu tiên và áp dụng.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTrainingGuide(selectedGuide.id)}
                                className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4" />
                                Xóa
                              </button>
                            </div>

                            <div className="mt-5 grid gap-5">
                              <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Tiêu đề hướng dẫn
                                </label>
                                <input
                                  value={selectedGuide.title}
                                  onChange={(e) => updateSelectedGuide('title', e.target.value)}
                                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder="Ví dụ: Quy trình xử lý hoàn tiền"
                                />
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-border bg-card px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ký tự</p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {selectedGuide.content.length.toLocaleString('vi-VN')}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-border bg-card px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Số từ</p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {selectedGuideWordCount.toLocaleString('vi-VN')}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-border bg-card px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trạng thái</p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {selectedGuide.content.trim() ? 'Đã có nội dung' : 'Đang nháp'}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Nội dung hướng dẫn chi tiết
                                  </label>
                                  <span className="text-xs text-muted-foreground">Tối đa 120.000 ký tự</span>
                                </div>
                                <textarea
                                  value={selectedGuide.content}
                                  onChange={(e) => updateSelectedGuide('content', e.target.value)}
                                  rows={18}
                                  maxLength={120000}
                                  className="min-h-[460px] w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  placeholder={
                                    'Mô tả đầy đủ quy tắc AI cần làm theo:\n- Khi nào áp dụng hướng dẫn này\n- Các bước tư vấn\n- Những điều không được nói\n- Mẫu câu trả lời gợi ý\n- Chính sách và giới hạn cần nhắc đúng'
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="rounded-2xl border border-border bg-background/60 p-5">
                              <div className="mb-4 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <p className="text-sm font-semibold">Xem nhanh nội dung AI sẽ đọc</p>
                              </div>
                              <div className="rounded-2xl border border-border bg-card p-4">
                                <p className="text-base font-bold">
                                  {selectedGuide.title.trim() || 'Tiêu đề hướng dẫn'}
                                </p>
                                <div className="mt-3 text-sm text-muted-foreground">
                                  {selectedGuide.content.trim() ? (
                                    renderMessageContent(selectedGuide.content)
                                  ) : (
                                    <p>Chưa có nội dung chi tiết cho hướng dẫn này.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border bg-background/60 p-5">
                            <p className="text-sm font-semibold">Checklist nội dung</p>
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                              <li>Nêu bối cảnh hoặc điều kiện để AI biết khi nào áp dụng hướng dẫn này.</li>
                              <li>Viết các bước xử lý theo thứ tự để AI không trả lời lan man.</li>
                              <li>Ghi rõ các giới hạn, thông tin bắt buộc và điều AI tuyệt đối không được nói.</li>
                              <li>Thêm ví dụ hoặc mẫu câu khi cần giữ đúng giọng điệu CSKH.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <Bot className="mb-3 h-12 w-12 text-primary/60" />
                      <p className="text-base font-bold">Chưa có hướng dẫn nào</p>
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        Tạo hướng dẫn mới ở cột bên trái để bắt đầu huấn luyện AI bằng nhiều tài liệu tách biệt.
                      </p>
                    </div>
                  )}
              </div>
            )
          ) : activeConversation ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-bold">
                  {activeConversation.user_name || activeConversation.user_email || `User ${activeConversation.user_id}`}
                </p>
                <p className="text-xs text-muted-foreground">{activeConversation.user_email}</p>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 space-y-3 overflow-y-auto bg-background/50 p-4"
              >
                {loadingOlder ? (
                  <div className="text-center text-[11px] text-muted-foreground">Đang tải tin cũ...</div>
                ) : null}
                {loadingMessages ? (
                  <div className="text-sm text-muted-foreground">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Chưa có tin nhắn nào.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_role === 'ADMIN';
                    const isAi = message.sender_role === 'AI';
                    return (
                      <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            isMine
                              ? 'rounded-br-md bg-primary text-white'
                              : isAi
                                ? 'rounded-bl-md border border-blue-200 bg-blue-50 text-slate-800'
                                : 'rounded-bl-md bg-secondary text-foreground'
                          }`}
                        >
                          {!isMine ? (
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {isAi ? 'AI CSKH' : message.sender_name || 'Khách hàng'}
                            </p>
                          ) : null}
                          <div className="break-words">{renderMessageContent(message.content)}</div>
                          <p className={`mt-1 text-[10px] ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {message.is_pending ? 'Đang gửi...' : new Date(message.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Nhắn tin thủ công khi cần tiếp quản hỗ trợ..."
                    className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    maxLength={4000}
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-bold text-white disabled:opacity-50"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Gửi
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-bold">Chọn một hội thoại</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tin nhắn khách hàng và AI sẽ hiển thị realtime tại đây.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
