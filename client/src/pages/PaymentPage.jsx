import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, rupiah, tanggal } from '../api.js';

const STATUS_LABEL = {
  awaiting_payment: { t: 'Menunggu Pembayaran', c: 'bg-amber-100 text-amber-700' },
  verifying: { t: 'Menunggu Verifikasi Admin', c: 'bg-blue-100 text-blue-700' },
  awaiting_settlement: { t: 'Menunggu Pelunasan', c: 'bg-amber-100 text-amber-700' },
  verifying_settlement: { t: 'Verifikasi Pelunasan', c: 'bg-blue-100 text-blue-700' },
  paid_dp: { t: 'DP Lunas', c: 'bg-green-100 text-green-700' },
  paid_full: { t: 'Lunas', c: 'bg-green-100 text-green-700' },
};

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [qris, setQris] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    const b = await api.booking(bookingId);
    setBooking(b);
    return b;
  }, [bookingId]);

  const loadQris = useCallback(async () => {
    try {
      setQris(await api.qris(bookingId));
    } catch (e) {
      setQris(null);
    }
  }, [bookingId]);

  useEffect(() => {
    refresh().then((b) => {
      if (b.status === 'awaiting_payment' || b.status === 'awaiting_settlement') loadQris();
    });
  }, [refresh, loadQris]);

  // Polling status agar tahu saat admin memverifikasi
  useEffect(() => {
    const id = setInterval(() => refresh().catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!booking) return <p className="py-20 text-center text-batik-500">Memuat…</p>;

  const st = STATUS_LABEL[booking.status] || { t: booking.status, c: 'bg-gray-100' };
  const showQr =
    (booking.status === 'awaiting_payment' || booking.status === 'awaiting_settlement') &&
    qris;
  const isPaidStage = ['paid_dp', 'paid_full'].includes(booking.status);

  async function markPaid() {
    setBusy(true);
    setErr('');
    try {
      await api.markPaid(bookingId);
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function startSettle() {
    setBusy(true);
    try {
      await api.settle(bookingId);
      const b = await refresh();
      if (b.status === 'awaiting_settlement') loadQris();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button className="btn-ghost mb-4" onClick={() => navigate('/pesanan-saya')}>
        ‹ Pesanan Saya
      </button>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-batik-900">Pembayaran QRIS</h1>
            <p className="text-sm text-batik-500">
              Kode pesanan <b>{booking.code}</b> · {booking.productName}
            </p>
          </div>
          <span className={`badge ${st.c}`}>{st.t}</span>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <Row k="Penyewa" v={booking.customer.name} />
            <Row k="Periode" v={`${tanggal(booking.startDate)}`} />
            <Row k="Lama sewa" v={`${booking.days} hari`} />
            <Row k="Total sewa" v={rupiah(booking.total)} />
            <Row
              k={booking.paymentType === 'full' ? 'Tagihan (Lunas)' : `DP ${booking.dpPercent}%`}
              v={rupiah(booking.paymentType === 'full' ? booking.total : booking.dpAmount)}
              bold
            />
            {booking.amountPaid > 0 && (
              <Row k="Sudah dibayar" v={rupiah(booking.amountPaid)} />
            )}
            {booking.status === 'paid_dp' && (
              <Row k="Sisa pelunasan" v={rupiah(booking.total - booking.amountPaid)} />
            )}
            {booking.pickupDate && (
              <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-green-800">
                📅 Jadwal pengambilan: <b>{tanggal(booking.pickupDate)}</b>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center">
            {showQr ? (
              qris.gateway ? (
                <>
                  <div className="mb-2 rounded-lg bg-green-50 px-3 py-1.5 text-center text-xs text-green-700">
                    QRIS resmi via Midtrans · pembayaran <b>terkonfirmasi otomatis</b>
                  </div>
                  {!qris.qrImageUrl ? (
                    <div className="w-56 break-all rounded-xl border border-batik-100 bg-white p-3 text-[10px]">
                      {qris.qrString || 'QR tidak tersedia'}
                    </div>
                  ) : (
                    <img
                      src={qris.qrImageUrl}
                      alt="QRIS"
                      className="w-56 rounded-xl border border-batik-100"
                    />
                  )}
                  <div className="mt-2 text-center">
                    <div className="text-xs text-batik-500">Nominal yang harus dibayar</div>
                    <div className="text-2xl font-bold text-batik-800">
                      {rupiah(qris.amount)}
                    </div>
                  </div>
                  <div className="mt-4 w-full text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-batik-700">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      Menunggu pembayaran… terkonfirmasi otomatis
                    </div>
                    <button
                      className="btn-outline mt-3 w-full"
                      disabled={busy}
                      onClick={() => refresh()}
                    >
                      Saya Sudah Bayar — Cek Status
                    </button>
                  </div>
                </>
              ) : (
                /* ---- Mode MANUAL: QRIS statis (foto) + bank / e-wallet ---- */
                <div className="w-full">
                  {!qris.configured && (
                    <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                      Metode pembayaran belum diatur admin. Hubungi admin / atur di{' '}
                      <b>/admin → Pengaturan → Metode Pembayaran</b>.
                    </div>
                  )}
                  <div className="mb-3 rounded-lg bg-batik-50 px-3 py-2 text-center">
                    <div className="text-xs text-batik-500">
                      Nominal yang harus dibayar
                    </div>
                    <div className="text-2xl font-bold text-batik-800">
                      {rupiah(qris.amount)}
                    </div>
                  </div>

                  {qris.qrisImage && (
                    <div className="mb-4 flex flex-col items-center">
                      <img
                        src={qris.qrisImage}
                        alt="QRIS"
                        className="w-56 rounded-xl border border-batik-100 bg-white object-contain"
                      />
                      <p className="mt-1 text-center text-xs text-batik-500">
                        QRIS{qris.qrisName ? ` · ${qris.qrisName}` : ''}. Scan lalu{' '}
                        <b>masukkan nominal {rupiah(qris.amount)}</b> secara manual.
                      </p>
                    </div>
                  )}

                  {qris.banks?.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 text-sm font-semibold text-batik-800">
                        Transfer Bank
                      </div>
                      <div className="space-y-2">
                        {qris.banks.map((b) => (
                          <div
                            key={b.id}
                            className="rounded-lg border border-batik-100 p-2 text-sm"
                          >
                            <div className="font-semibold text-batik-800">
                              {b.bank}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono">{b.accountNumber}</span>
                              <CopyBtn value={b.accountNumber} />
                            </div>
                            <div className="text-xs text-batik-500">
                              a.n. {b.accountName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qris.ewallets?.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 text-sm font-semibold text-batik-800">
                        E-Wallet
                      </div>
                      <div className="space-y-2">
                        {qris.ewallets.map((w) => (
                          <div
                            key={w.id}
                            className="rounded-lg border border-batik-100 p-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                <b>{w.type}</b> ·{' '}
                                <span className="font-mono">{w.number}</span>
                              </span>
                              <CopyBtn value={w.number} />
                            </div>
                            <div className="text-xs text-batik-500">
                              a.n. {w.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qris.instructions && (
                    <div className="mb-3 whitespace-pre-line rounded-lg bg-batik-50 px-3 py-2 text-xs text-batik-600">
                      {qris.instructions}
                    </div>
                  )}

                  <button
                    className="btn-primary w-full"
                    disabled={busy}
                    onClick={markPaid}
                  >
                    {busy ? 'Memproses…' : 'Saya Sudah Membayar'}
                  </button>
                  <p className="mt-2 text-center text-xs text-batik-400">
                    Setelah bayar, admin memverifikasi. Status diperbarui otomatis.
                  </p>
                </div>
              )
            ) : booking.status === 'verifying' ||
              booking.status === 'verifying_settlement' ? (
              <div className="text-center">
                <div className="text-4xl">⏳</div>
                <p className="mt-2 font-semibold text-batik-800">
                  Pembayaran sedang diverifikasi admin
                </p>
                <p className="text-sm text-batik-500">
                  Halaman ini akan memperbarui status otomatis.
                </p>
              </div>
            ) : isPaidStage ? (
              <div className="text-center">
                <div className="text-4xl">✅</div>
                <p className="mt-2 font-semibold text-green-700">
                  {booking.status === 'paid_full'
                    ? 'Pembayaran lunas & terverifikasi'
                    : 'DP terverifikasi'}
                </p>
                {booking.status === 'paid_dp' && (
                  <button
                    className="btn-primary mt-4"
                    disabled={busy}
                    onClick={startSettle}
                  >
                    Lunasi Sisa {rupiah(booking.total - booking.amountPaid)}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-batik-500">Status: {booking.status}</p>
            )}
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}

function CopyBtn({ value }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="shrink-0 rounded-md border border-batik-200 px-2 py-0.5 text-xs text-batik-700 hover:bg-batik-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard tidak tersedia */
        }
      }}
    >
      {done ? '✓ Tersalin' : 'Salin'}
    </button>
  );
}

function Row({ k, v, bold }) {
  return (
    <div className="flex justify-between border-b border-batik-50 py-1">
      <span className="text-batik-500">{k}</span>
      <span className={bold ? 'font-bold text-batik-800' : 'text-batik-800'}>{v}</span>
    </div>
  );
}
