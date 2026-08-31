'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { ChevronRight, Calendar, Eye, Search } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

interface Post {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  createdAt: string;
  viewCount: number;
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      // Chá»‰ láº¥y cĂ¡c bĂ i viáº¿t PUBLIC
      const res = await apiFetch('/posts/public');
      if (res.success) {
        setPosts(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch public posts', error);
      // Mock for demo
      setPosts([
        { 
          id: '1', 
          title: 'Hướng dẫn thanh toán đơn hàng bằng chuyển khoản', 
          slug: 'huong-dan-thanh-toan-chuyen-khoan', 
          thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
          createdAt: new Date().toISOString(), 
          viewCount: 1250 
        },
        { 
          id: '4', 
          title: 'Máº¹o báº£o máº­t tĂ i khoáº£n game trĂ¡nh bá»‹ hack', 
          slug: 'bao-mat-tai-khoan', 
          thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop',
          createdAt: new Date().toISOString(), 
          viewCount: 890 
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight">Blog & HÆ°á»›ng dáº«n</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Cáº­p nháº­t nhá»¯ng thĂ´ng tin má»›i nháº¥t, hÆ°á»›ng dáº«n sá»­ dá»¥ng vĂ  máº¹o báº£o máº­t tĂ i khoáº£n tá»« VEXTRO.
        </p>
      </div>

      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input 
          type="text"
          placeholder="TĂ¬m kiáº¿m bĂ i viáº¿t..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border pl-12 pr-4 py-4 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-3xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <div className="p-6 space-y-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-3xl">
          <p className="text-muted-foreground font-medium">KhĂ´ng tĂ¬m tháº¥y bĂ i viáº¿t nĂ o phĂ¹ há»£p.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <Link 
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all flex flex-col"
            >
              <div className="aspect-video relative overflow-hidden bg-muted">
                <img 
                  src={resolveMediaUrl(post.thumbnail, 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop')} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                    <span className="flex items-center gap-1.5"><Eye size={12} /> {post.viewCount}</span>
                  </div>
                  <h2 className="text-lg font-black leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-primary group-hover:gap-3 transition-all">
                  Xem chi tiáº¿t <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

