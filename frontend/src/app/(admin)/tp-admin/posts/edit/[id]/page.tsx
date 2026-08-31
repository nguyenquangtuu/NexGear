'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PostEditor from '../../_components/PostEditor';

export default function EditPostPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const res = await apiFetch(`/posts/${id}`);
      if (res.success) {
        setPost(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch post', error);
      // Mock for demo
      setPost({
        title: 'Hướng dẫn nạp tiền qua ngân hàng',
        slug: 'huong-dan-nap-tien',
        content: '<h1>Hướng dẫn nạp tiền</h1><p>Nội dung mẫu...</p>',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
        status: 'PUBLIC',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-card border border-border rounded-2xl animate-pulse">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground mt-4 font-bold">Đang tải dữ liệu bài viết...</p>
      </div>
    );
  }

  return <PostEditor initialData={post} isEdit postId={id as string} />;
}
