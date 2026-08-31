'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { apiFetch } from '@/lib/api';
import {
  Plus,
  Trash2,
  Layout,
  Boxes,
  Check,
  Loader2,
  MessageSquare,
  X,
  ListPlus,
  StickyNote,
  BookOpen,
  ScanLine,
  Camera,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type VariantStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'HIDDEN';
type DeliveryType = 'AUTO' | 'MANUAL';

type RequiredInput = {
  id: string;
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
  placeholder: string;
};

type Variant = {
  id?: number | string;
  name: string;
  price: number;
  cost_price: number;
  stock_count: number;
  status: VariantStatus;
  attribute_values: Record<string, string>;
  delivery_type: DeliveryType;
  max_per_order: number;
  has_expiry: boolean;
  expiry_days: number;
  allow_renewal: boolean;
  has_warranty: boolean;
  warranty_days: number;
  guide_link?: string;
  required_inputs: RequiredInput[];
};

const GROUP_KEY = 'Nhom';
const OPTION_KEY = 'Tuy chon';
const LEGACY_GROUP_KEYS = ['Nhom', 'Nhóm', 'NhĂ³m'];
const LEGACY_OPTION_KEYS = ['Tuy chon', 'Tùy chọn', 'TĂ¹y chá»n'];
function normalizeMaxPerOrder(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function parseJsonObject(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '{}');
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' ? value : {};
}

function normalizeAttributeValues(attributeValues: unknown) {
  const raw = parseJsonObject(attributeValues) as Record<string, string>;
  const next = { ...raw };

  const groupValue = LEGACY_GROUP_KEYS.map((key) => next[key]).find((value) => value !== undefined);
  const optionValue = LEGACY_OPTION_KEYS.map((key) => next[key]).find((value) => value !== undefined);

  if (groupValue !== undefined) next[GROUP_KEY] = groupValue;
  if (optionValue !== undefined) next[OPTION_KEY] = optionValue;

  for (const key of LEGACY_GROUP_KEYS) {
    if (key !== GROUP_KEY) delete next[key];
  }
  for (const key of LEGACY_OPTION_KEYS) {
    if (key !== OPTION_KEY) delete next[key];
  }

  return next;
}

function normalizeGroupName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getGroupName(variant: Variant) {
  return normalizeGroupName(variant.attribute_values?.[GROUP_KEY]);
}

function getOptionName(variant: Variant) {
  return normalizeOptionName(variant.attribute_values?.[OPTION_KEY]) || normalizeOptionName(variant.name);
}

function buildVariantName(groupName: string, optionName: string) {
  const normalizedGroup = normalizeGroupName(groupName);
  const normalizedOption = normalizeOptionName(optionName);

  if (normalizedGroup && normalizedOption) return `${normalizedGroup} - ${normalizedOption}`;
  if (normalizedOption) return normalizedOption;
  if (normalizedGroup) return normalizedGroup;
  return '';
}

function getVariantStructureError(list: Variant[]) {
  const groups = Array.from(new Set(list.map((variant) => getGroupName(variant))));
  const hasUnnamedGroup = groups.includes('');

  if (hasUnnamedGroup && groups.length > 1) {
    return 'Nếu danh mục lớn để trống thì chỉ được phép có 1 nhóm. Muốn tạo nhiều danh mục lớn, hãy đặt tên cho nhóm hiện tại trước.';
  }

  return null;
}

export default function VariantEditor({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [savingVariantIds, setSavingVariantIds] = useState<Set<number | string>>(new Set());
  const [warehouseVariantId, setWarehouseVariantId] = useState<number | string | null>(null);
  const [inputConfigVariantIdx, setInputConfigVariantIdx] = useState<number | null>(null);
  const [warehouseItems, setWarehouseItems] = useState<{ id: number; item_data: string }[]>([]);
  const [newItemsText, setNewItemsText] = useState('');
  const [scanInputValue, setScanInputValue] = useState('');
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraScanError, setCameraScanError] = useState('');
  const [showNoteIndex, setShowNoteIndex] = useState<number | null>(null);
  const [showGuideIndex, setShowGuideIndex] = useState<number | null>(null);
  const [showWarrantyIndex, setShowWarrantyIndex] = useState<number | null>(null);
  const [showGroupNoteName, setShowGroupNoteName] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!productId) return;

    const loadVariants = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/admin/products/${productId}`);
        if (res.success) {
          const product = res.data;
          setVariants(
            Array.isArray(product.variants)
              ? product.variants.map((variant: any) => ({
                  ...variant,
                  price: Number(variant.price || 0),
                  cost_price: Number(variant.cost_price || 0),
                  stock_count: Number(variant.stock_count || 0),
                  max_per_order: normalizeMaxPerOrder(variant.max_per_order),
                  delivery_type: variant.delivery_type === 'MANUAL' ? 'MANUAL' : 'AUTO',
                  has_expiry: !!variant.has_expiry,
                  expiry_days: Number(variant.expiry_days || 0),
                  allow_renewal: !!variant.allow_renewal,
                  has_warranty: !!variant.has_warranty,
                  warranty_days: Number(variant.warranty_days || 0),
                  guide_link: variant.guide_link || '',
                  required_inputs: Array.isArray(variant.required_inputs) ? variant.required_inputs : [],
                  attribute_values: normalizeAttributeValues(variant.attribute_values),
                }))
              : []
          );
        }
      } catch {
        toast.error('Không thể tải danh sách biến thể');
      } finally {
        setLoading(false);
      }
    };

    loadVariants();
  }, [productId]);

  useEffect(() => () => stopCameraScanner(), []);

  const updateVariant = (index: number, patch: Partial<Variant>) => {
    setVariants((prev) => prev.map((variant, idx) => (idx === index ? { ...variant, ...patch } : variant)));
  };

  const renameGroup = (oldName: string, newName: string) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (getGroupName(variant) !== oldName) return variant;
        const optionName = getOptionName(variant);
        return {
          ...variant,
          attribute_values: { ...variant.attribute_values, [GROUP_KEY]: newName },
          name: buildVariantName(newName, optionName),
        };
      })
    );
  };

  const updateGroupNote = (groupName: string, note: string) => {
    setVariants((prev) =>
      prev.map((variant) =>
        getGroupName(variant) === groupName
          ? { ...variant, attribute_values: { ...variant.attribute_values, nhom_ghi_chu: note } }
          : variant
      )
    );
  };

  const setGroupStatus = (groupName: string, status: VariantStatus) => {
    setVariants((prev) =>
      prev.map((variant) => (getGroupName(variant) === groupName ? { ...variant, status } : variant))
    );
  };

  const handleNumberChange = (index: number, field: 'price' | 'cost_price' | 'stock_count' | 'max_per_order', value: string) => {
    const rawValue = value.replace(/[^\d]/g, '');
    const parsedValue =
      field === 'max_per_order'
        ? normalizeMaxPerOrder(rawValue === '' ? 1 : parseInt(rawValue, 10))
        : rawValue === ''
          ? 0
          : parseInt(rawValue, 10);

    updateVariant(index, { [field]: parsedValue } as Partial<Variant>);
  };

  const formatDisplay = (value: number) => (value || value === 0 ? value.toLocaleString('vi-VN') : '');

  const saveVariant = async (index: number) => {
    const variant = variants[index];
    const variantId = variant.id || `temp-${index}`;
    const structureError = getVariantStructureError(variants);

    if (structureError) {
      toast.error(structureError);
      return;
    }

    setSavingVariantIds((prev) => new Set(prev).add(variantId));
    try {
      const payload = {
        ...variant,
        name: buildVariantName(getGroupName(variant), getOptionName(variant)),
        attribute_values: {
          ...variant.attribute_values,
          [GROUP_KEY]: getGroupName(variant),
          [OPTION_KEY]: getOptionName(variant),
        },
        delivery_type: variant.delivery_type === 'MANUAL' ? 'MANUAL' : 'AUTO',
      };

      const res = variant.id
        ? await apiFetch(`/admin/variants/${variant.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiFetch(`/admin/products/${productId}/variants`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      if (res.success) {
        toast.success(variant.id ? 'Đã cập nhật biến thể' : 'Đã thêm biến thể mới');
        if (res.data?.id) {
          setVariants((prev) => prev.map((item, idx) => (idx === index ? { ...item, id: res.data.id } : item)));
        }
      } else {
        toast.error(res.message || 'Lỗi khi lưu biến thể');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSavingVariantIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  };

  const deleteVariant = async (index: number) => {
    const variant = variants[index];

    if (!variant.id) {
      setVariants((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa biến thể này khỏi cơ sở dữ liệu?')) return;

    const variantId = variant.id;
    setSavingVariantIds((prev) => new Set(prev).add(variantId));
    try {
      const res = await apiFetch(`/admin/variants/${variantId}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('Đã xóa biến thể');
        setVariants((prev) => prev.filter((_, idx) => idx !== index));
      } else {
        toast.error(res.message || 'Lỗi khi xóa biến thể');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSavingVariantIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  };

  const loadWarehouse = async (variantId: number | string) => {
    setIsWarehouseLoading(true);
    try {
      const res = await apiFetch(`/admin/variants/${variantId}/warehouse`);
      if (res.success) setWarehouseItems(res.data || []);
    } catch {
      toast.error('Lỗi tải kho');
    } finally {
      setIsWarehouseLoading(false);
    }
  };

  const addWarehouseItems = async () => {
    if (!warehouseVariantId || !newItemsText.trim()) return;
    try {
      const items = newItemsText.split('\n').filter((item) => item.trim());
      const res = await apiFetch(`/admin/variants/${warehouseVariantId}/warehouse`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
      if (res.success) {
        toast.success('Đã thêm mã hàng');
        setNewItemsText('');
        loadWarehouse(warehouseVariantId);
        const variantIndex = variants.findIndex((variant) => (variant.id || variant.name) === warehouseVariantId);
        if (variantIndex !== -1) {
          updateVariant(variantIndex, {
            stock_count: (variants[variantIndex].stock_count || 0) + items.length,
          });
        }
      }
    } catch {
      toast.error('Lỗi thêm mã');
    }
  };

  const appendWarehouseItem = (rawValue: string) => {
    const normalizedValue = rawValue.trim();
    if (!normalizedValue) return;

    setNewItemsText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${normalizedValue}` : normalizedValue));
  };

  const handleScanInputSubmit = () => {
    if (!scanInputValue.trim()) return;
    appendWarehouseItem(scanInputValue);
    setScanInputValue('');
  };

  const stopCameraScanner = () => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraScannerOpen(false);
  };

  const waitForVideoElement = async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (videoRef.current) return videoRef.current;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    return null;
  };

  const startCameraScanner = async () => {
    try {
      stopCameraScanner();

      const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setCameraScanError('');
      setIsCameraScannerOpen(true);

      const videoElement = await waitForVideoElement();
      if (!videoElement) {
        setCameraScanError('Không tìm thấy khung camera để quét mã vạch.');
        return;
      }

      videoElement.srcObject = stream;
      void videoElement.play().catch(() => {
        setCameraScanError('Không thể phát camera để quét mã vạch.');
      });

      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (videoElement.readyState < 2) return;

          try {
            const codes = await detector.detect(videoElement);
            const firstCode = codes.find((code) => code.rawValue?.trim());
            if (!firstCode?.rawValue) return;

            appendWarehouseItem(firstCode.rawValue);
            toast.success(`Đã quét: ${firstCode.rawValue}`);
            stopCameraScanner();
          } catch {
            setCameraScanError('Không thể đọc mã vạch từ camera.');
          }
        }, 500);

        return;
      }

      const reader = new BrowserMultiFormatReader();
      zxingControlsRef.current = await reader.decodeFromVideoDevice(undefined, videoElement, (result, error, controls) => {
        zxingControlsRef.current = controls;

        if (result?.getText()) {
          const value = result.getText();
          appendWarehouseItem(value);
          toast.success(`Đã quét: ${value}`);
          stopCameraScanner();
          return;
        }

        if (error && !(error instanceof NotFoundException)) {
          setCameraScanError('Không thể đọc mã vạch từ camera.');
        }
      });
    } catch {
      setCameraScanError('Không thể truy cập camera để quét mã vạch.');
      setIsCameraScannerOpen(true);
    }
  };

  const deleteWarehouseItem = async (id: number) => {
    if (!confirm('Xóa mã này khỏi kho hàng?')) return;
    try {
      const res = await apiFetch(`/admin/warehouse/${id}`, { method: 'DELETE' });
      if (res.success) {
        toast.success('Đã xóa');
        setWarehouseItems((prev) => prev.filter((item) => item.id !== id));
        const variantIndex = variants.findIndex((variant) => (variant.id || variant.name) === warehouseVariantId);
        if (variantIndex !== -1) {
          updateVariant(variantIndex, {
            stock_count: Math.max(0, (variants[variantIndex].stock_count || 0) - 1),
          });
        }
      }
    } catch {
      toast.error('Lỗi xóa');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-card" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  const groups = Array.from(new Set(variants.map((variant) => getGroupName(variant))));
  const hasUnnamedGroup = groups.includes('');

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 rounded-[28px] border border-primary/20 bg-primary/5 p-4 sm:rounded-3xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="flex items-start gap-2.5 text-base font-black uppercase leading-tight text-primary sm:text-xl">
            <Layout size={20} className="mt-0.5 shrink-0" /> Quản lý phân loại và kho hàng
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">
            Chỉ giữ hai loại giao hàng: tự động theo kho và thủ công.
          </p>
        </div>
        <button
          onClick={() => {
            if (hasUnnamedGroup) {
              toast.error('Nhóm hiện tại đang để trống. Hãy đặt tên cho nhóm đó trước khi tạo thêm danh mục lớn.');
              return;
            }

            const groupName = prompt('Nhập tên nhóm phân loại chính (có thể để trống nếu chỉ cần 1 nhóm):');
            if (groupName === null) return;

            const normalizedGroupName = normalizeGroupName(groupName);
            const defaultOptionName = 'Mặc định';
            setVariants((prev) => [
              ...prev,
              {
                name: buildVariantName(normalizedGroupName, defaultOptionName),
                price: 0,
                cost_price: 0,
                stock_count: 0,
                status: 'ACTIVE',
                delivery_type: 'AUTO',
                max_per_order: 1,
                has_expiry: false,
                expiry_days: 0,
                allow_renewal: false,
                has_warranty: false,
                warranty_days: 0,
                guide_link: '',
                required_inputs: [],
                attribute_values: { [GROUP_KEY]: normalizedGroupName, [OPTION_KEY]: defaultOptionName },
              },
            ]);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
        >
          <Plus size={18} /> Thêm nhóm chính mới
        </button>
      </div>

      <div className="space-y-10">
        {groups.map((groupName, groupIdx) => (
          <div key={groupIdx} className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border bg-secondary/50 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Layout size={18} className="shrink-0 text-primary" />
                <input
                  className="w-full rounded-xl bg-transparent px-3 py-1.5 text-base font-black uppercase tracking-wider outline-none transition-all focus:bg-background focus:ring-2 focus:ring-primary/20 sm:text-lg lg:w-64"
                  value={groupName}
                  onChange={(event) => renameGroup(groupName, event.target.value)}
                  placeholder="Tên nhóm..."
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowGroupNoteName(showGroupNoteName === groupName ? null : groupName)}
                  className={`rounded-xl p-2.5 transition-all ${
                    variants.find((variant) => getGroupName(variant) === groupName)?.attribute_values?.nhom_ghi_chu
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                  title="Ghi chú chung"
                >
                  <StickyNote size={20} />
                </button>
                <button
                  onClick={() => {
                    const groupVariants = variants.filter((variant) => getGroupName(variant) === groupName);
                    const isAnyActive = groupVariants.some((variant) => variant.status === 'ACTIVE');
                    setGroupStatus(groupName, isAnyActive ? 'HIDDEN' : 'ACTIVE');
                  }}
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition-all ${
                    variants.filter((variant) => getGroupName(variant) === groupName).some((variant) => variant.status === 'ACTIVE')
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                      : 'border-red-500/30 bg-red-500/10 text-red-600'
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      variants.filter((variant) => getGroupName(variant) === groupName).some((variant) => variant.status === 'ACTIVE')
                        ? 'bg-emerald-500'
                        : 'bg-red-500'
                    }`}
                  />
                  {variants.filter((variant) => getGroupName(variant) === groupName).some((variant) => variant.status === 'ACTIVE')
                    ? 'Đang bật'
                    : 'Đang tắt'}
                </button>
                <button
                  onClick={async () => {
                    const groupVariants = variants.filter((variant) => getGroupName(variant) === groupName);
                    const loadingToast = toast.loading(`Đang lưu ${groupVariants.length} phân loại...`);
                    try {
                      for (const variant of groupVariants) {
                        const variantIndex = variants.findIndex((item) => item === variant);
                        if (variantIndex !== -1) await saveVariant(variantIndex);
                      }
                      toast.success(`Đã lưu toàn bộ nhóm "${groupName}"`, { id: loadingToast });
                    } catch {
                      toast.error('Lỗi khi lưu nhóm', { id: loadingToast });
                    }
                  }}
                  className="flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
                >
                  <Check size={16} /> Lưu cả nhóm
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Xóa toàn bộ nhóm "${groupName}"?`)) {
                      setVariants((prev) => prev.filter((variant) => getGroupName(variant) !== groupName));
                    }
                  }}
                  className="rounded-xl p-2.5 text-red-500 transition-all hover:bg-red-500/10"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {showGroupNoteName === groupName && (
              <div className="mx-6 mt-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <StickyNote size={14} className="text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-primary/80">Ghi chú chung cho nhóm: {groupName}</span>
                </div>
                <textarea
                  className="min-h-[80px] w-full resize-none rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Nhập ghi chú chung cho nhóm này"
                  value={variants.find((variant) => getGroupName(variant) === groupName)?.attribute_values?.nhom_ghi_chu || ''}
                  onChange={(event) => updateGroupNote(groupName, event.target.value)}
                />
              </div>
            )}

            <div className="space-y-4 p-6">
              <div className="hidden grid-cols-12 gap-2 px-3 text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-70 md:grid">
                <div className="col-span-3">Tùy chọn</div>
                <div className="col-span-1 text-center">Giá nhập</div>
                <div className="col-span-1 text-center">Lợi nhuận</div>
                <div className="col-span-1 text-center">Giá bán</div>
                <div className="col-span-1 text-center">Kho</div>
                <div className="col-span-1 text-center">Tối đa/đơn</div>
                <div className="col-span-1 text-center">Loại hàng</div>
                <div className="col-span-3 text-right">Trạng thái và thao tác</div>
              </div>

              <div className="space-y-3">
                {variants
                  .filter((variant) => getGroupName(variant) === groupName)
                  .map((variant, variantIdx) => {
                    const globalIndex = variants.findIndex((item) => item === variant);
                    const isSaving = savingVariantIds.has(variant.id || `temp-${globalIndex}`);
                    const profit = Number(variant.price || 0) - Number(variant.cost_price || 0);

                    return (
                      <div key={variantIdx} className="rounded-xl border border-border/40 bg-secondary/10 p-3">
                        <div className="space-y-3 md:hidden">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tùy chọn</div>
                            <input
                              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                              value={getOptionName(variant)}
                              onChange={(event) => {
                                const optionName = event.target.value;
                                const currentGroupName = getGroupName(variant);
                                updateVariant(globalIndex, {
                                  attribute_values: { ...variant.attribute_values, [OPTION_KEY]: optionName, [GROUP_KEY]: currentGroupName },
                                  name: buildVariantName(currentGroupName, optionName),
                                });
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Giá nhập</span>
                              <input
                                type="text"
                                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                value={formatDisplay(variant.cost_price)}
                                onChange={(event) => handleNumberChange(globalIndex, 'cost_price', event.target.value)}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Lợi nhuận</span>
                              <input
                                type="text"
                                readOnly
                                className={`w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-center text-sm font-bold outline-none ${
                                  profit >= 0 ? 'text-emerald-500' : 'text-red-500'
                                }`}
                                value={formatDisplay(profit)}
                                title="Giá bán trừ giá nhập"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Giá bán</span>
                              <input
                                type="text"
                                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-center text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary/20"
                                value={formatDisplay(variant.price)}
                                onChange={(event) => handleNumberChange(globalIndex, 'price', event.target.value)}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Kho</span>
                              <input
                                type="text"
                                disabled={variant.delivery_type === 'AUTO'}
                                className={`w-full rounded-xl border border-border/60 px-3 py-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 ${
                                  variant.delivery_type === 'AUTO'
                                    ? 'cursor-not-allowed bg-secondary/50 text-muted-foreground'
                                    : 'bg-background text-blue-500'
                                }`}
                                value={variant.delivery_type === 'AUTO' ? 'AUTO' : formatDisplay(variant.stock_count)}
                                onChange={(event) => handleNumberChange(globalIndex, 'stock_count', event.target.value)}
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tối đa/đơn</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                value={formatDisplay(normalizeMaxPerOrder(variant.max_per_order))}
                                onChange={(event) => handleNumberChange(globalIndex, 'max_per_order', event.target.value)}
                              />
                            </label>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Loại hàng</div>
                            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background p-2">
                              {variant.delivery_type === 'AUTO' && variant.id && (
                                <button
                                  onClick={() => {
                                    setWarehouseVariantId(variant.id as number);
                                    loadWarehouse(variant.id as number);
                                  }}
                                  className="rounded-lg p-2 text-primary transition-all hover:bg-primary/10"
                                  title="Quản lý kho"
                                >
                                  <Boxes size={16} />
                                </button>
                              )}
                              <select
                                className="min-w-0 flex-1 appearance-none rounded-lg border border-border/60 bg-background px-3 py-2 text-center text-xs font-black text-primary outline-none"
                                value={variant.delivery_type}
                                onChange={(event) =>
                                  updateVariant(globalIndex, { delivery_type: event.target.value === 'MANUAL' ? 'MANUAL' : 'AUTO' })
                                }
                              >
                                <option value="AUTO">Kho</option>
                                <option value="MANUAL">Đặt trước</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Trạng thái và thao tác</div>
                            <div className="rounded-xl border border-border/60 bg-background p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  className="min-w-[120px] rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-bold outline-none"
                                  value={variant.status}
                                  onChange={(event) => updateVariant(globalIndex, { status: event.target.value as VariantStatus })}
                                >
                                  <option value="ACTIVE">Mở bán</option>
                                  <option value="OUT_OF_STOCK">Hết hàng</option>
                                  <option value="HIDDEN">Ẩn</option>
                                </select>
                                <div className="flex flex-1 flex-wrap items-center gap-1">
                                  {variant.delivery_type !== 'AUTO' && (
                                    <button
                                      onClick={() => setInputConfigVariantIdx(globalIndex)}
                                      className="rounded-lg p-2 text-primary transition-all hover:bg-primary/10"
                                      title="Yêu cầu nhập từ khách"
                                    >
                                      <MessageSquare size={16} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setShowNoteIndex(showNoteIndex === globalIndex ? null : globalIndex)}
                                    className={`rounded-lg p-2 transition-all ${
                                      variant.attribute_values?.ghi_chu
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                    }`}
                                    title="Ghi chú phân loại"
                                  >
                                    <StickyNote size={16} />
                                  </button>
                                  <button
                                    onClick={() => setShowGuideIndex(showGuideIndex === globalIndex ? null : globalIndex)}
                                    className={`rounded-lg p-2 transition-all ${
                                      variant.guide_link
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                    }`}
                                    title="Hướng dẫn sử dụng"
                                  >
                                    <BookOpen size={16} />
                                  </button>
                                  <button
                                    onClick={() => setShowWarrantyIndex(showWarrantyIndex === globalIndex ? null : globalIndex)}
                                    className={`rounded-lg p-2 transition-all ${
                                      variant.has_warranty
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                    }`}
                                    title="Cấu hình bảo hành"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                                  </button>
                                  <button
                                    onClick={() => saveVariant(globalIndex)}
                                    disabled={isSaving}
                                    className={`rounded-lg p-2 transition-all ${
                                      variant.id ? 'text-green-500 hover:bg-green-500/10' : 'text-primary hover:bg-primary/10'
                                    }`}
                                    title={variant.id ? 'Cập nhật' : 'Lưu vào DB'}
                                  >
                                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                                  </button>
                                  <button
                                    onClick={() => deleteVariant(globalIndex)}
                                    disabled={variants.length <= 1 || isSaving}
                                    className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 disabled:opacity-0"
                                    title="Xóa"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-2">
                          <div className="md:col-span-3">
                            <input
                              className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                              value={getOptionName(variant)}
                              onChange={(event) => {
                                const optionName = event.target.value;
                                const currentGroupName = getGroupName(variant);
                                updateVariant(globalIndex, {
                                  attribute_values: { ...variant.attribute_values, [OPTION_KEY]: optionName, [GROUP_KEY]: currentGroupName },
                                  name: buildVariantName(currentGroupName, optionName),
                                });
                              }}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <input
                              type="text"
                              className="w-full rounded-lg border border-border/60 bg-background px-1 py-1.5 text-center text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                              value={formatDisplay(variant.cost_price)}
                              onChange={(event) => handleNumberChange(globalIndex, 'cost_price', event.target.value)}
                            />
                          </div>
                          <div className="md:col-span-1 px-1 text-center">
                            <div className={`text-[11px] font-bold ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatDisplay(profit)}</div>
                            <div className="text-[9px] font-black opacity-40">
                              {variant.cost_price > 0 ? Math.round((profit / variant.cost_price) * 100) : 0}%
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <input
                              type="text"
                              className="w-full rounded-lg border border-border/60 bg-background px-1 py-1.5 text-center text-xs font-black text-primary outline-none focus:ring-2 focus:ring-primary/20"
                              value={formatDisplay(variant.price)}
                              onChange={(event) => handleNumberChange(globalIndex, 'price', event.target.value)}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <input
                              type="text"
                              disabled={variant.delivery_type === 'AUTO'}
                              className={`w-full rounded-lg border border-border/60 px-1 py-1.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 ${
                                variant.delivery_type === 'AUTO'
                                  ? 'cursor-not-allowed bg-secondary/50 text-muted-foreground'
                                  : 'bg-background text-blue-500'
                              }`}
                              value={variant.delivery_type === 'AUTO' ? 'AUTO' : formatDisplay(variant.stock_count)}
                              onChange={(event) => handleNumberChange(globalIndex, 'stock_count', event.target.value)}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full rounded-lg border border-border/60 bg-background px-1 py-1.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                              value={formatDisplay(normalizeMaxPerOrder(variant.max_per_order))}
                              onChange={(event) => handleNumberChange(globalIndex, 'max_per_order', event.target.value)}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background p-1">
                              {variant.delivery_type === 'AUTO' && variant.id && (
                                <button
                                  onClick={() => {
                                    setWarehouseVariantId(variant.id as number);
                                    loadWarehouse(variant.id as number);
                                  }}
                                  className="rounded-md p-1.5 text-primary transition-all hover:bg-primary/10"
                                  title="Quản lý kho"
                                >
                                  <Boxes size={14} />
                                </button>
                              )}
                              <select
                                className="min-w-0 flex-1 appearance-none bg-transparent px-1 py-1 text-center text-[10px] font-black text-primary outline-none"
                                value={variant.delivery_type}
                                onChange={(event) =>
                                  updateVariant(globalIndex, { delivery_type: event.target.value === 'MANUAL' ? 'MANUAL' : 'AUTO' })
                                }
                              >
                                <option value="AUTO">Kho</option>
                                <option value="MANUAL">Đặt trước</option>
                              </select>
                            </div>
                          </div>
                          <div className="md:col-span-3">
                            <div className="flex justify-end gap-1">
                              {variant.delivery_type !== 'AUTO' && (
                                <button
                                  onClick={() => setInputConfigVariantIdx(globalIndex)}
                                  className="rounded-lg p-2 text-primary transition-all hover:bg-primary/10"
                                  title="Yêu cầu nhập"
                                >
                                  <MessageSquare size={15} />
                                </button>
                              )}
                              <button
                                onClick={() => setShowNoteIndex(showNoteIndex === globalIndex ? null : globalIndex)}
                                className={`rounded-lg p-2 transition-all ${
                                  variant.attribute_values?.ghi_chu
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                }`}
                                title="Ghi chú"
                              >
                                <StickyNote size={15} />
                              </button>
                              <button
                                onClick={() => setShowGuideIndex(showGuideIndex === globalIndex ? null : globalIndex)}
                                className={`rounded-lg p-2 transition-all ${
                                  variant.guide_link
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                }`}
                                title="Hướng dẫn"
                              >
                                <BookOpen size={15} />
                              </button>
                              <button
                                onClick={() => setShowWarrantyIndex(showWarrantyIndex === globalIndex ? null : globalIndex)}
                                className={`rounded-lg p-2 transition-all ${
                                  variant.has_warranty
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                }`}
                                title="Bảo hành"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                              </button>
                              <select
                                className="rounded-lg border border-border/60 bg-background px-2 py-1 text-[10px] font-bold outline-none"
                                value={variant.status}
                                onChange={(event) => updateVariant(globalIndex, { status: event.target.value as VariantStatus })}
                              >
                                <option value="ACTIVE">Mở bán</option>
                                <option value="OUT_OF_STOCK">Hết</option>
                                <option value="HIDDEN">Ẩn</option>
                              </select>
                              <button
                                onClick={() => saveVariant(globalIndex)}
                                disabled={isSaving}
                                className={`rounded-lg p-2 transition-all ${
                                  variant.id ? 'text-green-500 hover:bg-green-500/10' : 'text-primary hover:bg-primary/10'
                                }`}
                                title={variant.id ? 'Cập nhật' : 'Lưu'}
                              >
                                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                              </button>
                              <button
                                onClick={() => deleteVariant(globalIndex)}
                                disabled={variants.length <= 1 || isSaving}
                                className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 disabled:opacity-0"
                                title="Xóa"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {showNoteIndex === globalIndex && (
                          <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <StickyNote size={14} className="text-primary" />
                              <span className="text-xs font-black uppercase tracking-wider text-primary/80">Ghi chú cho phân loại</span>
                            </div>
                            <textarea
                              className="min-h-[80px] w-full resize-none rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="Nhập ghi chú riêng cho phân loại này"
                              value={variant.attribute_values?.ghi_chu || ''}
                              onChange={(event) =>
                                updateVariant(globalIndex, {
                                  attribute_values: { ...variant.attribute_values, ghi_chu: event.target.value },
                                })
                              }
                            />
                          </div>
                        )}

                        {showGuideIndex === globalIndex && (
                          <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <BookOpen size={14} className="text-primary" />
                              <span className="text-xs font-black uppercase tracking-wider text-primary/80">Hướng dẫn sử dụng / bảo hành</span>
                            </div>
                            <input
                              className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="https://..."
                              value={variant.guide_link || ''}
                              onChange={(event) => updateVariant(globalIndex, { guide_link: event.target.value })}
                            />
                          </div>
                        )}

                        {showWarrantyIndex === globalIndex && (
                          <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                              <span className="text-xs font-black uppercase tracking-wider text-primary/80">Cấu hình bảo hành</span>
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-primary/20 bg-background text-primary"
                                  checked={variant.has_warranty}
                                  onChange={(e) => updateVariant(globalIndex, { has_warranty: e.target.checked })}
                                />
                                <span className="text-sm font-medium">Bật bảo hành cho phân loại này</span>
                              </label>
                              
                              {variant.has_warranty && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Thời gian:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-20 rounded-xl border border-primary/20 bg-background px-3 py-2 text-center text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    value={variant.warranty_days}
                                    onChange={(e) => updateVariant(globalIndex, { warranty_days: parseInt(e.target.value) || 0 })}
                                  />
                                  <span className="text-sm font-medium text-muted-foreground">ngày</span>
                                </div>
                              )}
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">Thời gian bảo hành sẽ bắt đầu tính từ lúc đơn hàng hoàn thành (bàn giao xong).</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {warehouseVariantId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Quản lý kho hàng</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Dan moi dong la mot ma / serial / thong tin giao cho khach.</p>
              </div>
              <button
                onClick={() => {
                  stopCameraScanner();
                  setWarehouseVariantId(null);
                  setWarehouseItems([]);
                  setNewItemsText('');
                  setScanInputValue('');
                }}
                className="rounded-full p-2 transition-all hover:bg-secondary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
                <label className="mb-2 block text-xs font-black uppercase text-muted-foreground">Thêm mã hàng</label>
                <div className="mb-3 space-y-2">
                  <label className="block text-[11px] font-bold text-muted-foreground">Quét mã vạch / serial</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanLine size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                      <input
                        className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Bắn mã vạch vào đây rồi Enter"
                        value={scanInputValue}
                        onChange={(event) => setScanInputValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleScanInputSubmit();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 text-primary transition-all hover:bg-primary/5"
                      title="Quét bằng camera"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hỗ trợ máy quét mã vạch dạng bàn phím. Mỗi lần quét sẽ tự thêm 1 dòng vào danh sách nhập kho.
                  </p>
                </div>
                <textarea
                  className="min-h-[220px] w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={'Mỗi dòng là một mã hàng\nSN-001\nSN-002'}
                  value={newItemsText}
                  onChange={(event) => setNewItemsText(event.target.value)}
                />
                <button
                  onClick={addWarehouseItems}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-white"
                >
                  <Plus size={16} /> Thêm vào kho
                </button>
              </div>

              <div className="flex min-h-0 flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-foreground">Danh sách tồn kho</h4>
                  <span className="text-xs font-bold text-muted-foreground">{warehouseItems.length} item</span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-background">
                  {isWarehouseLoading ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : warehouseItems.length === 0 ? (
                    <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm font-medium text-muted-foreground">
                      Kho chưa có dữ liệu.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {warehouseItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <pre className="whitespace-pre-wrap break-all font-mono text-sm text-foreground">{item.item_data}</pre>
                          </div>
                          <button
                            onClick={() => deleteWarehouseItem(item.id)}
                            className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isCameraScannerOpen && (
              <div className="border-t border-border bg-background/60 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-foreground">Quét mã vạch bằng camera</h4>
                    <p className="text-[11px] text-muted-foreground">Đưa mã vạch vào khung hình, hệ thống sẽ tự thêm vào ô nhập kho.</p>
                  </div>
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold"
                  >
                    Đóng quét
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="h-[260px] w-full object-cover" />
                </div>
                {cameraScanError && <p className="mt-3 text-sm font-medium text-red-500">{cameraScanError}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {inputConfigVariantIdx !== null && (
        <InputRequirementsModal
          variant={variants[inputConfigVariantIdx]}
          onClose={() => setInputConfigVariantIdx(null)}
          onSave={(inputs) => {
            updateVariant(inputConfigVariantIdx, { required_inputs: inputs });
            setInputConfigVariantIdx(null);
          }}
        />
      )}
    </div>
  );
}

function InputRequirementsModal({
  variant,
  onClose,
  onSave,
}: {
  variant: Variant;
  onClose: () => void;
  onSave: (inputs: RequiredInput[]) => void;
}) {
  const [inputs, setInputs] = useState<RequiredInput[]>(variant.required_inputs || []);

  const addInput = () => {
    const id = `input_${Date.now()}`;
    setInputs((prev) => [...prev, { id, label: '', type: 'text', required: true, placeholder: '' }]);
  };

  const updateInput = (index: number, patch: Partial<RequiredInput>) => {
    setInputs((prev) => prev.map((input, idx) => (idx === index ? { ...input, ...patch } : input)));
  };

  const removeInput = (index: number) => {
    setInputs((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <MessageSquare size={20} className="text-primary" /> Yêu cầu từ khách mua
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Khách sẽ điền các thông tin này khi chọn: <span className="font-semibold">{variant.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-all hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="space-y-3">
            {inputs.map((input, index) => (
              <div key={input.id} className="group relative rounded-2xl border border-border/50 bg-secondary/30 p-4">
                <button
                  onClick={() => removeInput(index)}
                  className="absolute right-3 top-3 p-1.5 text-muted-foreground transition-all hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>

                <div className="grid grid-cols-1 gap-3 pr-8 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase text-muted-foreground">Tên trường</label>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-primary/20"
                      placeholder="VD: Màu sắc / Serial / Ghi chú"
                      value={input.label}
                      onChange={(event) => updateInput(index, { label: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase text-muted-foreground">Gợi ý</label>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                      placeholder="Nhập ví dụ..."
                      value={input.placeholder}
                      onChange={(event) => updateInput(index, { placeholder: event.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 pr-8 md:grid-cols-2">
                  <div className="flex items-center gap-4 px-1">
                    <select
                      className="cursor-pointer bg-transparent text-xs font-bold text-primary outline-none"
                      value={input.type}
                      onChange={(event) => updateInput(index, { type: event.target.value as RequiredInput['type'] })}
                    >
                      <option value="text">Dòng ngắn</option>
                      <option value="textarea">Đoạn văn</option>
                    </select>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/20"
                        checked={input.required}
                        onChange={(event) => updateInput(index, { required: event.target.checked })}
                      />
                      <span className="text-xs font-bold text-muted-foreground">Bắt buộc</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}

            {inputs.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/10 py-8 text-muted-foreground">
                <ListPlus size={32} className="mb-2 opacity-20" />
                <p className="text-xs font-bold">Chưa có yêu cầu nào</p>
              </div>
            )}

            <button
              onClick={addInput}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 py-3 text-xs font-bold text-primary transition-all hover:bg-primary/5"
            >
              <Plus size={16} /> Thêm yêu cầu mới
            </button>
          </div>
        </div>

        <div className="flex gap-3 border-t border-border bg-muted/20 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold transition-all hover:bg-secondary"
          >
            Hủy
          </button>
          <button
            onClick={() => onSave(inputs)}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90"
          >
            <Check size={18} /> Lưu thiết lập
          </button>
        </div>
      </div>
    </div>
  );
}
