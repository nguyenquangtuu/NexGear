'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Minus, Plus, ShieldCheck, Share2, Heart, CheckCircle2, XCircle, Loader2, StickyNote } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import toast from 'react-hot-toast';
import { saveToHistory } from '@/lib/history';
import PersonalizedNewArrivals from '@/components/PersonalizedNewArrivals';
import ClientPortal from '@/components/ClientPortal';
import { resolveMediaUrl, transformHtmlContent } from '@/lib/media';

type ProductRequiredInput = {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
};

type Variant = {
  id: number;
  name: string;
  price: number;
  maxPerOrder?: number;
  deliveryType?: 'AUTO' | 'MANUAL' | 'API';
  availableStock?: number;
  requiredInputs?: ProductRequiredInput[];
  attribute_values?: Record<string, string>;
  has_warranty?: boolean;
  warranty_days?: number;
};

type Attribute = {
  name: string;
  values: string[];
};

type Product = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  images?: string[] | null;
  rating?: number | null;
  users?: string | null;
  showRating?: boolean;
  showSoldCount?: boolean;
  show_rating?: boolean | number | null;
  show_sold_count?: boolean | number | null;
  infoHtml?: string | null;
  badge?: string | null;
  attributes?: Attribute[];
  seo?: {
    title?: string | null;
    description?: string | null;
    keywords?: string | null;
    canonicalUrl?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;
    schemaBrand?: string | null;
    schemaSku?: string | null;
    schemaGtin?: string | null;
    schemaMpn?: string | null;
  };
  features?: { text: string; type: 'check' | 'cross' }[];
  category?: {
    id: number;
    name: string;
    slug: string;
    parentId?: number | null;
    parentName?: string | null;
    parentSlug?: string | null;
  } | null;
  variants?: Variant[];
};

const MIN_BANK_PAYMENT_AMOUNT = 2000;

