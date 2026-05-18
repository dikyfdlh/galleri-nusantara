import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';

export default function Navbar() {
  const { customer, logout } = useSession();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-batik-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to={customer ? '/katalog' : '/'} className="flex items-center gap-2">
          <span className="text-2xl">👘</span>
          <div className="leading-tight">
            <div className="font-bold text-batik-800">Galleri Nusantara</div>
            <div className="text-[11px] text-batik-500">Rental Pakaian Adat</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {customer ? (
            <>
              <Link className="btn-ghost" to="/katalog">
                Katalog
              </Link>
              <Link className="btn-ghost" to="/pesanan-saya">
                Pesanan Saya
              </Link>
              <span className="hidden sm:block px-2 text-batik-500">Hai, {customer.name.split(' ')[0]}</span>
              <button
                className="btn-outline"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link className="btn-primary" to="/">
                Pelanggan
              </Link>
              <Link className="btn-ghost" to="/admin">
                Admin
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
