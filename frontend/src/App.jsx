import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import NotFound from './pages/public/NotFound';

// User & Marketplace Pages
import UserDashboard from './pages/user/UserDashboard';
import MyBins from './pages/user/MyBins';
import SubscriptionPage from './pages/user/SubscriptionPage';
import RequestCollectionPage from './pages/user/RequestCollectionPage';
import MyRequestsPage from './pages/user/MyRequestsPage';
import MarketplacePage from './pages/user/MarketplacePage';
import OrdersPage from './pages/user/OrdersPage';
import ReportsPage from './pages/user/ReportsPage';
import SupportPage from './pages/user/SupportPage';
import NotificationsPage from './pages/user/NotificationsPage';
import ProfilePage from './pages/user/ProfilePage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDrivers from './pages/admin/AdminDrivers';
import AdminBins from './pages/admin/AdminBins';
import AdminRequests from './pages/admin/AdminRequests';
import AdminWaste from './pages/admin/AdminWaste';
import AdminComposting from './pages/admin/AdminComposting';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPayments from './pages/admin/AdminPayments';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminReports from './pages/admin/AdminReports';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverCollections from './pages/driver/DriverCollections';
import DriverHistory from './pages/driver/DriverHistory';
import DriverProfile from './pages/driver/DriverProfile';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Public Routes with Top Navigation */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/marketplace" element={<MarketplacePage isPublic={true} />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected User Routes (/app/*) */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<UserDashboard />} />
                <Route path="bins" element={<MyBins />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="request" element={<RequestCollectionPage />} />
                <Route path="request-collection" element={<RequestCollectionPage />} />
                <Route path="requests" element={<MyRequestsPage />} />
                <Route path="history" element={<MyRequestsPage />} />
                <Route path="marketplace" element={<MarketplacePage isPublic={false} />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="report" element={<ReportsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="feedback" element={<SupportPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Protected Admin Routes (/admin/*) */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="drivers" element={<AdminDrivers />} />
                <Route path="bins" element={<AdminBins />} />
                <Route path="requests" element={<AdminRequests />} />
                <Route path="waste" element={<AdminWaste />} />
                <Route path="composting" element={<AdminComposting />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>

              {/* Protected Driver Routes (/driver/*) */}
              <Route
                path="/driver"
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DriverDashboard />} />
                <Route path="collections" element={<DriverCollections />} />
                <Route path="history" element={<DriverHistory />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<DriverProfile />} />
              </Route>

              {/* Wildcard 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
