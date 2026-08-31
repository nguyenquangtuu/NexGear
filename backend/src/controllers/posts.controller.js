const pool = require('../config/mysql');
const { normalizeUploadPathsDeep } = require('../utils/asset-url');

const normalizePost = (post) => {
  const baseUrl = process.env.FRONTEND_ORIGIN || 'https://vextro.vn';
  const seoTitle = post.seoTitle || post.title;
  const seoDescription = post.seoDescription || post.content?.substring(0, 500) || '';
  
  return normalizeUploadPathsDeep({
    ...post,
    showThumbnailInContent: Boolean(post.showThumbnailInContent),
    seoTitle,
    seoDescription,
    ogTitle: post.ogTitle || seoTitle,
    ogDescription: post.ogDescription || seoDescription,
    ogImage: post.ogImage || post.thumbnail,
    canonicalUrl: post.canonicalUrl || `${baseUrl}/blog/${post.slug}`,
  });
};

const postsController = {
  // Admin: Get all posts
  getAllAdmin: async (req, res) => {
    try {
      const [posts] = await pool.query(
        'SELECT id, title, slug, status, thumbnail, show_thumbnail_in_content as showThumbnailInContent, seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords, canonical_url as canonicalUrl, og_title as ogTitle, og_description as ogDescription, og_image as ogImage, view_count as viewCount, created_at as createdAt FROM posts ORDER BY created_at DESC'
      );
      res.json({ success: true, data: posts.map(normalizePost) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Public: Get public posts
  getAllPublic: async (req, res) => {
    try {
      const [posts] = await pool.query(
        'SELECT id, title, slug, thumbnail, show_thumbnail_in_content as showThumbnailInContent, seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords, canonical_url as canonicalUrl, og_title as ogTitle, og_description as ogDescription, og_image as ogImage, view_count as viewCount, created_at as createdAt FROM posts WHERE status = "PUBLIC" ORDER BY created_at DESC'
      );
      res.json({ success: true, data: posts.map(normalizePost) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get single post by ID (Admin)
  getById: async (req, res) => {
    try {
      const [posts] = await pool.query(
        'SELECT id, title, slug, content, thumbnail, show_thumbnail_in_content as showThumbnailInContent, seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords, canonical_url as canonicalUrl, og_title as ogTitle, og_description as ogDescription, og_image as ogImage, status, view_count as viewCount, created_at as createdAt FROM posts WHERE id = ?',
        [req.params.id]
      );
      if (posts.length === 0) {
        return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
      }
      res.json({ success: true, data: normalizePost(posts[0]) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get single post by Slug (Public/Link)
  getBySlug: async (req, res) => {
    try {
      const [posts] = await pool.query(
        'SELECT id, title, slug, content, thumbnail, show_thumbnail_in_content as showThumbnailInContent, seo_title as seoTitle, seo_description as seoDescription, seo_keywords as seoKeywords, canonical_url as canonicalUrl, og_title as ogTitle, og_description as ogDescription, og_image as ogImage, status, view_count as viewCount, created_at as createdAt FROM posts WHERE slug = ?',
        [req.params.slug]
      );
      if (posts.length === 0) {
        return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
      }

      const post = normalizePost(posts[0]);
      // If hidden, only admin can see (though usually this route is public)
      if (post.status === 'HIDDEN' && (!req.session.user || req.session.user.role !== 'ADMIN')) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem bài viết này' });
      }

      // Update view count
      await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [post.id]);

      res.json({ success: true, data: post });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create post
  create: async (req, res) => {
    let { title, slug, content, thumbnail, status, showThumbnailInContent, seoTitle, seoDescription, seoKeywords, canonicalUrl, ogTitle, ogDescription, ogImage } = req.body;
    try {
      seoTitle = seoTitle || title;
      ogTitle = ogTitle || seoTitle;
      ogDescription = ogDescription || seoDescription;
      ogImage = ogImage || thumbnail;
      const baseUrl = process.env.FRONTEND_ORIGIN || 'https://vextro.vn';
      canonicalUrl = canonicalUrl || `${baseUrl}/blog/${slug}`;

      const [result] = await pool.query(
        'INSERT INTO posts (title, slug, content, thumbnail, show_thumbnail_in_content, seo_title, seo_description, seo_keywords, canonical_url, og_title, og_description, og_image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, slug, content, thumbnail, showThumbnailInContent ? 1 : 0, seoTitle || null, seoDescription || null, seoKeywords || null, canonicalUrl || null, ogTitle || null, ogDescription || null, ogImage || null, status]
      );
      res.json({ success: true, data: { id: result.insertId } });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Đường dẫn (slug) đã tồn tại' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Update post
  update: async (req, res) => {
    let { title, slug, content, thumbnail, status, showThumbnailInContent, seoTitle, seoDescription, seoKeywords, canonicalUrl, ogTitle, ogDescription, ogImage } = req.body;
    try {
      seoTitle = seoTitle || title;
      ogTitle = ogTitle || seoTitle;
      ogDescription = ogDescription || seoDescription;
      ogImage = ogImage || thumbnail;
      const baseUrl = process.env.FRONTEND_ORIGIN || 'https://vextro.vn';
      canonicalUrl = canonicalUrl || `${baseUrl}/blog/${slug}`;

      await pool.query(
        'UPDATE posts SET title = ?, slug = ?, content = ?, thumbnail = ?, show_thumbnail_in_content = ?, seo_title = ?, seo_description = ?, seo_keywords = ?, canonical_url = ?, og_title = ?, og_description = ?, og_image = ?, status = ? WHERE id = ?',
        [title, slug, content, thumbnail, showThumbnailInContent ? 1 : 0, seoTitle || null, seoDescription || null, seoKeywords || null, canonicalUrl || null, ogTitle || null, ogDescription || null, ogImage || null, status, req.params.id]
      );
      res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Đường dẫn (slug) đã tồn tại' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Delete post
  delete: async (req, res) => {
    try {
      await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
      res.json({ success: true, message: 'Xóa thành công' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = postsController;
