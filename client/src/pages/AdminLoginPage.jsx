import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { token } = await api.adminLogin(password);
      localStorage.setItem('gn_admin_token', token);
      navigate('/admin/dashboard');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <form onSubmit={submit} className="card p-8">
        <h1 className="text-xl font-bold text-batik-900">Masuk Admin</h1>
        <p className="mb-5 mt-1 text-sm text-batik-500">
          Kelola katalog, stok, dan verifikasi pembayaran.
        </p>
        <label className="label">Password Admin</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {err && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
        <button className="btn-primary mt-5 w-full" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
        <p className="mt-4 text-center text-xs text-batik-400">
          Halaman khusus pengelola. Akses dibatasi.
        </p>
      </form>
    </div>
  );
}
