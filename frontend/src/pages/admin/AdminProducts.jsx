import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Tag,
  Package,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const AdminProducts = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories'
  const [loading, setLoading] = useState(true);

  // Products State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    description: '',
    suitable_for: '',
    price: 150,
    unit: 'kg',
    stock_quantity: 50,
    is_active: true
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Categories State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true });
  const [savingCategory, setSavingCategory] = useState(false);

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/admin/products'),
        api.get('/categories')
      ]);

      if (prodRes.data?.data) {
        setProducts(prodRes.data.data);
      }
      if (catRes.data?.data) {
        setCategories(catRes.data.data);
        if (catRes.data.data.length > 0 && !productForm.category_id) {
          setProductForm((prev) => ({ ...prev, category_id: String(catRes.data.data[0].id) }));
        }
      }
    } catch (err) {
      showToast('Could not load products or categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Product Actions
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      description: '',
      suitable_for: 'Garden Plants & Crops',
      price: 150,
      unit: 'kg',
      stock_quantity: 50,
      is_active: true
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      category_id: String(p.category_id),
      description: p.description || '',
      suitable_for: p.suitable_for || '',
      price: p.price,
      unit: p.unit || 'kg',
      stock_quantity: p.stock_quantity,
      is_active: Boolean(p.is_active)
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.category_id || productForm.price === '') {
      showToast('Name, category, and price are required.', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, {
          ...productForm,
          price: Number(productForm.price),
          stock_quantity: Number(productForm.stock_quantity),
          category_id: Number(productForm.category_id)
        });
        showToast('Product updated successfully.', 'success');
      } else {
        await api.post('/admin/products', {
          ...productForm,
          price: Number(productForm.price),
          stock_quantity: Number(productForm.stock_quantity),
          category_id: Number(productForm.category_id)
        });
        showToast('New product created successfully!', 'success');
      }
      setProductModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductActive = async (p) => {
    try {
      if (p.is_active) {
        // Soft delete (sets is_active false)
        await api.delete(`/admin/products/${p.id}`);
        showToast(`Product "${p.name}" hidden from store.`, 'success');
      } else {
        // Re-activate via PUT
        await api.put(`/admin/products/${p.id}`, { is_active: true });
        showToast(`Product "${p.name}" restored to store.`, 'success');
      }
      fetchData();
    } catch (err) {
      showToast('Failed to toggle product status', 'error');
    }
  };

  // 2. Category Actions
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', is_active: true });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, description: c.description || '', is_active: Boolean(c.is_active) });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.id}`, categoryForm);
        showToast('Category updated.', 'success');
      } else {
        await api.post('/admin/categories', categoryForm);
        showToast('New category created!', 'success');
      }
      setCategoryModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleToggleCategoryActive = async (c) => {
    try {
      if (c.is_active) {
        await api.delete(`/admin/categories/${c.id}`);
        showToast(`Category "${c.name}" deactivated.`, 'success');
      } else {
        await api.put(`/admin/categories/${c.id}`, { is_active: true });
        showToast(`Category "${c.name}" activated.`, 'success');
      }
      fetchData();
    } catch (err) {
      showToast('Failed to toggle category status', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 340 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
          Marketplace Catalog & Inventory
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Manage compost products, stock levels, categories, and marketplace visibility.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'products' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'products' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          All Products ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '3px solid var(--primary)' : '3px solid transparent',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: activeTab === 'categories' ? 'var(--primary)' : 'var(--muted)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          Product Categories ({categories.length})
        </button>
      </div>

      {/* TAB 1: PRODUCTS TABLE */}
      {activeTab === 'products' && (
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              Bio-Fertilizer & Compost Catalog
            </h3>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenAddProduct}
              icon={<Plus size={14} />}
            >
              Add Product
            </Button>
          </div>

          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Suitable For</th>
                  <th>Price</th>
                  <th>Current Stock</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: 'var(--primary-soft)',
                          color: 'var(--primary)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {p.category_name || 'Compost'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {p.suitable_for || 'All plants'}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                        ₹{Number(p.price).toFixed(2)}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}> / {p.unit || 'kg'}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: p.stock_quantity <= 0 ? 'var(--danger)' : p.stock_quantity < 20 ? '#b45309' : 'var(--text)'
                        }}
                      >
                        {p.stock_quantity} {p.unit || 'kg'}
                      </span>
                    </td>
                    <td>
                      <Badge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEditProduct(p)}
                          title="Edit Details"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant={p.is_active ? 'secondary' : 'primary'}
                          onClick={() => handleToggleProductActive(p)}
                          title={p.is_active ? 'Hide from Store' : 'Show in Store'}
                        >
                          {p.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: CATEGORIES TABLE */}
      {activeTab === 'categories' && (
        <Card style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              Marketplace Categories
            </h3>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenAddCategory}
              icon={<Plus size={14} />}
            >
              Add Category
            </Button>
          </div>

          <div className="table-responsive">
            <table className="sgms-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                      {c.description || '—'}
                    </td>
                    <td>
                      <Badge status={c.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenEditCategory(c)}
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant={c.is_active ? 'danger' : 'secondary'}
                          onClick={() => handleToggleCategoryActive(c)}
                        >
                          {c.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Marketplace Product'}
        maxWidth="600px"
      >
        <form onSubmit={handleSaveProduct}>
          <FormField
            label="Product Title"
            name="prod_name"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            placeholder="e.g. Enriched Bio-Potting Mix"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Product Category"
              name="prod_category"
              type="select"
              value={productForm.category_id}
              onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              required
            />

            <FormField
              label="Suitable For (Usage Tag)"
              name="prod_suitable"
              value={productForm.suitable_for}
              onChange={(e) => setProductForm({ ...productForm, suitable_for: e.target.value })}
              placeholder="e.g. Flowers, Vegetables, Soil"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <FormField
              label="Price (₹)"
              name="prod_price"
              type="number"
              min="0"
              step="0.01"
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
              required
            />

            <FormField
              label="Unit (e.g. kg, bag)"
              name="prod_unit"
              value={productForm.unit}
              onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
              required
            />

            <FormField
              label="Stock Quantity"
              name="prod_stock"
              type="number"
              min="0"
              value={productForm.stock_quantity}
              onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
              required
            />
          </div>

          <FormField
            label="Product Description"
            name="prod_desc"
            type="textarea"
            rows={3}
            value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            placeholder="Detailed description of compost nutrients and application instructions."
          />

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={productForm.is_active}
                onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
              />
              <span>Visible in Public and Citizen Marketplace</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setProductModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingProduct}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        maxWidth="460px"
      >
        <form onSubmit={handleSaveCategory}>
          <FormField
            label="Category Name"
            name="cat_name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            placeholder="e.g. Plant Fertilizer"
            required
          />

          <FormField
            label="Category Description"
            name="cat_desc"
            type="textarea"
            rows={2}
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            placeholder="Brief scope of products in this category."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingCategory}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProducts;
