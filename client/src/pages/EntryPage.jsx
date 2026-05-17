import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../api.js';

export default function EntryPage() {
  const { customer, login } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) navigate('/katalog', { replace: true });
  }, [customer, navigate]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) return setErr('Nama wajib diisi.');
    if (!form.phone.trim()) return setErr('Nomor telepon wajib diisi.');
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      return setErr('Format email tidak valid.');
    setLoading(true);
    try {
      const c = await api.enter(form);
      login(c);
      navigate('/katalog');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center">
      <div>
        <span className="badge bg-batik-100 text-batik-700">Warisan Budaya Nusantara</span>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-batik-900 md:text-5xl">
          Sewa Pakaian Adat <span className="text-batik-600">se-Indonesia</span> dengan Mudah
        </h1>
        <p className="mt-4 max-w-md text-batik-600">
          Dari Ulos Batak hingga Payas Agung Bali. Pilih, jadwalkan lewat kalender,
          bayar dengan QRIS, dan ambil pakaian setelah pembayaran terverifikasi.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-batik-700">
          <li>✓ Katalog pakaian adat lengkap dengan galeri foto</li>
          <li>✓ Pembayaran QRIS — DP atau pelunasan</li>
          <li>✓ Jadwal pengambilan otomatis (H+1 setelah pembayaran)</li>
        </ul>
      </div>

      <form onSubmit={submit} className="card p-6 md:p-8">
        <h2 className="text-xl font-bold text-batik-900">Masuk untuk Mulai Menyewa</h2>
        <p className="mb-5 mt-1 text-sm text-batik-500">
          Isi data diri Anda. <b>Nama</b> dan <b>nomor telepon</b> wajib diisi.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="cth. Diky Ramadhan"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              Nomor Telepon / HP <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="cth. 0812xxxxxxx"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/[^\d+]/g, ''))}
            />
          </div>
          <div>
            <label className="label">
              Email <span className="text-batik-400">(opsional)</span>
            </label>
            <input
              className="input"
              placeholder="cth. nama@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
        )}

        <button className="btn-primary mt-6 w-full" disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk & Lihat Katalog'}
        </button>
      </form>
    </div>
  );
}
