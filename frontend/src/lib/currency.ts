export function formatVND(value: number | string | null | undefined): string {
  const numericValue = typeof value === 'string' ? Number(value) : Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(0);
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numericValue);
}
