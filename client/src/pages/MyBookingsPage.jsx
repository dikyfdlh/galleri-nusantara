import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api, rupiah, tanggal } from '../api.js';

const LABEL = {
  awaiting_payment: ['Menunggu Pembayaran', 'bg-amber-100 text-amber-700'],
  verifying: ['Verifikasi Pembayaran', 'bg-blue-100 text-blue-700'],
  awaiting_settlement: ['Menunggu Pelunasan', 'bg-amber-100 text-amber-700'],
  verifying_settlement: ['Verifikasi Pelunasan', 'bg-blue-100 text-blue-700'],
  paid_dp: ['DP Lunas', 'bg-green-100 text-green-700'],
  paid_full: ['Lunas', 'bg-green-100 text-green-700'],
  picked_up: ['Sedang Disewa', 'bg-batik-100 text-batik-700'],
  returned: ['Dikembalikan', 'bg-gray-100 text-gray-600'],
  cancelled: ['Dibatalkan', 'bg-red-100 text-red-700'],
  rejected: ['Ditolak', 'bg-red-100 text-red-700'],
};

export default function MyBookingsPage() {
  const { customer } = useSession();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .bookings(customer.id)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [customer.id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-batik-900">Pesanan Saya</h1>
      <p className="text-sm text-batik-500">Riwayat sewa atas nama {customer.name}</p>

      {loading ? (
        <p className="py-16 text-center text-batik-500">Memuat…</p>
      ) : list.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-batik-500">Belum ada pesanan.</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/katalog')}>
            Lihat Katalog
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((b) => {
            const [t, c] = LABEL[b.status] || [b.status, 'bg-gray-100'];
            return (
              <div key={b.id} className="card flex items-center gap-4 p-4">
                <img
                  src={b.productImage}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                  onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-batik-900">{b.productName}</h3>
                    <span className={`badge ${c}`}>{t}</span>
                  </div>
                  <p className="text-sm text-batik-500">
                    {b.code} · {b.days} hari · mulai {tanggal(b.startDate)}
                  </p>
                  {b.pickupDate && (
                    <p className="text-sm text-green-700">
                      📅 Ambil: {tanggal(b.pickupDate)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-batik-800">{rupiah(b.total)}</div>
                  <button
                    className="btn-outline mt-1 text-sm"
                    onClick={() => navigate(`/pembayaran/${b.id}`)}
                  >
                    {['awaiting_payment', 'awaiting_settlement', 'paid_dp'].includes(
                      b.status
                    )
                      ? 'Bayar / Detail'
                      : 'Detail'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
