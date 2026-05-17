import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api, rupiah, tanggal } from '../api.js';
import Carousel from '../components/Carousel.jsx';
import Calendar from '../components/Calendar.jsx';

export default function BookingPage() {
  const { productId } = useParams();
  const { customer } = useSession();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [settings, setSettings] = useState({ dpPercent: 50, pickupOffsetDays: 1 });
  const [days, setDays] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [paymentType, setPaymentType] = useState('dp');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1); // paling cepat besok
    return d;
  }, []);

  useEffect(() => {
    api.product(productId).then(setProduct).catch(() => setProduct(null));
    api.settings().then(setSettings).catch(() => {});
  }, [productId]);

  if (!product) return <p className="py-20 text-center text-batik-500">Memuat…</p>;

  const total = product.pricePerDay * days;
  const dpAmount = Math.round((total * (settings.dpPercent || 50)) / 100);
  const payNow = paymentType === 'full' ? total : dpAmount;

  async function submit() {
    setErr('');
    if (!startDate) return setErr('Pilih tanggal mulai sewa pada kalender.');
    setLoading(true);
    try {
      const b = await api.createBooking({
        customerId: customer.id,
        productId,
        startDate,
        days,
        paymentType,
      });
      navigate(`/pembayaran/${b.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <button className="btn-ghost mb-4" onClick={() => navigate('/katalog')}>
        ‹ Kembali ke katalog
      </button>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Carousel images={product.images} alt={product.name} heightClass="h-80" />
          <h1 className="mt-4 text-2xl font-bold text-batik-900">{product.name}</h1>
          {product.province && (
            <p className="text-sm text-batik-500">📍 {product.province}</p>
          )}
          <p className="mt-2 whitespace-pre-line text-batik-700">{product.description}</p>
          <p className="mt-3 font-bold text-batik-700">
            {rupiah(product.pricePerDay)}
            <span className="text-sm font-normal text-batik-400">/hari</span> · Stok{' '}
            {product.available}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="mb-2 font-semibold text-batik-900">1. Tentukan jadwal</h2>
            <Calendar
              value={startDate}
              onChange={setStartDate}
              minDate={minDate}
              days={days}
            />
          </div>

          <div className="card p-4">
            <label className="label">Lama sewa (hari)</label>
            <div className="flex items-center gap-3">
              <button
                className="btn-outline px-4"
                onClick={() => setDays((d) => Math.max(1, d - 1))}
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-bold">{days}</span>
              <button
                className="btn-outline px-4"
                onClick={() => setDays((d) => d + 1)}
              >
                +
              </button>
              <span className="ml-2 text-sm text-batik-500">
                {startDate
                  ? `${tanggal(startDate)} → ${tanggal(
                      new Date(
                        new Date(startDate + 'T00:00:00').getTime() +
                          (days - 1) * 86400000
                      )
                        .toISOString()
                        .slice(0, 10)
                    )}`
                  : 'Pilih tanggal dulu'}
              </span>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 font-semibold text-batik-900">2. Metode pembayaran</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentType('dp')}
                className={`rounded-xl border p-3 text-left ${
                  paymentType === 'dp'
                    ? 'border-batik-600 bg-batik-50'
                    : 'border-batik-200'
                }`}
              >
                <div className="font-semibold">DP {settings.dpPercent}%</div>
                <div className="text-sm text-batik-600">{rupiah(dpAmount)}</div>
                <div className="text-xs text-batik-400">Sisa dilunasi nanti</div>
              </button>
              <button
                onClick={() => setPaymentType('full')}
                className={`rounded-xl border p-3 text-left ${
                  paymentType === 'full'
                    ? 'border-batik-600 bg-batik-50'
                    : 'border-batik-200'
                }`}
              >
                <div className="font-semibold">Bayar Lunas</div>
                <div className="text-sm text-batik-600">{rupiah(total)}</div>
                <div className="text-xs text-batik-400">Langsung lunas</div>
              </button>
            </div>

            <div className="mt-4 space-y-1 border-t border-batik-100 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-batik-500">
                  {rupiah(product.pricePerDay)} × {days} hari
                </span>
                <span>{rupiah(total)}</span>
              </div>
              <div className="flex justify-between font-bold text-batik-800">
                <span>Bayar sekarang ({paymentType === 'full' ? 'Lunas' : 'DP'})</span>
                <span>{rupiah(payNow)}</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-batik-50 px-3 py-2 text-xs text-batik-600">
              ⓘ Jadwal pengambilan dimulai <b>H+{settings.pickupOffsetDays} setelah
              pembayaran diverifikasi</b> (atau pada tanggal yang Anda pilih bila lebih
              akhir).
            </div>

            {err && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            <button
              className="btn-primary mt-4 w-full"
              disabled={loading}
              onClick={submit}
            >
              {loading ? 'Memproses…' : `Lanjut Bayar QRIS · ${rupiah(payNow)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
