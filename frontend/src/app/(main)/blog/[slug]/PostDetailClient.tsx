'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowLeft, Calendar, Eye, Share2, ShieldAlert } from 'lucide-react';
import { resolveMediaUrl, transformHtmlContent } from '@/lib/media';

type PostDetail = {
  id: string;
  title: string;
  content: string;
  thumbnail: string;
  status: 'PUBLIC' | 'LINK_ONLY' | 'HIDDEN';
  createdAt: string;
  viewCount: number;
  showThumbnailInContent?: boolean | number;
};

export default function PostDetailClient({ post }: { post: PostDetail | null }) {
  const shouldShowThumbnailInContent = useMemo(() => Boolean(post?.showThumbnailInContent), [post]);

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="h-20 w-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={40} />
        </div>
        <h1 className="text-2xl font-black">Rất tiếc!</h1>
        <p className="text-muted-foreground">Bài viết không tồn tại hoặc đã bị ẩn.</p>
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <ArrowLeft size={18} /> Quay lại Blog
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div className="space-y-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> QUAY LẠI BLOG
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
              <Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString('vi-VN')}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
              <Eye size={12} /> {post.viewCount} lượt xem
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">{post.title}</h1>
        </div>
      </div>

      {shouldShowThumbnailInContent && post.thumbnail ? (
        <div className="aspect-[21/9] rounded-3xl overflow-hidden border border-border shadow-2xl">
          <img src={resolveMediaUrl(post.thumbnail)} alt={post.title} className="w-full h-full object-cover" />
        </div>
      ) : null}

      <div
        className="prose prose-invert max-w-none
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-foreground
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-strong:text-foreground prose-strong:font-black
          prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
          prose-img:rounded-3xl prose-img:border prose-img:border-border
          prose-a:text-primary prose-a:font-black prose-a:no-underline hover:prose-a:underline"
        dangerouslySetInnerHTML={{ __html: transformHtmlContent(post.content) }}
      />

      <div className="pt-10 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.href);
            window.alert('Đã sao chép đường dẫn bài viết.');
          }}
          className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-muted text-foreground font-black rounded-2xl transition-all shadow-sm"
        >
          <Share2 size={18} /> Chia sẻ bài viết
        </button>
        <Link href="/blog" className="text-sm font-black text-primary hover:underline">
          Khám phá thêm bài viết khác →
        </Link>
      </div>
    </article>
  );
}
