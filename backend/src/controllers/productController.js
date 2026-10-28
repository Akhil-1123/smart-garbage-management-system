const db = require('../config/db');
const { ok, fail } = require('../utils/response');

/**
 * GET /api/categories (public)
 * Returns all active product categories.
 */
const getCategories = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM product_categories WHERE is_active = TRUE ORDER BY name ASC'
    );
    return ok(res, rows);
  } catch (error) {
    console.error('getCategories error:', error);
    return fail(res, 500, 'Failed to fetch categories');
  }
};

/**
 * GET /api/products (public)
 * Optional filters: ?category_id=, ?search=, ?min_price=, ?max_price=, ?in_stock=true
 * Active products only, joined with category name.
 */
const getProducts = async (req, res) => {
  try {
    const { category_id, search, min_price, max_price, in_stock } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.suitable_for,
        p.price,
        p.unit,
        p.stock_quantity,
        p.image_url,
        p.is_active,
        p.created_at
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
    `;

    const params = [];

    if (category_id) {
      sql += ' AND p.category_id = ?';
      params.push(Number(category_id));
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.suitable_for LIKE ?)';
      params.push(term, term, term);
    }

    if (min_price !== undefined && min_price !== '') {
      sql += ' AND p.price >= ?';
      params.push(Number(min_price));
    }

    if (max_price !== undefined && max_price !== '') {
      sql += ' AND p.price <= ?';
      params.push(Number(max_price));
    }

    if (String(in_stock).toLowerCase() === 'true') {
      sql += ' AND p.stock_quantity > 0';
    }

    sql += ' ORDER BY p.id ASC';

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (error) {
    console.error('getProducts error:', error);
    return fail(res, 500, 'Failed to fetch products');
  }
};

/**
 * GET /api/products/:id (public)
 * Returns single product joined with category name.
 */
const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return fail(res, 400, 'Invalid product ID');
    }

    const [rows] = await db.query(
      `SELECT 
         p.id,
         p.category_id,
         c.name AS category_name,
         p.name,
         p.description,
         p.suitable_for,
         p.price,
         p.unit,
         p.stock_quantity,
         p.image_url,
         p.is_active,
         p.created_at
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'Product not found');
    }

    return ok(res, rows[0]);
  } catch (error) {
    console.error('getProductById error:', error);
    return fail(res, 500, 'Failed to fetch product');
  }
};

/**
 * GET /api/products/suggest?use=plants|vegetables|flowers|soil|crops (public)
 * Maps use to category names:
 * plants -> 'Plant Fertilizer'
 * vegetables -> 'Vegetable Fertilizer'
 * flowers -> 'Flower Fertilizer'
 * soil -> 'Soil Conditioner'
 * crops -> 'Soil Conditioner' and 'Organic Compost'
 */
const suggestProducts = async (req, res) => {
  try {
    const { use } = req.query;
    const normalizedUse = String(use || '').trim().toLowerCase();

    let targetCategories = [];
    switch (normalizedUse) {
      case 'plants':
        targetCategories = ['Plant Fertilizer'];
        break;
      case 'vegetables':
        targetCategories = ['Vegetable Fertilizer'];
        break;
      case 'flowers':
        targetCategories = ['Flower Fertilizer'];
        break;
      case 'soil':
        targetCategories = ['Soil Conditioner'];
        break;
      case 'crops':
        targetCategories = ['Soil Conditioner', 'Organic Compost'];
        break;
      default:
        targetCategories = [];
    }

    if (targetCategories.length === 0) {
      return ok(res, []);
    }

    const [rows] = await db.query(
      `SELECT 
         p.id,
         p.category_id,
         c.name AS category_name,
         p.name,
         p.description,
         p.suitable_for,
         p.price,
         p.unit,
         p.stock_quantity,
         p.image_url,
         p.is_active,
         p.created_at
       FROM products p
       JOIN product_categories c ON p.category_id = c.id
       WHERE p.is_active = TRUE AND c.name IN (?)
       ORDER BY p.id ASC`,
      [targetCategories]
    );

    return ok(res, rows);
  } catch (error) {
    console.error('suggestProducts error:', error);
    return fail(res, 500, 'Failed to suggest products');
  }
};

/* ==========================================
   ADMIN CONTROLLERS
========================================== */

/**
 * POST /api/admin/categories (admin)
 * Body: { name, description }
 */
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return fail(res, 400, 'Category name is required');
    }

    const [result] = await db.query(
      'INSERT INTO product_categories (name, description, is_active, created_at) VALUES (?, ?, TRUE, NOW())',
      [name.trim(), description ? description.trim() : null]
    );

    const [newCat] = await db.query(
      'SELECT * FROM product_categories WHERE id = ?',
      [result.insertId]
    );

    return ok(res, newCat[0], 'Category created successfully', 201);
  } catch (error) {
    console.error('createCategory error:', error);
    return fail(res, 500, 'Failed to create category');
  }
};

/**
 * PUT /api/admin/categories/:id (admin)
 * Body: { name, description, is_active }
 */
