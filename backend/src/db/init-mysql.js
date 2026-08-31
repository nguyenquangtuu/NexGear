const pool = require('../config/mysql');

/**
 * Initialize MySQL Database Schema
 * This script handles table creation for all system modules.
 */
async function initMysqlSchema() {
  console.log('Initializing MySQL Database schema...');

  // 1. Core System & Configuration
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_name VARCHAR(120) NOT NULL DEFAULT 'NexGear',
      site_title VARCHAR(255) NOT NULL DEFAULT 'NexGear - Hệ thống bán lẻ Laptop & Thiết bị công nghệ',
      site_description TEXT,
      site_keywords TEXT,
      og_title VARCHAR(255),
      og_description TEXT,
      og_image_url VARCHAR(500),
      contact_email VARCHAR(120),
      contact_phone VARCHAR(20),
      facebook_url VARCHAR(255),
      zalo_url VARCHAR(255),
      telegram_url VARCHAR(255),
      footer_html TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS banks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bank_name VARCHAR(120) NOT NULL,
      bank_short_name VARCHAR(50) NOT NULL,
      account_number VARCHAR(50) NOT NULL,
      account_holder VARCHAR(120) NOT NULL,
      qr_template_url VARCHAR(500),
      is_active TINYINT(1) DEFAULT 1,
      is_default TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. User Management
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role ENUM('USER', 'ADMIN') DEFAULT 'USER',
      balance DECIMAL(15,2) DEFAULT 0,
      is_blocked TINYINT(1) DEFAULT 0,
      last_login DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. Product Catalog
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NULL,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      icon VARCHAR(50) NULL,
      thumbnail VARCHAR(255) NULL,
      description TEXT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      tagline VARCHAR(255),
      description TEXT,
      category VARCHAR(100),
      category_id INT NULL,
      thumbnail VARCHAR(255),
      images JSON NULL,
      rating DECIMAL(3,1) DEFAULT 5.0,
      users_count VARCHAR(50),
      info_html TEXT,
      badge VARCHAR(50) NULL,
      features JSON NULL,
      internal_note TEXT NULL,
      seo_title VARCHAR(255) NULL,
      seo_description VARCHAR(500) NULL,
      seo_keywords VARCHAR(500) NULL,
      canonical_url VARCHAR(500) NULL,
      og_title VARCHAR(255) NULL,
      og_description VARCHAR(500) NULL,
      og_image VARCHAR(500) NULL,
      schema_brand VARCHAR(120) NULL,
      schema_sku VARCHAR(120) NULL,
      schema_gtin VARCHAR(120) NULL,
      schema_mpn VARCHAR(120) NULL,
      is_active TINYINT(1) DEFAULT 1,
      review_count INT DEFAULT 0,
      sold_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      stock_count INT DEFAULT 0,
      max_per_order INT NULL,
      delivery_type ENUM('AUTO', 'MANUAL', 'API') DEFAULT 'AUTO',
      status ENUM('ACTIVE', 'OUT_OF_STOCK', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
      has_expiry TINYINT(1) NOT NULL DEFAULT 0,
      expiry_days INT NOT NULL DEFAULT 0,
      allow_renewal TINYINT(1) NOT NULL DEFAULT 0,
      has_warranty TINYINT(1) NOT NULL DEFAULT 0,
      warranty_days INT NOT NULL DEFAULT 0,
      required_inputs JSON NULL,
      guide_link VARCHAR(500) NULL,
      api_config_ref VARCHAR(24) NULL,
      api_config JSON NULL,
      price_check_enabled TINYINT(1) NOT NULL DEFAULT 0,
      price_check_notify_admin TINYINT(1) NOT NULL DEFAULT 1,
      price_check_auto_update TINYINT(1) NOT NULL DEFAULT 0,
      price_check_markup_type ENUM('KEEP_MARGIN', 'AMOUNT', 'PERCENT') NOT NULL DEFAULT 'KEEP_MARGIN',
      price_check_markup_value DECIMAL(15,2) NOT NULL DEFAULT 0,
      price_check_config JSON NULL,
      price_check_last_cost DECIMAL(15,2) NULL,
      price_check_last_checked_at DATETIME NULL,
      price_check_last_changed_at DATETIME NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS warehouse_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      variant_id INT NOT NULL,
      item_data TEXT NOT NULL,
      status ENUM('AVAILABLE', 'SOLD', 'RESERVED') DEFAULT 'AVAILABLE',
      sold_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      INDEX idx_warehouse_status (status),
      INDEX idx_warehouse_variant_status (variant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. Marketing & Content
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slot_key VARCHAR(50) NOT NULL UNIQUE,
      slot_name VARCHAR(120) NOT NULL,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255) NULL,
      badge_text VARCHAR(120) NULL,
      slides_json JSON NULL,
      image_url VARCHAR(500) NOT NULL,
      image_url_mobile VARCHAR(500) NULL,
      target_url VARCHAR(500) NULL,
      alt_text VARCHAR(255) NULL,
      overlay_preset ENUM('dark-left', 'dark-soft', 'accent-red', 'accent-blue', 'none') NOT NULL DEFAULT 'dark-left',
      text_align ENUM('left', 'center') NOT NULL DEFAULT 'left',
      text_color ENUM('light', 'dark') NOT NULL DEFAULT 'light',
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discount_codes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      type ENUM('PERCENT', 'FIXED') NOT NULL DEFAULT 'PERCENT',
      value DECIMAL(15,2) NOT NULL,
      min_order_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      max_discount_amount DECIMAL(15,2) NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      usage_limit INT NULL,
      usage_count INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      content LONGTEXT NOT NULL,
      thumbnail VARCHAR(255) NULL,
      show_thumbnail_in_content TINYINT(1) NOT NULL DEFAULT 0,
      seo_title VARCHAR(255) NULL,
      seo_description VARCHAR(500) NULL,
      seo_keywords VARCHAR(500) NULL,
      canonical_url VARCHAR(500) NULL,
      og_title VARCHAR(255) NULL,
      og_description VARCHAR(500) NULL,
      og_image VARCHAR(500) NULL,
      status ENUM('PUBLIC', 'LINK_ONLY', 'HIDDEN') NOT NULL DEFAULT 'PUBLIC',
      view_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_posts_slug (slug),
      INDEX idx_posts_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. Orders & Transactions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_code VARCHAR(40) NOT NULL UNIQUE,
      user_id BIGINT NOT NULL,
      status ENUM('PENDING_PAYMENT', 'PROCESSING', 'SHIPPING', 'DELIVERING', 'COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PROCESSING',
      subtotal_amount DECIMAL(15,2) NOT NULL,
      discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(15,2) NOT NULL,
      balance_applied DECIMAL(15,2) NOT NULL DEFAULT 0,
      payment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
      payment_provider VARCHAR(20) NULL,
      sepay_payment_code VARCHAR(40) NULL,
      sepay_checkout_url TEXT NULL,
      sepay_transaction_id VARCHAR(64) NULL,
      sepay_reference_code VARCHAR(255) NULL,
      sepay_status VARCHAR(30) NULL,
      sepay_paid_at DATETIME NULL,
      payment_meta JSON NULL,
      completed_at DATETIME NULL,
      processed_at DATETIME NULL,
      refunded_at DATETIME NULL,
      delivery_method ENUM('DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY',
      pickup_store VARCHAR(200) NULL,
      shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
      shipping_recipient_name VARCHAR(200) NULL,
      shipping_phone VARCHAR(50) NULL,
      shipping_address TEXT NULL,
      shipping_note TEXT NULL,
      discount_id BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (discount_id) REFERENCES discount_codes(id) ON DELETE SET NULL,
      UNIQUE KEY uq_orders_sepay_payment_code (sepay_payment_code),
      INDEX idx_orders_user (user_id),
      INDEX idx_orders_status (status),
      INDEX idx_orders_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id INT NOT NULL,
      variant_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      variant_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(15,2) NOT NULL,
      unit_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_price DECIMAL(15,2) NOT NULL,
      total_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
      required_inputs JSON NULL,
      warranty_started_at DATETIME NULL,
      warranty_expires_at DATETIME NULL,
      service_id BIGINT NULL,
      service_action ENUM('NEW', 'RENEWAL') NULL,
      service_has_expiry TINYINT(1) NOT NULL DEFAULT 0,
      service_duration_days INT NOT NULL DEFAULT 0,
      service_allow_renewal TINYINT(1) NOT NULL DEFAULT 0,
      service_started_at DATETIME NULL,
      service_expires_at DATETIME NULL,
      service_status ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED') NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT,
      INDEX idx_order_items_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      transaction_code VARCHAR(40) NOT NULL UNIQUE,
      user_id BIGINT NOT NULL,
      type ENUM('DEPOSIT', 'PURCHASE', 'REFUND', 'ADJUSTMENT') NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      balance_before DECIMAL(15,2) NOT NULL,
      balance_after DECIMAL(15,2) NOT NULL,
      description TEXT,
      status ENUM('pending', 'success', 'failed') DEFAULT 'success',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_transactions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. Services & Post-Purchase
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_services (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      product_id INT NOT NULL,
      variant_id INT NOT NULL,
      original_order_id BIGINT NOT NULL,
      original_order_item_id BIGINT NOT NULL,
      latest_order_id BIGINT NOT NULL,
      latest_order_item_id BIGINT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      variant_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      has_expiry TINYINT(1) NOT NULL DEFAULT 1,
      duration_days INT NOT NULL DEFAULT 0,
      allow_renewal TINYINT(1) NOT NULL DEFAULT 0,
      started_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      status ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
      renewal_reminder_sent_at DATETIME NULL,
      expired_notice_sent_at DATETIME NULL,
      last_renewed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_services_user (user_id),
      INDEX idx_user_services_status (status),
      INDEX idx_user_services_expires_at (expires_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      FOREIGN KEY (original_order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (latest_order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id INT NOT NULL,
      user_id BIGINT NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      is_visible TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_order_product_review (order_id, product_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_review_product (product_id),
      INDEX idx_review_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 7. Communication & AI
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      last_message TEXT NULL,
      last_message_at TIMESTAMP NULL,
      unread_count_admin INT DEFAULT 0,
      unread_count_user INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_user_conversation (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT NOT NULL,
      sender_id BIGINT NULL,
      sender_role ENUM('USER', 'ADMIN', 'AI') NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_chat_conversation (conversation_id),
      INDEX idx_chat_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_ai_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      auto_reply_enabled TINYINT(1) DEFAULT 1,
      system_prompt TEXT NULL,
      training_instructions MEDIUMTEXT NULL,
      updated_by_id BIGINT NULL,
      updated_by_name VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Migration: Ensure chat_messages.sender_id is nullable for AI messages
  try {
    await pool.query('ALTER TABLE chat_messages MODIFY COLUMN sender_id BIGINT NULL');
    // Also update foreign key if it was created as NOT NULL
    try {
      await pool.query('ALTER TABLE chat_messages DROP FOREIGN KEY chat_messages_ibfk_2');
      await pool.query('ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_ibfk_2 FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL');
    } catch (fkErr) {
      // FK might have a different name or already be correct
    }
  } catch (err) {
    // Column might already be nullable or table doesn't exist yet
  }

  console.log('Database schema initialized successfully.');
}

module.exports = {
  initMysqlSchema,
};
