import React from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import Button from './Button';

const CartDrawer = ({ onCheckout }) => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalItemCount,
    isDrawerOpen,
    setIsDrawerOpen
  } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 1100
        }}
      />

      {/* Drawer Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1101,
          display: 'flex',
          flexDirection: 'column',
          animation: 'drawerSlide 0.25s ease-out'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--primary-soft)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShoppingBag size={18} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Your Cart ({totalItemCount})
            </h3>
          </div>

          <button
            onClick={() => setIsDrawerOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '0.25rem'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--muted)' }}>
              <ShoppingBag size={48} strokeWidth={1.2} style={{ marginBottom: '1rem', color: 'var(--muted)' }} />
              <h4>Your Cart is Empty</h4>
              <p style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
                Add organic bio-fertilizers and compost to place an order.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                    ₹{item.price.toFixed(2)} / {item.unit}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem', marginTop: '0.3rem' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text)'
                    }}
                  >
                    <Minus size={13} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: 20, textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock_quantity}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      cursor: item.quantity >= item.stock_quantity ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text)',
                      opacity: item.quantity >= item.stock_quantity ? 0.5 : 1
                    }}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--danger)',
                      padding: '0.3rem',
                      marginLeft: '0.25rem'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border)',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>Subtotal</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>

            <Button
              variant="primary"
              block
              onClick={() => {
                setIsDrawerOpen(false);
                if (onCheckout) onCheckout();
              }}
              icon={<ArrowRight size={18} />}
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes drawerSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default CartDrawer;
