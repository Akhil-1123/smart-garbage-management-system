DROP DATABASE IF EXISTS sgms_db;
CREATE DATABASE sgms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgms_db;

-- 1. roles
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. drivers
CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  license_no VARCHAR(50) NOT NULL,
  vehicle_no VARCHAR(50) NOT NULL,
  base_latitude DECIMAL(10,7),
  base_longitude DECIMAL(10,7),
  service_area VARCHAR(100),
  is_available BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. bins
CREATE TABLE bins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  bin_type ENUM('organic','recyclable','general') DEFAULT 'organic',
  capacity_kg DECIMAL(6,2) DEFAULT 20.00,
  current_level DECIMAL(6,2) DEFAULT 0.00,
  fill_status ENUM('empty','half','full') DEFAULT 'empty',
  status ENUM('active','inactive') DEFAULT 'active',
  installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. user_bins
CREATE TABLE user_bins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bin_id INT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_user_bins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_bins_bin FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. bin_status_history
CREATE TABLE bin_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bin_id INT NOT NULL,
  level DECIMAL(6,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bin_status_history_bin FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. subscription_plans
CREATE TABLE subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  plan_type ENUM('monthly','yearly') NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  duration_days INT NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. subscriptions
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active','expired','cancelled') DEFAULT 'active',
  amount DECIMAL(8,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. collection_requests
CREATE TABLE collection_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bin_id INT NULL,
  driver_id INT NULL,
  waste_type ENUM('organic','recyclable','general') DEFAULT 'organic',
  status ENUM('pending','approved','driver_assigned','collected','cancelled') DEFAULT 'pending',
  address VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  assigned_at DATETIME NULL,
  collected_at DATETIME NULL,
  remarks VARCHAR(255),
  CONSTRAINT fk_collection_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_collection_requests_bin FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_collection_requests_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. driver_assignments
CREATE TABLE driver_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collection_id INT NOT NULL,
  driver_id INT NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unassigned_at DATETIME NULL,
  status ENUM('assigned','completed','cancelled') DEFAULT 'assigned',
  CONSTRAINT fk_driver_assignments_collection FOREIGN KEY (collection_id) REFERENCES collection_requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_driver_assignments_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. waste_records
CREATE TABLE waste_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collection_id INT NULL,
  bin_id INT NULL,
  driver_id INT NOT NULL,
  waste_type ENUM('organic','recyclable','general') NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  processing_status ENUM('collected','in_composting','composted') DEFAULT 'collected',
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255),
  CONSTRAINT fk_waste_records_collection FOREIGN KEY (collection_id) REFERENCES collection_requests(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_waste_records_bin FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_waste_records_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. composting_units
CREATE TABLE composting_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. compost_batches
CREATE TABLE compost_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  batch_code VARCHAR(50) NOT NULL UNIQUE,
  product_id INT NULL,
  input_weight_kg DECIMAL(8,2) NOT NULL,
  output_weight_kg DECIMAL(8,2) NULL,
  status ENUM('processing','completed') DEFAULT 'processing',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_compost_batches_unit FOREIGN KEY (unit_id) REFERENCES composting_units(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. compost_batch_waste
CREATE TABLE compost_batch_waste (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  waste_record_id INT NOT NULL UNIQUE,
  CONSTRAINT fk_compost_batch_waste_batch FOREIGN KEY (batch_id) REFERENCES compost_batches(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_compost_batch_waste_waste FOREIGN KEY (waste_record_id) REFERENCES waste_records(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. product_categories
CREATE TABLE product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. products
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  suitable_for VARCHAR(150),
  price DECIMAL(8,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  stock_quantity INT DEFAULT 0,
  image_url VARCHAR(255) DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK for compost_batches.product_id after products table is created
ALTER TABLE compost_batches
  ADD CONSTRAINT fk_compost_batches_product
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 17. orders
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending','paid','shipped','delivered','cancelled') DEFAULT 'pending',
  total_amount DECIMAL(8,2) NOT NULL,
  shipping_address VARCHAR(255) NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. order_items
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. payments
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NULL,
  subscription_id INT NULL,
  amount DECIMAL(8,2) NOT NULL,
  payment_method ENUM('card','upi','cod','wallet') NOT NULL,
  transaction_id VARCHAR(100) NOT NULL,
  status ENUM('pending','success','failed') DEFAULT 'pending',
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. feedback_complaints
CREATE TABLE feedback_complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  collection_id INT NULL,
  driver_id INT NULL,
  type ENUM('feedback','complaint') NOT NULL,
  message VARCHAR(500) NOT NULL,
  rating INT NULL,
  status ENUM('open','in_progress','resolved') DEFAULT 'open',
  admin_response VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_feedback_complaints_collection FOREIGN KEY (collection_id) REFERENCES collection_requests(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_feedback_complaints_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('collection','order','system') NOT NULL,
  message VARCHAR(255) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. reports
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_type ENUM('monthly_collection','waste','revenue') NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_by INT NOT NULL,
  file_url VARCHAR(255) NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_user FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
