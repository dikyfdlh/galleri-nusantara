import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './context/SessionContext.jsx';
import Navbar from './components/Navbar.jsx';
import EntryPage from './pages/EntryPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function RequireCustomer({ children }) {
  const { customer } = useSession();
  if (!customer) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen font-display">
      <Navbar />
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route
          path="/katalog"
          element={
            <RequireCustomer>
              <CatalogPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/sewa/:productId"
          element={
            <RequireCustomer>
              <BookingPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/pembayaran/:bookingId"
          element={
            <RequireCustomer>
              <PaymentPage />
            </RequireCustomer>
          }
        />
        <Route
          path="/pesanan-saya"
          element={
            <RequireCustomer>
              <MyBookingsPage />
            </RequireCustomer>
          }
        />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="mt-16 border-t border-batik-100 py-8 text-center text-sm text-batik-500">
        Galleri Nusantara — Rental Pakaian Adat Nusantara · Pembayaran QRIS
      </footer>
    </div>
  );
}
