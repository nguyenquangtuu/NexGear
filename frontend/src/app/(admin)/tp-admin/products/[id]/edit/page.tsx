import ProductEditor from '../../_components/ProductEditor';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Chỉnh sửa sản phẩm #{id}</h2>
      <ProductEditor productId={id} />
    </div>
  );
}
