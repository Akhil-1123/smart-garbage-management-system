import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Filter,
  Sparkles,
  Plus,
  Minus,
  Check,
  CreditCard,
  Truck,
  Leaf,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import CartDrawer from '../../components/CartDrawer';
import Spinner from '../../components/Spinner';
import EmptyState from '../../components/EmptyState';

const MarketplacePage = ({ isPublic = false }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart, setIsDrawerOpen, items, totalAmount, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Filter States
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [suggestUse, setSuggestUse] = useState('');

  // Products
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Per-card local quantity stepper states
  const [quantities, setQuantities] = useState({});

  // Checkout modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processingOrder, setProcessingOrder] = useState(false);

  // Sync profile address when user loads
  useEffect(() => {
    if (user?.address) {
      setShippingAddress(user.address);
    }
  }, [user]);

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data?.data) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products whenever filters or suggest changes
  const fetchProducts = async () => {
    setLoading(true);
    try {
      if (suggestUse) {
        // Suggest endpoint
        const res = await api.get(`/products/suggest?use=${encodeURIComponent(suggestUse)}`);
        if (res.data?.data) {
          setProducts(res.data.data);
        }
      } else {
        // Standard products endpoint with query params
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category_id', selectedCategory);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (minPrice) params.append('min_price', minPrice);
        if (maxPrice) params.append('max_price', maxPrice);

        const res = await api.get(`/products?${params.toString()}`);
        if (res.data?.data) {
          setProducts(res.data.data);
        }
      }
    } catch (err) {
      showToast('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, suggestUse]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSuggestUse(''); // reset suggestion if searching
    fetchProducts();
  };

  const handleSuggestChange = (e) => {
    const use = e.target.value;
    setSuggestUse(use);
    if (use) {
      setSelectedCategory('all');
      setSearchQuery('');
    }
  };

  // Card quantity change
  const handleQuantityChange = (productId, delta, maxStock) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  // Add to cart click
  const handleAddToCart = (product) => {
    if (isPublic || !isAuthenticated) {
      showToast('Please sign in to add items to your cart.', 'info');
      navigate('/login');
      return;
    }

    const qty = quantities[product.id] || 1;
    addToCart(product, qty);
    showToast(`Added ${qty} ${product.unit || 'unit'} of ${product.name} to cart.`, 'success');
  };

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShippingAddress(user?.address || '');
    setCheckoutModalOpen(true);
  };

  // Place order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      showToast('Shipping address is required.', 'error');
      return;
    }

    setProcessingOrder(true);
    // Simulate short mock payment processing
    setTimeout(async () => {
      try {
        const orderPayload = {
          items: items.map((i) => ({
            product_id: i.id,
            quantity: i.quantity
          })),
          shipping_address: shippingAddress.trim(),
          payment_method: paymentMethod
        };

        const res = await api.post('/orders', orderPayload);
        const createdOrder = res.data?.data?.order;

        showToast(`Order #${createdOrder?.id || ''} placed successfully!`, 'success');
        clearCart();
        setCheckoutModalOpen(false);
        navigate('/app/orders');
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to place order', 'error');
      } finally {
        setProcessingOrder(false);
      }
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header / Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>
            Organic Compost & Fertilizer Marketplace
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            High-grade bio-fertilizers enriched directly from municipal compost batches.
          </p>
        </div>

        {isAuthenticated && (
          <Button
            variant="secondary"
            onClick={() => setIsDrawerOpen(true)}
            icon={<ShoppingBag size={18} />}
          >
            View Cart ({items.reduce((sum, i) => sum + i.quantity, 0)})
          </Button>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Row 1: Search + Suggest Select + Price Filter */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end'
          }}
        >
          {/* Search Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="searchQuery">
              Search Products
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="searchQuery"
                type="text"
                className="form-input"
                placeholder="Search fertilizer or compost..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* "Suggest for me" Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="suggestUse">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} color="var(--primary)" />
                Suggest For Me
              </span>
            </label>
            <select
              id="suggestUse"
              className="form-select"
              value={suggestUse}
              onChange={handleSuggestChange}
            >
              <option value="">Choose your crop / usage...</option>
              <option value="plants">Plants (Household & Ornamental)</option>
              <option value="vegetables">Vegetables (Kitchen Gardens)</option>
              <option value="flowers">Flowers & Roses</option>
              <option value="soil">Soil Conditioner & Preparation</option>
              <option value="crops">Agricultural Crops (Tapioca, etc.)</option>
            </select>
          </div>

          {/* Min & Max Price */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label" htmlFor="minPrice">
                Min ₹
              </label>
              <input
                id="minPrice"
                type="number"
                className="form-input"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label" htmlFor="maxPrice">
                Max ₹
              </label>
              <input
                id="maxPrice"
                type="number"
                className="form-input"
                placeholder="1000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" icon={<Filter size={14} />}>
              Filter
            </Button>
          </div>
        </form>

        {/* Row 2: Category Chips */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingTop: '0.25rem',
            borderTop: '1px solid #f0f4f2',
            paddingBottom: '0.25rem'
          }}
        >
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSuggestUse('');
            }}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: selectedCategory === 'all' && !suggestUse ? 'var(--primary)' : '#ffffff',
              color: selectedCategory === 'all' && !suggestUse ? '#ffffff' : 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'var(--transition)'
            }}
          >
            All Categories
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(String(c.id));
                setSuggestUse('');
              }}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 20,
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid var(--border)',
                background: selectedCategory === String(c.id) ? 'var(--primary)' : '#ffffff',
                color: selectedCategory === String(c.id) ? '#ffffff' : 'var(--muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'var(--transition)'
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Product Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <EmptyState
            icon={<Leaf size={48} strokeWidth={1.5} color="var(--primary)" />}
            title="No Products Match Filters"
            message="Try resetting your search query, price range, or category filter to browse available bio-fertilizers."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setMinPrice('');
                  setMaxPrice('');
                  setSuggestUse('');
                  fetchProducts();
                }}
              >
                Reset Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {products.map((p) => {
            const stock = Number(p.stock_quantity) || 0;
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock < 20;
            const cardQty = quantities[p.id] || 1;

            return (
              <Card
                key={p.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0,
                  border: '1px solid var(--border)'
                }}
              >
                {/* Product Image / Illustration Banner */}
                <div
                  style={{
                    height: 140,
                    background: 'linear-gradient(135deg, #e4f2ea 0%, #cce7d7 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    position: 'relative'
                  }}
                >
                  <Leaf size={52} strokeWidth={1.5} />

                  {/* Stock Badge Top Right */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 12,
                      background: isOutOfStock
                        ? 'var(--danger-soft)'
                        : isLowStock
                        ? 'var(--warning-soft)'
                        : 'var(--primary-soft)',
                      color: isOutOfStock
                        ? 'var(--danger)'
                        : isLowStock
                        ? '#b45309'
                        : 'var(--primary)'
                    }}
                  >
                    {isOutOfStock ? 'Out of stock' : isLowStock ? `Low stock (${stock} left)` : 'In stock'}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.25rem'
                    }}
                  >
                    {p.category_name || 'Compost'}
                  </div>

                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: 'var(--text)',
                      marginBottom: '0.35rem',
                      lineHeight: 1.3
                    }}
                  >
                    {p.name}
                  </h3>

                  {p.suitable_for && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--muted)',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Sparkles size={12} color="var(--primary)" />
                      <span>Suitable for: <strong>{p.suitable_for}</strong></span>
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--muted)',
                      flex: 1,
                      lineHeight: 1.5,
                      marginBottom: '1.25rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {p.description || '100% natural, nutrient-dense organic fertilizer.'}
                  </p>

                  {/* Price & Quantity & Add to Cart Controls */}
                  <div
                    style={{
                      borderTop: '1px solid #f0f4f2',
                      paddingTop: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{Number(p.price).toFixed(2)}
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>
                          {' '}/ {p.unit || 'kg'}
                        </span>
                      </span>

                      {/* Quantity Stepper */}
                      {!isOutOfStock && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, -1, stock)}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                            {cardQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(p.id, 1, stock)}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              background: 'var(--input-bg)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <Button
                      variant={isOutOfStock ? 'secondary' : 'primary'}
                      block
                      disabled={isOutOfStock}
                      onClick={() => handleAddToCart(p)}
                      icon={<ShoppingBag size={15} />}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer onCheckout={handleOpenCheckout} />

      {/* Checkout Modal */}
      <Modal
        isOpen={checkoutModalOpen}
        onClose={() => !processingOrder && setCheckoutModalOpen(false)}
        title="Complete Compost Purchase"
        maxWidth="500px"
      >
        <form onSubmit={handlePlaceOrder}>
          <div
            style={{
              background: 'var(--primary-soft)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>Total Items</span>
              <strong style={{ color: 'var(--text)' }}>
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 700 }}>Total Payable</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <FormField
            label="Delivery Shipping Address"
            name="shippingAddress"
            type="textarea"
            rows={2}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Door number, street, locality for bio-fertilizer delivery"
            required
          />

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Select Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: paymentMethod === 'upi' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'upi' ? '#f4fbf6' : 'var(--input-bg)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="marketplacePay"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>UPI</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: paymentMethod === 'card' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'card' ? '#f4fbf6' : 'var(--input-bg)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="marketplacePay"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Card</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: paymentMethod === 'wallet' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'wallet' ? '#f4fbf6' : 'var(--input-bg)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="marketplacePay"
                  value="wallet"
                  checked={paymentMethod === 'wallet'}
                  onChange={() => setPaymentMethod('wallet')}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Wallet</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: paymentMethod === 'cod' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMethod === 'cod' ? '#f4fbf6' : 'var(--input-bg)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="marketplacePay"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Cash on Deliv.</span>
              </label>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', margin: '1rem 0' }}>
            🔒 Instant order ledger dispatch with simulated payment verification.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              disabled={processingOrder}
              onClick={() => setCheckoutModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={processingOrder}
            >
              Pay ₹{totalAmount.toFixed(2)} & Place Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketplacePage;
