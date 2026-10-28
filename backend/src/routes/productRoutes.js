const express = require('express');
const productController = require('../controllers/productController');
const { protect, requireRole } = require('../middleware/auth');

// Public Category Router (/api/categories)
const categoryRouter = express.Router();
categoryRouter.get('/', productController.getCategories);

// Public Product Router (/api/products)
const productRouter = express.Router();
productRouter.get('/', productController.getProducts);
productRouter.get('/suggest', productController.suggestProducts);
productRouter.get('/:id', productController.getProductById);

// Admin Category Router (/api/admin/categories)
const adminCategoryRouter = express.Router();
adminCategoryRouter.use(protect, requireRole('admin'));
adminCategoryRouter.post('/', productController.createCategory);
adminCategoryRouter.put('/:id', productController.updateCategory);
adminCategoryRouter.delete('/:id', productController.deleteCategory);

// Admin Product Router (/api/admin/products)
const adminProductRouter = express.Router();
adminProductRouter.use(protect, requireRole('admin'));
adminProductRouter.get('/', productController.getAdminProducts);
adminProductRouter.post('/', productController.createProduct);
adminProductRouter.put('/:id', productController.updateProduct);
adminProductRouter.delete('/:id', productController.deleteProduct);

module.exports = {
  categoryRouter,
  productRouter,
  adminCategoryRouter,
  adminProductRouter
};