const updateCategory = async (req, res) => {
  try {
    const catId = Number(req.params.id);
    if (isNaN(catId)) {
      return fail(res, 400, 'Invalid category ID');
    }

    const { name, description, is_active } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM product_categories WHERE id = ?',
      [catId]
    );
    if (existing.length === 0) {
      return fail(res, 404, 'Category not found');
    }

    await db.query(
      `UPDATE product_categories 
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : null,
        is_active !== undefined ? Boolean(is_active) : null,
        catId
      ]
    );

    const [updated] = await db.query(
      'SELECT * FROM product_categories WHERE id = ?',
      [catId]
    );
    return ok(res, updated[0], 'Category updated successfully');
  } catch (error) {
    console.error('updateCategory error:', error);
    return fail(res, 500, 'Failed to update category');
  }
};

/**
 * DELETE /api/admin/categories/:id (admin - soft delete)
 */
const deleteCategory = async (req, res) => {
  try {
    const catId = Number(req.params.id);
    if (isNaN(catId)) {
      return fail(res, 400, 'Invalid category ID');
    }

    await db.query(
      'UPDATE product_categories SET is_active = FALSE WHERE id = ?',
      [catId]
    );

    return ok(res, null, 'Category deactivated successfully');
  } catch (error) {
    console.error('deleteCategory error:', error);
    return fail(res, 500, 'Failed to deactivate category');
  }
};

/**
 * GET /api/admin/products (admin - includes inactive)
 */
const getAdminProducts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.category_id,
        c.name AS category_name,
        p.name,
        p.description,
        p.suitable_for,
        p.price,
        p.unit,
        p.stock_quantity,
        p.image_url,
        p.is_active,
        p.created_at
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      ORDER BY p.id ASC
    `);
    return ok(res, rows);
  } catch (error) {
    console.error('getAdminProducts error:', error);
    return fail(res, 500, 'Failed to fetch admin products');
  }
};

/**
 * POST /api/admin/products (admin)
 * Body: { category_id, name, description, suitable_for, price, unit, stock_quantity, is_active, image_url }
 */
const createProduct = async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      suitable_for,
      price,
      unit,
      stock_quantity,
      is_active,
      image_url
    } = req.body;

    if (!category_id || !name || price === undefined) {
      return fail(res, 400, 'category_id, name, and price are required');
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return fail(res, 400, 'price must be a positive number');
    }

    const [result] = await db.query(
      `INSERT INTO products (
         category_id, name, description, suitable_for,
         price, unit, stock_quantity, image_url, is_active, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        category_id,
        name.trim(),
        description || null,
        suitable_for || null,
        numPrice,
        unit || 'kg',
        stock_quantity !== undefined ? Number(stock_quantity) : 0,
        image_url || '',
        is_active !== undefined ? Boolean(is_active) : true
      ]
    );

    const [newProduct] = await db.query(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       JOIN product_categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [result.insertId]
    );

    return ok(res, newProduct[0], 'Product created successfully', 201);
  } catch (error) {
    console.error('createProduct error:', error);
    return fail(res, 500, 'Failed to create product');
  }
};

/**
 * PUT /api/admin/products/:id (admin)
 */
const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return fail(res, 400, 'Invalid product ID');
    }

    const {
      category_id,
      name,
      description,
      suitable_for,
      price,
      unit,
      stock_quantity,
      is_active,
      image_url
    } = req.body;

    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return fail(res, 404, 'Product not found');
    }

    await db.query(
      `UPDATE products 
       SET category_id = COALESCE(?, category_id),
           name = COALESCE(?, name),
           description = COALESCE(?, description),
           suitable_for = COALESCE(?, suitable_for),
           price = COALESCE(?, price),
           unit = COALESCE(?, unit),
           stock_quantity = COALESCE(?, stock_quantity),
           image_url = COALESCE(?, image_url),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        category_id !== undefined ? Number(category_id) : null,
        name ? name.trim() : null,
        description !== undefined ? description : null,
        suitable_for !== undefined ? suitable_for : null,
        price !== undefined ? Number(price) : null,
        unit !== undefined ? unit : null,
        stock_quantity !== undefined ? Number(stock_quantity) : null,
        image_url !== undefined ? image_url : null,
        is_active !== undefined ? Boolean(is_active) : null,
        productId
      ]
    );

    const [updated] = await db.query(
      `SELECT p.*, c.name AS category_name 
       FROM products p 
       JOIN product_categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [productId]
    );

    return ok(res, updated[0], 'Product updated successfully');
  } catch (error) {
    console.error('updateProduct error:', error);
    return fail(res, 500, 'Failed to update product');
  }
};

/**
 * DELETE /api/admin/products/:id (admin - soft delete)
 */
const deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return fail(res, 400, 'Invalid product ID');
    }

    await db.query('UPDATE products SET is_active = FALSE WHERE id = ?', [productId]);
    return ok(res, null, 'Product deactivated successfully');
  } catch (error) {
    console.error('deleteProduct error:', error);
    return fail(res, 500, 'Failed to deactivate product');
  }
};

module.exports = {
  getCategories,
  getProducts,
  getProductById,
  suggestProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
