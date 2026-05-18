import { useCallback, useEffect, useState } from 'react';
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
  returned: ['Pesanan Selesai', 'bg-green-100 text-green-700'],
  cancelled: ['Dibatalkan', 'bg-red-100 text-red-700'],
  rejected: ['Ditolak', 'bg-red-100 text-red-700'],
};

export default function MyBookingsPage() {
  const { customer } = useSession();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateFor, setRateFor] = useState(null);
  const navigate = useNavigate();

  const reload = useCallback(() => {
    api
      .bookings(customer.id)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [customer.id]);

  useEffect(reload, [reload]);

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
            const done = b.status === 'returned';
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
                <div className="flex flex-col items-end gap-1">
                  <div className="font-bold text-batik-800">{rupiah(b.total)}</div>
                  <button
                    className="btn-outline text-sm"
                    onClick={() => navigate(`/pembayaran/${b.id}`)}
                  >
                    {['awaiting_payment', 'awaiting_settlement', 'paid_dp'].includes(
                      b.status
                    )
                      ? 'Bayar / Detail'
                      : 'Detail'}
                  </button>
                  {done &&
                    (b.testimonialId ? (
                      <span className="badge bg-green-100 text-green-700">
                        ★ Sudah dinilai
                      </span>
                    ) : (
                      <button
                        className="btn-primary text-sm"
                        onClick={() => setRateFor(b)}
                      >
                        ★ Beri Rating
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rateFor && (
        <RatingModal
          booking={rateFor}
          customerId={customer.id}
          onClose={() => setRateFor(null)}
          onSaved={() => {
            setRateFor(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function RatingModal({ booking, customerId, onClose, onSaved }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [media, setMedia] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const MAX = 25 * 1024 * 1024;

  function pickFile(e) {
    const f = e.target.files[0] || null;
    if (f && f.size > MAX) {
      setErr('Ukuran file maksimal 25 MB.');
      e.target.value = '';
      setMedia(null);
      return;
    }
    setErr('');
    setMedia(f);
  }

  async function submit() {
    if (media && media.size > MAX) return setErr('Ukuran file maksimal 25 MB.');
    setBusy(true);
    setErr('');
    try {
      await api.rateBooking(booking.id, {
        customerId,
        rating,
        message,
        anonymous,
        media,
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-batik-900">Beri Rating</h2>
          <button className="btn-ghost px-2 py-1 text-lg" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-batik-500">
          {booking.productName} · {booking.code}
        </p>

        <div className="mb-4 flex justify-center gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} bintang`}
              onClick={() => setRating(n)}
              className={n <= rating ? 'text-batik-500' : 'text-batik-200'}
            >
              ★
            </button>
          ))}
        </div>

        <label className="label">Ulasan (opsional)</label>
        <textarea
          className="input min-h-[90px]"
          placeholder="Bagaimana pengalaman menyewa di Galleri Nusantara?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="mt-3">
          <label className="label">Foto / Video (opsional, maks 25 MB)</label>
          <input
            type="file"
            accept="image/*,video/*"
            className="block w-full text-sm"
            onChange={pickFile}
          />
          {media && (
            <p className="mt-1 text-xs text-batik-500">
              {media.name} · {(media.size / 1048576).toFixed(1)} MB
            </p>
          )}
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-batik-700">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          Tampilkan sebagai <b>Anonim</b> (nama disamarkan)
        </label>

        {err && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <button
          className="btn-primary mt-4 w-full"
          disabled={busy}
          onClick={submit}
        >
          {busy ? 'Mengirim…' : 'Kirim Rating'}
        </button>
        <p className="mt-2 text-center text-xs text-batik-400">
          Rating Anda akan tampil di halaman depan sebagai testimoni.
        </p>
      </div>
    </div>
  );
}
