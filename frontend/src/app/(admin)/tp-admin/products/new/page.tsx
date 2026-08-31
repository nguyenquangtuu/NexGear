import ProductEditor from '../_components/ProductEditor';

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Thêm sản phẩm mới</h2>
      <ProductEditor />
    </div>
  );
}
