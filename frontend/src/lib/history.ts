'use client';

export type HistoryItem = {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  price: number;
  viewedAt: number;
};

const MAX_HISTORY_ITEMS = 20;
const HISTORY_KEY = 'vextro_view_history';
const HISTORY_EVENT = 'vextro-history-updated';
const EMPTY_HISTORY: HistoryItem[] = [];

let cachedSerialized = '[]';
let cachedHistory: HistoryItem[] = EMPTY_HISTORY;

function parseHistory(raw: string | null): HistoryItem[] {
  if (!raw) return EMPTY_HISTORY;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : EMPTY_HISTORY;
  } catch (error) {
    console.error('Failed to parse view history:', error);
    return EMPTY_HISTORY;
  }
}

function syncHistoryCache(): HistoryItem[] {
  if (typeof window === 'undefined') return EMPTY_HISTORY;

  const raw = localStorage.getItem(HISTORY_KEY);
  const serialized = raw ?? '[]';

  if (serialized === cachedSerialized) return cachedHistory;

  cachedSerialized = serialized;
  cachedHistory = parseHistory(raw);
  return cachedHistory;
}

function updateHistoryCache(next: HistoryItem[]) {
  cachedHistory = next;
  cachedSerialized = JSON.stringify(next);
}

function emitHistoryChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export const saveToHistory = (product: HistoryItem) => {
  if (typeof window === 'undefined') return;

  try {
    const existingHistory = syncHistoryCache();
    // Remove if already exists to move to top
    const filteredHistory = existingHistory.filter(item => item.id !== product.id);
    
    const newHistory = [product, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    const serialized = JSON.stringify(newHistory);

    if (serialized === cachedSerialized) return;

    localStorage.setItem(HISTORY_KEY, serialized);
    updateHistoryCache(newHistory);
    emitHistoryChange();
  } catch (error) {
    console.error('Failed to save view history:', error);
  }
};

export const getHistory = (): HistoryItem[] => {
  return syncHistoryCache();
};

export const clearHistory = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(HISTORY_KEY);
  updateHistoryCache(EMPTY_HISTORY);
  emitHistoryChange();
};

export const subscribeHistory = (listener: () => void) => {
  if (typeof window === 'undefined') return () => {};

  const onHistoryUpdated = () => {
    listener();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== HISTORY_KEY) return;

    const previous = cachedSerialized;
    syncHistoryCache();
    if (cachedSerialized !== previous) listener();
  };

  window.addEventListener(HISTORY_EVENT, onHistoryUpdated);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(HISTORY_EVENT, onHistoryUpdated);
    window.removeEventListener('storage', onStorage);
  };
};
