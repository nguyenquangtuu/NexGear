import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import VariantEditor from '../../_components/VariantEditor';

export default async function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Link
            href="/tp-admin/products"
            className="rounded-xl bg-secondary p-2 text-muted-foreground transition-all hover:bg-secondary/80 hover:text-foreground sm:p-2.5"
          >
            <ChevronLeft size={18} />
          </Link>

          <div>
            <h2 className="text-xl font-bold leading-tight sm:text-2xl">Quản lý biến thể</h2>
            <p className="text-sm text-muted-foreground">Sản phẩm #{id}</p>
          </div>
        </div>

        <Link
          href={`/tp-admin/products/${id}/edit`}
          className="w-full rounded-xl bg-secondary px-4 py-2.5 text-center text-sm font-bold text-foreground transition-all hover:bg-secondary/80 sm:w-auto sm:py-2"
        >
          Sửa thông tin chính
        </Link>
      </div>

      <VariantEditor productId={id} />
    </div>
  );
}
