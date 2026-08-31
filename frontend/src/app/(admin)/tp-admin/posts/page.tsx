'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash, Eye, EyeOff, Link2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: 'PUBLIC' | 'LINK_ONLY' | 'HIDDEN';
  createdAt: string;
  viewCount: number;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await apiFetch('/posts/admin');
      if (res.success) {
        setPosts(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch posts', error);
      // Mock data for demo if API not ready
      setPosts([
        { id: '1', title: 'Hướng dẫn nạp tiền qua ngân hàng', slug: 'huong-dan-nap-tien', status: 'PUBLIC', createdAt: new Date().toISOString(), viewCount: 1250 },
        { id: '2', title: 'Chính sách bảo hành sản phẩm', slug: 'chinh-sach-bao-hanh', status: 'LINK_ONLY', createdAt: new Date().toISOString(), viewCount: 450 },
        { id: '3', title: 'Draft bài viết mới', slug: 'draft-bai-viet', status: 'HIDDEN', createdAt: new Date().toISOString(), viewCount: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    try {
      const res = await apiFetch(`/posts/${id}`, { method: 'DELETE' });
      if (res.success) {
        setPosts(posts.filter(p => p.id !== id));
      }
    } catch (error) {
      alert('Xóa thất bại');
    }
  };

  const getStatusBadge = (status: Post['status']) => {
    switch (status) {
      case 'PUBLIC':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold"><Eye size={14} /> Công khai</span>;
      case 'LINK_ONLY':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold"><Link2 size={14} /> Có link mới thấy</span>;
      case 'HIDDEN':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold"><EyeOff size={14} /> Đã ẩn</span>;
    }
  };

  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Quản lý bài viết</h1>
          <p className="text-muted-foreground text-sm">Thêm, sửa và quản lý hiển thị các bài viết trên hệ thống.</p>
        </div>
        <Link 
          href="/tp-admin/posts/new"
          className="flex items-center gap-2 px-8 py-3 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} /> Viết bài mới
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 pl-11 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-black text-muted-foreground uppercase tracking-widest bg-muted/30">
                <th className="px-6 py-4">Bài viết</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-center">Lượt xem</th>
                <th className="px-6 py-4 text-center">Ngày tạo</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                    Chưa có bài viết nào được tìm thấy.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{post.title}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">/{post.slug}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {getStatusBadge(post.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold">{post.viewCount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-all"
                          title="Xem trước"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link 
                          href={`/tp-admin/posts/edit/${post.id}`}
                          className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-blue-500 transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-all"
                          title="Xóa"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
