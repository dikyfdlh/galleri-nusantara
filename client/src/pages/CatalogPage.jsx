import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, rupiah } from '../api.js';
import Carousel from '../components/Carousel.jsx';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Semua');
  const [detail, setDetail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .products()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const cats = [
    'Semua',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  const filtered = products.filter(
    (p) =>
      (cat === 'Semua' || p.category === cat) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.province || '').toLowerCase().includes(q.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-batik-900">Katalog Pakaian</h1>
          <p className="text-sm text-batik-500">
            Pilih busana untuk disewa — pakaian adat &amp; lainnya
          </p>
        </div>
        <input
          className="input sm:w-72"
          placeholder="Cari nama, provinsi, atau kategori…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`badge border px-3 py-1 transition ${
              cat === c
                ? 'border-batik-600 bg-batik-600 text-white'
                : 'border-batik-200 bg-white text-batik-700 hover:bg-batik-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-20 text-center text-batik-500">Memuat katalog…</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <Carousel images={p.images} alt={p.name} heightClass="h-56" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-batik-900">{p.name}</h3>
                  <span
                    className={`badge ${
                      p.available > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {p.available > 0 ? `Stok ${p.available}` : 'Habis'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {p.category && (
                    <span className="badge bg-batik-100 text-batik-700">
                      {p.category}
                    </span>
                  )}
                  {p.province && (
                    <span className="text-xs text-batik-500">📍 {p.province}</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-batik-600">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="font-bold text-batik-700">
                    {rupiah(p.pricePerDay)}
                    <span className="text-xs font-normal text-batik-400">/hari</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-outline" onClick={() => setDetail(p)}>
                      Detail
                    </button>
                    <button
                      className="btn-primary"
                      disabled={p.available <= 0}
                      onClick={() => navigate(`/sewa/${p.id}`)}
                    >
                      Sewa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-16 text-center text-batik-500">
              Tidak ada pakaian yang cocok.
            </p>
          )}
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-batik-900">{detail.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {detail.category && (
                    <span className="badge bg-batik-100 text-batik-700">
                      {detail.category}
                    </span>
                  )}
                  {detail.province && (
                    <span className="text-sm text-batik-500">📍 {detail.province}</span>
                  )}
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>
            <Carousel images={detail.images} alt={detail.name} heightClass="h-80" />
            <p className="mt-4 whitespace-pre-line text-batik-700">{detail.description}</p>
            <div className="mt-5 flex items-center justify-between border-t border-batik-100 pt-4">
              <div>
                <div className="text-2xl font-bold text-batik-700">
                  {rupiah(detail.pricePerDay)}
                  <span className="text-sm font-normal text-batik-400">/hari</span>
                </div>
                <div className="text-xs text-batik-500">
                  Stok tersedia: {detail.available}
                </div>
              </div>
              <button
                className="btn-primary"
                disabled={detail.available <= 0}
                onClick={() => navigate(`/sewa/${detail.id}`)}
              >
                Sewa Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
