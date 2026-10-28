import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  ArrowRight,
  Sparkles,
  CreditCard,
  Truck,
  Recycle,
  ShoppingBag,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Stepper from '../../components/Stepper';

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Redirect logged-in users to their respective home dashboard
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'driver') {
        navigate('/driver', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/products');
        if (res.data && res.data.data) {
          // Take first 4 active products
          setProducts(res.data.data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load featured products', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const steps = [
    {
      title: 'Subscribe',
      subtitle: 'Choose Monthly or Yearly waste collection plan'
    },
    {
      title: 'Request Collection',
      subtitle: 'Mark bin status as Half or Full and submit pickup request'
    },
    {
      title: 'Driver Collects',
      subtitle: 'Verified driver arrives, weighs waste, and logs batch'
    },
    {
      title: 'Compost to Marketplace',
      subtitle: 'Organic waste is enriched into bio-fertilizer for purchase'
    }
  ];

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, var(--bg) 100%)',
          padding: '4.5rem 1.5rem 3.5rem',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: 30,
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1.5rem'
            }}
          >
            <Sparkles size={16} />
            <span>Sustainable Door-to-Door Waste Management</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: 800,
              color: 'var(--text)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem'
            }}
          >
            Smart Garbage <span style={{ color: 'var(--primary)' }}>Management</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--muted)',
              lineHeight: 1.6,
              maxWidth: 680,
              margin: '0 auto 2.25rem'
            }}
          >
            A modern, eco-friendly system collecting biodegradable household waste, monitoring smart bins,
            and converting organic residue into premium bio-fertilizers and compost.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/register')}
              icon={<ArrowRight size={18} />}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/login')}
            >
              Citizen Login
            </Button>
          </div>
        </div>
      </section>

      {/* 4-Step "How It Works" Section */}
      <section style={{ maxWidth: 1100, margin: '3.5rem auto 0', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            How It Works
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: '0.4rem', fontSize: '1rem' }}>
            From your kitchen bin to enriched organic harvest in 4 simple steps.
          </p>
        </div>

        {/* Horizontal Stepper chain */}
        <Card style={{ padding: '2rem 1.5rem', marginBottom: '2rem' }}>
          <Stepper steps={steps} currentStep={1} />
        </Card>

        {/* Detailed 4 Step Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.25rem'
          }}
        >
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--primary-soft)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CreditCard size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>1. Subscribe</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Choose a flexible Monthly or Yearly plan to activate smart bin tracking and doorstep collections.
            </p>
          </Card>

          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--warning-soft)',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Recycle size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>2. Request Collection</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              When your smart bin fills to Half or Full, tap one button to dispatch a municipal pickup request.
            </p>
          </Card>

          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--info-soft)',
                color: 'var(--info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Truck size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>3. Driver Collects</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Assigned collection vehicles arrive at your coordinates, weigh the waste, and transfer it to the unit.
            </p>
          </Card>

          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--purple-soft)',
                color: '#6d28d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShoppingBag size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>4. Eco Marketplace</h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Finished batches are transformed into nutrient-rich compost available directly in our store.
            </p>
          </Card>
        </div>
      </section>

      {/* Featured Products Strip */}
      <section
        id="products"
        style={{
          maxWidth: 1100,
          margin: '4.5rem auto 0',
          padding: '0 1.5rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Featured Bio-Fertilizers & Compost
            </h2>
            <p style={{ color: 'var(--muted)', marginTop: '0.35rem', fontSize: '0.95rem' }}>
              Pure, 100% organic compost crafted from municipal solid waste.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/login')}
          >
            Browse All in App
          </Button>
        </div>

        {loadingProducts ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)' }}>
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--muted)' }}>No products listed yet.</p>
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {products.map((p) => (
              <Card
                key={p.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: 0
                }}
              >
                <div
                  style={{
                    height: 140,
                    background: 'linear-gradient(135deg, var(--primary-soft) 0%, #d8ede0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}
                >
                  <Leaf size={48} strokeWidth={1.5} />
                </div>
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.35rem'
                    }}
                  >
                    {p.category_name || 'Compost'}
                  </div>
                  <h4
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      marginBottom: '0.4rem',
                      lineHeight: 1.3
                    }}
                  >
                    {p.name}
                  </h4>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--muted)',
                      flex: 1,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {p.description || 'Natural organic nutrient builder.'}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #f0f4f2',
                      paddingTop: '0.85rem'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                      ₹{Number(p.price).toFixed(2)}
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>
                        {' '}/ {p.unit || 'kg'}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/login')}
                    >
                      Buy
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Landing;