function getProductImages(product: Product) {
  const gallery = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  
  // Use gallery images if available, otherwise fallback to thumbnail
  const imagesToShow = gallery.length > 0 ? gallery : (product.thumbnail ? [product.thumbnail] : []);

  const normalized = imagesToShow
    .map((src) => resolveMediaUrl(src, ''))
    .filter(Boolean) as string[];

  return normalized.length > 0 ? normalized : ['/file.svg'];
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

function parseSoldCount(users?: string | null) {
  if (!users) return 0;
  const n = Number(String(users).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function resolveVisibilityFlag(value: boolean | number | null | undefined, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 0;
}

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user, refreshUser } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | number | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [requiredInputValues, setRequiredInputValues] = useState<Record<string, string>>({});
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<{
    code: string;
    discountAmount: number;
    subtotal: number;
    shippingFee: number;
    total: number;
  } | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [pickupStore, setPickupStore] = useState('store_hanoi');
  const [useBalance, setUseBalance] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [buyModalStep, setBuyModalStep] = useState(1);

  const STORE_LOCATIONS = [
    { id: 'store_hanoi', label: 'Cửa hàng Hà Nội' },
    { id: 'store_sai_gon', label: 'Cửa hàng Sài Gòn' },
    { id: 'store_da_nang', label: 'Cửa hàng Đà Nẵng' },
  ];
  const [buyMessage, setBuyMessage] = useState('');
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingNote, setShippingNote] = useState('');
  const [purchasedOrder, setPurchasedOrder] = useState<any>(null);
  const [invalidRequiredFieldId, setInvalidRequiredFieldId] = useState<string | null>(null);
  const requiredFieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/products/${encodeURIComponent(slug)}`);
        if (!cancelled) {
          const rawProduct = data.data;
          if (rawProduct && Array.isArray(rawProduct.variants)) {
            rawProduct.variants = rawProduct.variants.map((v: Variant) => ({
              ...v,
              parsedAttrs: v.attribute_values ? (typeof v.attribute_values === 'string' ? JSON.parse(v.attribute_values) : v.attribute_values) : {}
            }));
          }
          setProduct(rawProduct);
          
          // Log viewed product to history
          if (rawProduct) {
            const minPrice = rawProduct.variants && rawProduct.variants.length > 0
              ? Math.min(...rawProduct.variants.map((v: any) => v.price))
              : 0;
              
            saveToHistory({
              id: rawProduct.id,
              slug: rawProduct.slug,
              name: rawProduct.name,
              thumbnail: rawProduct.thumbnail,
              price: minPrice,
              viewedAt: Date.now()
            });
          }
          
          // Initialize selected attributes
          setSelectedAttributes({});
          setSelectedVariantId(null);
          setSelectedGroup('');
          setQuantity(1);
          setActiveImageIndex(0);
          setRequiredInputValues({});
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Không thể tải sản phẩm');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Resolve current variant
  const selectedVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null;
    
    // If only one variant, use it as default
    if (product.variants.length === 1) return product.variants[0];

    return product.variants.find(v => {
      const vAttrs = (v as any).parsedAttrs || v.attribute_values || {};
      
      // Match Group (Nhóm)
      if (selectedGroup && vAttrs['Nhóm']) {
        if (String(vAttrs['Nhóm']).trim() !== String(selectedGroup).trim()) return false;
      }
      
      // Match other attributes
      return Object.entries(selectedAttributes).every(([key, val]) => {
        if (!val) return true;
        // If the variant has this attribute, it must match
        if (vAttrs[key]) {
          return String(vAttrs[key]).trim() === String(val).trim();
        }
        // If variant doesn't have it, we ignore it for matching
        return true;
      });
    });
  }, [product?.variants, selectedGroup, selectedAttributes]);

  // Update selectedVariantId when attributes change
  useEffect(() => {
    if (selectedVariant) {
      setSelectedVariantId(selectedVariant.id);
    } else {
      setSelectedVariantId(null);
    }
  }, [selectedVariant]);

  // Derived data for UI
  const groups = useMemo(() => {
    if (!product?.variants) return [];
    return Array.from(new Set(product.variants.map(v => ((v as any).parsedAttrs || {})['Nhóm']).filter(Boolean)));
  }, [product?.variants]);

  const optionsForSelectedGroup = useMemo(() => {
    if (!product?.variants || !selectedGroup) return [];
    return Array.from(new Set(product.variants
      .filter(v => ((v as any).parsedAttrs || {})['Nhóm'] === selectedGroup)
      .map(v => ((v as any).parsedAttrs || {})['Tùy chọn'])
      .filter(Boolean)
    ));
  }, [product?.variants, selectedGroup]);

  // Auto-select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);

  // Auto-select first option when group changes
  useEffect(() => {
    if (selectedGroup && optionsForSelectedGroup.length > 0) {
      // Only auto-select if current selection isn't in the new group's options
      if (!optionsForSelectedGroup.includes(selectedAttributes['Tùy chọn'])) {
        setSelectedAttributes(prev => ({ ...prev, 'Tùy chọn': optionsForSelectedGroup[0] }));
      }
    }
  }, [selectedGroup, optionsForSelectedGroup, selectedAttributes]);

  const handleSelectAttribute = (key: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [key]: value }));
  };

  const soldCount = useMemo(() => parseSoldCount(product?.users), [product?.users]);
  const canShowRating = useMemo(
    () => resolveVisibilityFlag(product?.showRating ?? product?.show_rating, product?.rating != null),
    [product?.showRating, product?.show_rating, product?.rating]
  );
  const canShowSoldCount = useMemo(
    () => resolveVisibilityFlag(product?.showSoldCount ?? product?.show_sold_count, product?.users != null),
    [product?.showSoldCount, product?.show_sold_count, product?.users]
  );
  
  const priceRange = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null;
    const prices = product.variants.map(v => v.price).filter(p => typeof p === 'number');
    if (prices.length === 0) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }, [product?.variants]);

  const priceDisplay = useMemo(() => {
    if (selectedVariant) return formatVnd(selectedVariant.price);
    if (!priceRange) return 'Liên hệ';
    if (priceRange.min === priceRange.max) return formatVnd(priceRange.min);
    return `${formatVnd(priceRange.min)} - ${formatVnd(priceRange.max)}`;
  }, [selectedVariant, priceRange]);

  const price = selectedVariant?.price || 0;
  const shippingFee = deliveryMethod === 'DELIVERY' ? 50000 : 0;
  const orderSubtotal = discountPreview?.subtotal ?? price * quantity;
  const orderTotal = discountPreview?.total ?? price * quantity + shippingFee;
  const currentBalance = Number(user?.balance || 0);
  const hasBalance = currentBalance > 0;
  const mustUseBalance = orderTotal > 0 && orderTotal < MIN_BANK_PAYMENT_AMOUNT;
  const balanceApplied = useBalance ? Math.min(currentBalance, orderTotal) : 0;
  const remainingPayment = Math.max(0, orderTotal - balanceApplied);
  const images = useMemo(() => (product ? getProductImages(product) : ['/file.svg']), [product]);
  const activeImage = images[Math.min(activeImageIndex, images.length - 1)] || images[0];

  const selectedDeliveryType = selectedVariant?.deliveryType || 'AUTO';
  const maxPerOrder = selectedVariant ? Math.max(1, Number(selectedVariant.maxPerOrder || 1)) : 1;
  const availableStock = selectedVariant ? Math.max(0, Number(selectedVariant.availableStock ?? 0)) : 0;
  const maxQuantity = selectedVariant 
    ? ((selectedDeliveryType === 'AUTO' || selectedDeliveryType === 'API') ? Math.min(maxPerOrder, availableStock) : maxPerOrder)
    : 1;
  const canIncreaseQuantity = maxQuantity > 0 && quantity < maxQuantity;
  const isOutOfStock = !!selectedVariant && (selectedDeliveryType === 'AUTO' || selectedDeliveryType === 'API') && maxQuantity <= 0;

  const visibleRequiredInputs = useMemo(() => {
    if (!selectedVariant || !Array.isArray(selectedVariant.requiredInputs)) return [];
    return selectedVariant.requiredInputs;
  }, [selectedVariant]);

  useEffect(() => {
    setInvalidRequiredFieldId(null);
  }, [selectedVariantId, showBuyModal]);

  useEffect(() => {
    if (mustUseBalance && !useBalance) {
      setUseBalance(true);
    }
  }, [mustUseBalance, useBalance]);

  useEffect(() => {
    setDiscountPreview(null);
  }, [deliveryMethod, pickupStore]);

  useEffect(() => {
    setActiveImageIndex((i) => Math.max(0, Math.min(i, images.length - 1)));
  }, [images.length]);

  useEffect(() => {
    if (maxQuantity <= 0) {
      setQuantity(1);
      return;
    }
    setQuantity((q) => Math.max(1, Math.min(q, maxQuantity)));
  }, [maxQuantity, selectedVariantId]);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setShippingName(user.fullName);
    }
  }, [user]);

  useEffect(() => {
    if (showBuyModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showBuyModal]);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const focusRequiredField = (fieldId: string) => {
    setInvalidRequiredFieldId(fieldId);
    const targetField = requiredFieldRefs.current[fieldId];
    if (targetField) {
      targetField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => targetField.focus(), 120);
    }
  };

  const getMissingRequiredField = () =>
    visibleRequiredInputs.find((field) => {
      if (!field.required) return false;
      return !String(requiredInputValues[field.id] || '').trim();
    });

  const handleOpenBuyModal = () => {
    if (!user) {
      alert('Vui lòng đăng nhập để mua hàng');
      router.push('/login');
      return;
    }

    if (!selectedVariant) {
      setBuyMessage('Vui lòng chọn phân loại sản phẩm');
      return;
    }

    if (selectedDeliveryType === 'AUTO' && maxQuantity <= 0) {
      setBuyMessage('Phân loại tự động này đã hết hàng');
      return;
    }

    const missingRequired = getMissingRequiredField();
    if (missingRequired) {
      setBuyMessage(`Vui lòng nhập: ${missingRequired.label}`);
      focusRequiredField(missingRequired.id);
      return;
    }

    setInvalidRequiredFieldId(null);
    setBuyMessage('');
    setShowBuyModal(true);
    setBuyModalStep(1);
    setPurchasedOrder(null);
    setDiscountPreview(null);
    setUseBalance(true);
  };

  const handleApplyDiscount = async () => {
    if (!selectedVariant || !discountCode.trim()) {
      setBuyMessage('Vui lòng nhập mã giảm giá');
      return;
    }

    setApplyLoading(true);
    setBuyMessage('');
    try {
      const response = await apiFetch('/orders/preview-discount', {
        method: 'POST',
        body: JSON.stringify({
          variantId: selectedVariant.id,
          quantity,
          discountCode: discountCode.trim(),
          deliveryMethod,
        }),
      });

      setDiscountPreview(response.data || null);
      setBuyMessage('Áp mã thành công');
    } catch (err: any) {
      setDiscountPreview(null);
      setBuyMessage(err?.message || 'Không thể áp mã giảm giá');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleConfirmBuy = async () => {
    if (!selectedVariant) {
      setBuyMessage('Vui lòng chọn phân loại sản phẩm');
      return;
    }

    const missingRequired = getMissingRequiredField();

    if (missingRequired) {
      setBuyMessage(`Vui lòng nhập: ${missingRequired.label}`);
      focusRequiredField(missingRequired.id);
      return;
    }

    if (!String(shippingName).trim()) {
      setBuyMessage('Vui lòng nhập tên người nhận');
      return;
    }

    if (!String(shippingPhone).trim()) {
      setBuyMessage('Vui lòng nhập số điện thoại người nhận');
      return;
    }

    if (deliveryMethod === 'DELIVERY' && !String(shippingAddress).trim()) {
      setBuyMessage('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    if (deliveryMethod === 'PICKUP' && !String(pickupStore).trim()) {
      setBuyMessage('Vui lòng chọn cửa hàng nhận hàng');
      return;
    }

    setInvalidRequiredFieldId(null);

    if (!selectedVariant.id) {
      setBuyMessage('Không xác định được phân loại sản phẩm, vui lòng chọn lại');
      return;
    }

    setBuyLoading(true);
    setBuyMessage('');
    try {
      const response = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          variantId: selectedVariant.id,
          quantity,
          requiredInputs: requiredInputValues,
          discountCode: discountCode.trim() || undefined,
          shippingName: shippingName.trim(),
          shippingPhone: shippingPhone.trim(),
          shippingAddress: deliveryMethod === 'DELIVERY' ? shippingAddress.trim() : undefined,
          shippingNote: shippingNote.trim() || undefined,
          deliveryMethod,
          pickupStore: deliveryMethod === 'PICKUP' ? pickupStore : undefined,
          useBalance: mustUseBalance ? true : useBalance,
        }),
      });

      const order = response.data;
      if (order.paymentRequired && order.checkoutUrl) {
        await refreshUser();
        window.location.href = order.checkoutUrl;
        return;
      }
      setPurchasedOrder(order);
      setDiscountPreview(null);
      setDiscountCode('');
      setBuyMessage('');
      
      // Hiển thị thông báo
      toast.success(order.status === 'COMPLETED' ? 'Mua hàng thành công!' : 'Đơn hàng đang được xử lý');

      // Refresh user to update balance immediately
      refreshUser();
    } catch (err: any) {
      setBuyMessage(err?.message || 'Không thể tạo đơn hàng');
    } finally {
      setBuyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-background">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-40 bg-muted rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-[4/3] bg-muted rounded-3xl" />
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-20 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] bg-background">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 text-sm font-medium">
            {error}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-background" suppressHydrationWarning>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-40 bg-muted rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-[4/3] bg-muted rounded-3xl" />
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-20 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-background" suppressHydrationWarning>
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="p-4 rounded-2xl border border-border bg-card text-sm font-medium">
            Không tìm thấy sản phẩm
          </div>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const jsonLdProduct = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: getProductImages(product),
        description: product.seo?.description || product.description || '',
        sku: product.seo?.schemaSku || undefined,
        gtin: product.seo?.schemaGtin || undefined,
        mpn: product.seo?.schemaMpn || undefined,
        brand: product.seo?.schemaBrand ? { '@type': 'Brand', name: product.seo.schemaBrand } : { '@type': 'Brand', name: 'VEXTRO' },
        aggregateRating: product.rating ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: Math.max(1, soldCount),
          bestRating: 5,
          worstRating: 1
        } : undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: selectedVariant?.price || priceRange?.min || 0,
          availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          priceValidUntil: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0],
        },
      }
    : null;

  return (
    <div className="bg-background pb-28 lg:pb-20">
      {/* JSON-LD for SEO moved to a safe location or managed via metadata if possible */}
      {jsonLdProduct && (
        <Script
          id="product-jsonld"
          strategy="afterInteractive"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
        />
      )}

      <div className="bg-background pb-28 lg:pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          {product.category?.parentName && product.category?.parentSlug && (
            <>
              <Link 
                href={`/category/${product.category.parentSlug}`}
                className="hover:text-primary transition-colors text-foreground"
              >
                {product.category.parentName}
              </Link>
              <span>/</span>
            </>
          )}
          {product.category?.name && product.category?.slug && (
            <>
              <Link 
                href={`/category/${product.category.slug}`}
                className="hover:text-primary transition-colors text-foreground"
              >
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="line-clamp-1 max-w-[50vw] text-foreground font-semibold">{product.name}</span>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6">
            <div className="sticky top-6 space-y-4">
            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              <div className="relative aspect-square bg-muted">
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="w-full h-full object-cover select-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/file.svg';
                  }}
                />
                {product.badge && (
                  <div className="absolute top-4 left-4">
                    <span className="rounded-xl bg-primary/90 px-3 py-1.5 text-[10px] font-black text-white uppercase tracking-wider">
                      {product.badge}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-2xl bg-background/60 backdrop-blur px-3 py-2 text-xs font-black text-foreground hover:bg-background transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </button>
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-3">
                {images.slice(0, 5).map((src, i) => {
                  const selected = i === activeImageIndex;
                  return (
                    <button
                      key={`thumb-${src}-${i}`}
                      type="button"
                      onClick={() => setActiveImageIndex(i)}
                      className={[
                        'relative aspect-square rounded-2xl overflow-hidden transition-all',
                        selected ? 'opacity-100 ring-2 ring-primary/40' : 'opacity-60 hover:opacity-100',
                      ].join(' ')}
                    >
                      <img 
                        src={src} 
                        alt={`${product.name} ${i + 1}`} 
                        className="h-full w-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/file.svg';
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-card p-4 md:p-5 space-y-3.5">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight flex-1">
                      {product.name}
                    </h1>
                    <button 
                      onClick={handleShare}
                      className="relative p-2 rounded-xl bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group shrink-0"
                      title="Chia sẻ sản phẩm"
                    >
                      <Share2 className="h-4.5 w-4.5" />
                      {copied && (
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200 whitespace-nowrap">
                          Đã copy!
                        </span>
                      )}
                    </button>
                  </div>
                  {product.tagline && (
                    <p className="text-sm font-semibold text-muted-foreground line-clamp-2">
                      {product.tagline}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {product.rating != null && canShowRating && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      {Number(product.rating).toFixed(1)}
                    </div>
                  )}
                  {product.users != null && canShowSoldCount && (
                    <div className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      Đã bán <span className="ml-1 text-foreground">{Number(product.users).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                  {selectedVariant && (
                    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {selectedVariant.has_warranty
                        ? `Bảo hành ${Number(selectedVariant.warranty_days || 0).toLocaleString('vi-VN')} ngày`
                        : 'Không hỗ trợ bảo hành'}
                    </div>
                  )}
                  <div className="ml-auto text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Giá</p>
                    <p className="text-2xl font-bold text-primary leading-none">{priceDisplay}</p>
                  </div>
                </div>

                {selectedVariant?.attribute_values?.['nhom_ghi_chu'] && (
                  <div className="p-3.5 bg-secondary/30 border border-border/50 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-500">
                    <div className="flex gap-2.5">
                       <StickyNote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                       <div className="space-y-1">
                         <p className="text-[10px] font-black text-primary uppercase tracking-wider">Thông tin từ nhà cung cấp</p>
                         <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                           {selectedVariant.attribute_values['nhom_ghi_chu']}
                         </p>
                       </div>
                    </div>
                  </div>
                )}

                {/* Hierarchical Selection UI */}
                <div className="space-y-4 py-1">
                  {[
                    { label: 'Cấu hình sản phẩm', items: groups, current: selectedGroup, onSelect: (g: string) => { setSelectedGroup(g); setSelectedAttributes({}); } },
                    { label: 'Chọn gói', items: optionsForSelectedGroup, current: selectedAttributes['Tùy chọn'], onSelect: (o: string) => handleSelectAttribute('Tùy chọn', o) }
                  ].map((section, idx) => section.items.length > 0 && (
                    <div key={idx} className="space-y-2.5">
                      <div className="flex items-center gap-2 px-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-primary/40'}`} />
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.15em]">{section.label}</label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((item) => {
                          const isSelected = section.current === item;
                          return (
                            <button
                              key={item}
                              onClick={() => section.onSelect(item)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border-2 ${
                                isSelected
                                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                                  : "bg-secondary/5 border-border hover:border-primary/40 hover:bg-secondary/10"
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>


                {!isOutOfStock && (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-black text-foreground">Số lượng</p>
                      {selectedVariant && (
                        <p className="text-[11px] font-bold text-muted-foreground">Tối đa: {maxQuantity > 0 ? maxQuantity : 0} / đơn</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="min-w-8 text-center text-sm font-black text-foreground">{quantity}</div>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
                        disabled={!canIncreaseQuantity}
                        className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-secondary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!isOutOfStock && visibleRequiredInputs.length > 0 && (
                  <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                    <p className="text-sm font-black text-foreground leading-none">Thông tin bắt buộc</p>
                    {visibleRequiredInputs.map((field) => {
                      const inputType = field.type === 'textarea' ? 'text' : field.type || 'text';
                      const value = requiredInputValues[field.id] || '';
                      const isMissingRequired = invalidRequiredFieldId === field.id && field.required && !String(value).trim();

                      return (
                        <div key={field.id} className="space-y-2">
                          <label
                            htmlFor={`required-${field.id}`}
                            className={`block text-sm font-semibold leading-tight ${isMissingRequired ? 'text-amber-400' : 'text-muted-foreground'}`}
                          >
                            {field.label}
                            {field.required ? ' *' : ''}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              id={`required-${field.id}`}
                              ref={(node) => {
                                requiredFieldRefs.current[field.id] = node;
                              }}
                              value={value}
                              placeholder={field.placeholder || field.label}
                              required={!!field.required}
                              onChange={(e) => {
                                setRequiredInputValues((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }));
                                if (invalidRequiredFieldId === field.id && String(e.target.value).trim()) {
                                  setInvalidRequiredFieldId(null);
                                }
                              }}
                              className={`min-h-[92px] w-full rounded-xl border bg-background px-3.5 py-2.5 text-base text-foreground outline-none ring-offset-background placeholder:text-muted-foreground/90 focus:ring-2 ${
                                isMissingRequired
                                  ? 'border-amber-400 bg-amber-500/5 shadow-[0_0_0_1px_rgba(251,191,36,0.35)] focus:ring-amber-400/30'
                                  : 'border-border focus:ring-primary/30'
                              }`}
                            />
                          ) : (
                            <input
                              id={`required-${field.id}`}
                              ref={(node) => {
                                requiredFieldRefs.current[field.id] = node;
                              }}
                              type={inputType}
                              value={value}
                              placeholder={field.placeholder || field.label}
                              required={!!field.required}
                              onChange={(e) => {
                                setRequiredInputValues((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }));
                                if (invalidRequiredFieldId === field.id && String(e.target.value).trim()) {
                                  setInvalidRequiredFieldId(null);
                                }
                              }}
                              className={`h-11 w-full rounded-xl border bg-background px-3.5 text-base text-foreground outline-none ring-offset-background placeholder:text-muted-foreground/90 focus:ring-2 ${
                                isMissingRequired
                                  ? 'border-amber-400 bg-amber-500/5 shadow-[0_0_0_1px_rgba(251,191,36,0.35)] focus:ring-amber-400/30'
                                  : 'border-border focus:ring-primary/30'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Product Features Checklist */}
                {product && Array.isArray(product.features) && product.features.length > 0 && (
                  <div className="space-y-3 py-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Cam kết & Tính năng</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                      {product.features.map((feature: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 group">
                          <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                            feature.type === 'check' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {feature.type === 'check' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          </div>
                          <span className={`text-[13px] font-semibold leading-tight ${
                            feature.type === 'check' ? 'text-foreground' : 'text-muted-foreground line-through opacity-70'
                          }`}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => product && toggleWishlist(product.id)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all group border ${
                      product && isInWishlist(product.id)
                        ? 'bg-pink-500/10 border-pink-500/40 text-pink-500 shadow-sm shadow-pink-500/5'
                        : 'bg-secondary text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <Heart className={`h-4 w-4 transition-all group-hover:scale-110 ${
                      product && isInWishlist(product.id) ? 'fill-pink-500 text-pink-500' : 'group-hover:text-pink-500'
                    }`} />
                    Yêu thích
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBuyModal}
                    disabled={isOutOfStock}
                    className={`w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all ${
                      isOutOfStock
                        ? 'bg-blue-600/70 dark:bg-blue-500/35 text-white/95 cursor-not-allowed'
                        : 'bg-primary shadow-lg shadow-primary/20 hover:opacity-90'
                    }`}
                  >
                    {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
                  </button>
                </div>

                {!!buyMessage && !showBuyModal && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                    {buyMessage}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-card/90 backdrop-blur">
            <h2 className="text-base font-black text-primary">Thông tin sản phẩm</h2>
          </div>

          <div className="p-6 space-y-6">
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Danh mục</p>
                <p className="text-sm font-black text-foreground mt-1">
                  {product.category?.parentName ? `${product.category.parentName} > ` : ''}
                  {product.category?.name || 'Sản phẩm'}
                </p>
              </div>
            </div>

            {product.infoHtml ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: transformHtmlContent(product.infoHtml) }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có nội dung chi tiết.</p>
            )}
          </div>
        </div>

        <PersonalizedNewArrivals
          currentProductId={product.id}
          currentCategorySlug={product.category?.slug || null}
          currentParentCategorySlug={product.category?.parentSlug || null}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur lg:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Giá</p>
            <p className="text-lg font-bold text-primary">{priceDisplay}</p>
          </div>
          <button
            type="button"
            onClick={handleOpenBuyModal}
            disabled={isOutOfStock}
            className={`flex-1 rounded-2xl py-3 text-sm font-bold transition-all active:scale-[0.99] ${
              isOutOfStock
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-white shadow-xl shadow-primary/20 hover:opacity-90'
            }`}
          >
            {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
          </button>
        </div>
      </div>

      {showBuyModal && (
        <ClientPortal>
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-[3px] overflow-y-auto overscroll-contain">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
              <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 space-y-4 shadow-2xl my-auto animate-in zoom-in-95 fade-in duration-200">
            {purchasedOrder ? (
              <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground">Mua hàng thành công!</h3>
                  <p className="text-sm text-muted-foreground">Mã đơn hàng: <span className="font-bold text-primary">{purchasedOrder.orderCode}</span></p>
                  <p className="text-xs text-muted-foreground font-medium">
                    Trạng thái: {purchasedOrder.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang chờ xử lý'}
                  </p>
                </div>
                
                <div className="w-full grid grid-cols-2 gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBuyModal(false);
                      setPurchasedOrder(null);
                    }}
                    className="h-11 rounded-xl bg-secondary text-sm font-bold border border-border"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/profile/orders')}
                    className="h-11 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20"
                  >
                    Xem đơn hàng
                  </button>
                </div>
              </div>
            ) : buyLoading ? (
              <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                     <Loader2 className="h-10 w-10 text-primary animate-spin" />
                   </div>
                   <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-primary/20 border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                 </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">Đang xử lý...</h3>
                  <p className="text-sm text-muted-foreground font-medium">Vui lòng không đóng cửa sổ này</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black">Xác nhận mua hàng</h3>
                  <button
                    type="button"
                    onClick={() => setShowBuyModal(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <div className={`h-1.5 flex-1 rounded-full ${buyModalStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                  <div className={`h-1.5 flex-1 rounded-full ${buyModalStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                </div>

                {buyModalStep === 1 ? (
                  <>
                    <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-1 text-sm">
                      <p><span className="font-bold">Sản phẩm:</span> {product.name}</p>
                      <p><span className="font-bold">Phân loại:</span> {selectedVariant?.name || '-'}</p>
                      <p><span className="font-bold">Số lượng:</span> {quantity}</p>
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-bold text-foreground">Mã giảm giá</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          placeholder="Nhập mã giảm giá"
                          className="h-11 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleApplyDiscount}
                          disabled={applyLoading}
                          className="h-11 px-4 rounded-xl bg-secondary text-sm font-bold border border-border disabled:opacity-60"
                        >
                          {applyLoading ? 'Đang áp...' : 'Áp mã'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-3 space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Tạm tính</span>
                        <span className="font-bold">{formatVnd(orderSubtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-green-600">
                        <span>Giảm giá</span>
                        <span className="font-bold">-{formatVnd(discountPreview?.discountAmount || 0)}</span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                        <span className="font-bold">Tổng tạm tính</span>
                        <span className="text-base font-black text-primary">{formatVnd(orderSubtotal - (discountPreview?.discountAmount || 0))}</span>
                      </div>
                    </div>

                    {buyMessage && (
                      <div className="text-sm font-semibold text-primary">{buyMessage}</div>
                    )}

                    <button
                      type="button"
                      onClick={() => setBuyModalStep(2)}
                      className="w-full h-11 rounded-xl bg-primary text-white text-sm font-black"
                    >
                      Tiếp tục
                    </button>
                  </>
                ) : (
                  <>
                      <div className="grid gap-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-black text-foreground">Phương thức nhận hàng</p>
                          <div className="flex bg-secondary/30 p-1 rounded-xl border border-border/50">
                            {['DELIVERY', 'PICKUP'].map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setDeliveryMethod(method as 'DELIVERY' | 'PICKUP')}
                                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                                  deliveryMethod === method
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {method === 'DELIVERY' ? 'Giao hàng' : 'Tại cửa hàng'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Người nhận</label>
                            <input
                              type="text"
                              value={shippingName}
                              onChange={(e) => setShippingName(e.target.value)}
                              placeholder="Họ tên người nhận"
                              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Số điện thoại</label>
                            <input
                              type="tel"
                              value={shippingPhone}
                              onChange={(e) => setShippingPhone(e.target.value)}
                              placeholder="0912..."
                              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                        {deliveryMethod === 'DELIVERY' ? (
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Địa chỉ nhận hàng</label>
                            <textarea
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                              placeholder="Số nhà, đường, phường/xã..."
                              rows={2}
                              className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Chọn cửa hàng</label>
                            <select
                              value={pickupStore}
                              onChange={(e) => setPickupStore(e.target.value)}
                              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            >
                              {STORE_LOCATIONS.map((store) => (
                                <option key={store.id} value={store.id}>{store.label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Ghi chú (nếu có)</label>
                          <textarea
                            value={shippingNote}
                            onChange={(e) => setShippingNote(e.target.value)}
                            placeholder="Ví dụ: Gọi trước 15p..."
                            rows={1}
                            className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                          />
                        </div>
                      </div>

                    {hasBalance ? (
                      <div 
                        onClick={() => {
                          if (mustUseBalance) {
                            toast.error(`Đơn dưới ${formatVnd(MIN_BANK_PAYMENT_AMOUNT)} bắt buộc dùng số dư`, {
                              id: 'must-use-balance-warn',
                              duration: 2000
                            });
                          } else {
                            setUseBalance(!useBalance);
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl border transition-all px-3.5 py-2.5 ${
                          mustUseBalance 
                            ? 'border-border bg-secondary/10 opacity-85 cursor-not-allowed' 
                            : 'border-border bg-secondary/20 hover:bg-secondary/30 cursor-pointer'
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <p className="text-xs font-black text-foreground">Sử dụng số dư</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            {mustUseBalance 
                              ? `Yêu cầu cho đơn dưới ${formatVnd(MIN_BANK_PAYMENT_AMOUNT)}`
                              : 'Khấu trừ số dư trước'
                            }
                          </p>
                        </div>
                        <div
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                            useBalance ? 'bg-primary' : 'bg-muted'
                          } ${mustUseBalance ? 'opacity-60' : ''}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              useBalance ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-secondary/10 px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <p className="text-xs font-bold">Thanh toán qua Ngân hàng</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>Phí {deliveryMethod === 'DELIVERY' ? 'giao hàng' : 'nhận tại cửa hàng'}</span>
                        <span className="font-bold">{formatVnd(shippingFee)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Tổng thanh toán</span>
                        <span className="text-lg font-black text-primary leading-none">{formatVnd(orderTotal)}</span>
                      </div>
                    </div>

                   
                    {buyMessage && (
                      <div className="text-sm font-semibold text-primary">{buyMessage}</div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBuyModalStep(1)}
                        className="h-11 rounded-xl bg-secondary text-foreground text-sm font-bold border border-border"
                      >
                        Quay lại
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBuy}
                        disabled={buyLoading}
                        className="h-11 rounded-xl bg-primary text-white text-sm font-black disabled:opacity-70"
                      >
                        {buyLoading ? 'Đang xử lý...' : 'Thanh toán'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ClientPortal>
  )}
    </div>
    </div>
  );
}
