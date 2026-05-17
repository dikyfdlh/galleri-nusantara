import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, rupiah, tanggal, hasAdminToken, clearAdminToken } from '../api.js';
import Carousel from '../components/Carousel.jsx';

const TABS = [
  ['catalog', 'Katalog'],
  ['bookings', 'Pesanan'],
  ['settings', 'Pengaturan'],
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('catalog');
  // 'checking' -> verifikasi token ke server; 'ok' -> tampilkan; 'denied' -> tendang
  const [auth, setAuth] = useState('checking');

  useEffect(() => {
    let alive = true;
    if (!hasAdminToken()) {
      setAuth('denied');
      return;
    }
    api
      .adminVerify()
      .then(() => alive && setAuth('ok'))
      .catch(() => alive && setAuth('denied'));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (auth === 'denied') {
      clearAdminToken();
      navigate('/admin', { replace: true });
    }
  }, [auth, navigate]);

  function logout() {
    clearAdminToken();
    setAuth('denied');
  }

  // Jangan render apa pun dari panel admin sebelum token terverifikasi server.
  if (auth !== 'ok') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-batik-500">
        {auth === 'checking' ? 'Memeriksa akses admin…' : 'Mengalihkan ke halaman masuk…'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-batik-900 sm:text-2xl">Panel Admin</h1>
        <button className="btn-outline shrink-0" onClick={logout}>
          Keluar Admin
        </button>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto border-b border-batik-100">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 font-medium ${
              tab === k
                ? 'border-batik-600 text-batik-800'
                : 'border-transparent text-batik-500 hover:text-batik-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'catalog' && <CatalogAdmin />}
        {tab === 'bookings' && <BookingsAdmin />}
        {tab === 'settings' && <SettingsAdmin />}
      </div>
    </div>
  );
}

/* ---------------- KATALOG ---------------- */
function emptyProduct() {
  return {
    name: '',
    category: 'Pakaian Adat',
    province: '',
    pricePerDay: 100000,
    stock: 1,
    description: '',
    images: [],
  };
}

function CatalogAdmin() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [categories, setCategories] = useState([]);
  const [msg, setMsg] = useState('');

  // Escape menutup overlay + kunci scroll body saat modal terbuka.
  useEffect(() => {
    if (!editing && !confirmDel) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setConfirmDel(null);
        setEditing(null);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [editing, confirmDel]);

  function closeEditor() {
    setEditing(null);
    setMsg('');
  }

  const reload = useCallback(() => {
    api.products(true).then(setProducts).catch(() => {});
    api
      .settings()
      .then((s) => setCategories(s.categories || []))
      .catch(() => {});
  }, []);
  useEffect(reload, [reload]);

  async function save() {
    try {
      if (editing.id) await api.updateProduct(editing.id, editing);
      else {
        const created = await api.createProduct(editing);
        setEditing({ ...created });
      }
      setMsg('Tersimpan.');
      reload();
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    try {
      await api.deleteProduct(confirmDel.id);
      setConfirmDel(null);
      setEditing(null);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function uploadImgs(files) {
    if (!editing?.id) {
      setMsg('Simpan produk dulu sebelum unggah foto.');
      return;
    }
    const updated = await api.uploadImages(editing.id, files);
    setEditing({ ...updated });
    reload();
  }

  async function removeImg(url) {
    const updated = await api.removeImage(editing.id, url);
    setEditing({ ...updated });
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-batik-900">
            Daftar Pakaian ({products.length})
          </h2>
          <button className="btn-primary" onClick={() => setEditing(emptyProduct())}>
            + Tambah Pakaian
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setEditing({ ...p })}
              className={`w-[46%] overflow-hidden rounded-2xl border text-left transition hover:shadow-md sm:w-52 lg:w-60 ${
                editing?.id === p.id
                  ? 'border-batik-600 ring-2 ring-batik-300'
                  : 'border-batik-100 bg-white'
              }`}
            >
              <div className="relative h-36 w-full bg-batik-50 sm:h-40">
                <img
                  src={(p.images || [])[0]}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                />
                {p.category && (
                  <span className="absolute left-2 top-2 badge max-w-[65%] truncate bg-batik-700/85 text-white">
                    {p.category}
                  </span>
                )}
                {p.active === false && (
                  <span className="absolute right-2 top-2 badge bg-gray-800/80 text-white">
                    Nonaktif
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="truncate font-semibold text-batik-900">{p.name}</div>
                {p.province && (
                  <div className="truncate text-xs text-batik-500">📍 {p.province}</div>
                )}
                <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-bold text-batik-700">
                    {rupiah(p.pricePerDay)}
                  </span>
                  <span className="badge shrink-0 bg-batik-100 text-batik-700">
                    Stok: {p.stock}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {products.length === 0 && (
            <p className="py-10 text-sm text-batik-500">
              Belum ada produk. Klik “+ Tambah Pakaian”.
            </p>
          )}
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={closeEditor}
        >
          <div
            className="card my-auto w-full max-w-2xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-batik-900">
                {editing.id ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button
                className="btn-ghost px-2 py-1 text-lg"
                onClick={closeEditor}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[68vh] space-y-3 overflow-y-auto px-0.5 pb-1 sm:max-h-[70vh]">
            <div>
              <label className="label">Nama pakaian</label>
              <input
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Kategori pakaian</label>
              <input
                className="input"
                list="kategori-list"
                placeholder="cth. Pakaian Adat, Gaun & Kebaya Modern, Jas & Formal…"
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              />
              <datalist id="kategori-list">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-batik-400">
                Pilih dari saran atau ketik kategori baru — otomatis tersimpan
                untuk dipakai lagi (mendukung penyewaan pakaian non-tradisional).
              </p>
            </div>
            <div>
              <label className="label">Provinsi / asal daerah (opsional)</label>
              <input
                className="input"
                value={editing.province}
                onChange={(e) => setEditing({ ...editing, province: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Harga / hari (Rp)</label>
                <input
                  type="number"
                  className="input"
                  value={editing.pricePerDay}
                  onChange={(e) =>
                    setEditing({ ...editing, pricePerDay: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Stok</label>
                <input
                  type="number"
                  className="input"
                  value={editing.stock}
                  onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea
                className="input min-h-[100px]"
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>

            {editing.id && (
              <div>
                <label className="label">Galeri foto (carousel)</label>
                <div className="flex flex-wrap gap-2">
                  {(editing.images || []).map((u) => (
                    <div key={u} className="relative">
                      <img
                        src={u}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => removeImg(u)}
                        className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 text-xs text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-2 text-sm"
                  onChange={(e) => e.target.files.length && uploadImgs(e.target.files)}
                />
                <p className="mt-1 text-xs text-batik-400">
                  Atau tempel URL gambar dipisah baris:
                </p>
                <textarea
                  className="input mt-1 min-h-[60px] text-xs"
                  placeholder="https://...jpg"
                  defaultValue={(editing.images || []).join('\n')}
                  onBlur={(e) =>
                    setEditing({
                      ...editing,
                      images: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active !== false}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
              />
              Tampilkan di katalog (aktif)
            </label>
            </div>

            {msg && <div className="mt-3 text-sm text-batik-600">{msg}</div>}
            <div className="mt-4 flex gap-2">
              {editing.id && (
                <button
                  className="btn-outline border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmDel(editing)}
                >
                  Hapus
                </button>
              )}
              <button className="btn-primary flex-1" onClick={save}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDel(null)}
        >
          <div
            className="card w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-3xl">🗑️</div>
            <h3 className="mt-2 text-lg font-bold text-batik-900">Hapus produk?</h3>
            <p className="mt-1 text-sm text-batik-600">
              “{confirmDel.name}” akan dihapus permanen dan tidak bisa
              dikembalikan.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                className="btn-outline flex-1"
                onClick={() => setConfirmDel(null)}
              >
                Batal
              </button>
              <button
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
                onClick={doDelete}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- PESANAN ---------------- */
function BookingsAdmin() {
  const [list, setList] = useState([]);
  const reload = useCallback(() => {
    api.bookings().then(setList).catch(() => {});
  }, []);
  useEffect(() => {
    reload();
    const t = setInterval(reload, 7000);
    return () => clearInterval(t);
  }, [reload]);

  async function verify(id) {
    await api.verify(id);
    reload();
  }
  async function setStatus(id, status) {
    await api.setStatus(id, status);
    reload();
  }

  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="py-12 text-center text-batik-500">Belum ada pesanan.</p>
      )}
      {list.map((b) => (
        <div key={b.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-batik-900">
                {b.code} — {b.productName}
              </div>
              <div className="text-sm text-batik-500">
                {b.customer.name} · {b.customer.phone}
                {b.customer.email ? ` · ${b.customer.email}` : ''}
              </div>
              <div className="text-sm text-batik-500">
                {b.days} hari, mulai {tanggal(b.startDate)} ·{' '}
                {b.paymentType === 'full' ? 'Lunas' : `DP ${b.dpPercent}%`}
              </div>
              {b.pickupDate && (
                <div className="text-sm text-green-700">
                  📅 Pengambilan: {tanggal(b.pickupDate)}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-bold text-batik-800">{rupiah(b.total)}</div>
              <span className="badge bg-batik-100 text-batik-700">{b.status}</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-batik-50 pt-3">
            {(b.status === 'verifying' || b.status === 'verifying_settlement') && (
              <button className="btn-primary" onClick={() => verify(b.id)}>
                ✓ Verifikasi Pembayaran
              </button>
            )}
            {['paid_dp', 'paid_full'].includes(b.status) && (
              <button
                className="btn-outline"
                onClick={() => setStatus(b.id, 'picked_up')}
              >
                Tandai Diambil
              </button>
            )}
            {b.status === 'picked_up' && (
              <button
                className="btn-outline"
                onClick={() => setStatus(b.id, 'returned')}
              >
                Tandai Dikembalikan
              </button>
            )}
            {!['returned', 'cancelled', 'rejected'].includes(b.status) && (
              <button
                className="btn-ghost text-red-600"
                onClick={() => setStatus(b.id, 'cancelled')}
              >
                Batalkan
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- PENGATURAN ---------------- */
const EWALLET_TYPES = ['OVO', 'GoPay', 'ShopeePay', 'DANA', 'LinkAja', 'Lainnya'];

function PaymentSettingsCard() {
  const [pay, setPay] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .settings()
      .then((s) =>
        setPay(
          s.payment || {
            qrisImage: '',
            qrisName: '',
            banks: [],
            ewallets: [],
            instructions: '',
          }
        )
      )
      .catch(() => {});
  }, []);

  if (!pay)
    return (
      <div className="card p-5 text-batik-500">Memuat pembayaran…</div>
    );

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  async function uploadQris(file) {
    if (!file) return;
    setBusy(true);
    try {
      const s = await api.uploadQrisImage(file);
      setPay({ ...pay, qrisImage: s.payment.qrisImage });
      flash('ok', 'Foto QRIS diunggah.');
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeQris() {
    setBusy(true);
    try {
      await api.removeQrisImage();
      setPay({ ...pay, qrisImage: '' });
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusy(false);
    }
  }

  function setBank(i, k, v) {
    const banks = pay.banks.slice();
    banks[i] = { ...banks[i], [k]: v };
    setPay({ ...pay, banks });
  }
  function setEw(i, k, v) {
    const ewallets = pay.ewallets.slice();
    ewallets[i] = { ...ewallets[i], [k]: v };
    setPay({ ...pay, ewallets });
  }

  async function save() {
    setBusy(true);
    try {
      await api.updateSettings({
        payment: {
          qrisName: pay.qrisName,
          instructions: pay.instructions,
          banks: pay.banks,
          ewallets: pay.ewallets,
        },
      });
      flash('ok', 'Metode pembayaran disimpan.');
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 font-bold text-batik-900">Metode Pembayaran</h2>
      <p className="mb-4 text-xs text-batik-500">
        QRIS statis (foto barcode) + rekening bank & e-wallet. Pelanggan membayar
        lalu Anda verifikasi di tab Pesanan.
      </p>

      {/* ---- QRIS foto ---- */}
      <div className="rounded-xl border border-batik-100 p-4">
        <div className="mb-2 text-sm font-semibold text-batik-800">
          Foto Barcode QRIS
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <div className="flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-batik-200 bg-batik-50">
            {pay.qrisImage ? (
              <img
                src={pay.qrisImage}
                alt="QRIS"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-2 text-center text-xs text-batik-400">
                Belum ada foto QRIS
              </span>
            )}
          </div>
          <div className="w-full space-y-2">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm"
              disabled={busy}
              onChange={(e) => e.target.files[0] && uploadQris(e.target.files[0])}
            />
            {pay.qrisImage && (
              <button
                className="btn-outline border-red-300 text-sm text-red-600 hover:bg-red-50"
                onClick={removeQris}
                disabled={busy}
              >
                Hapus Foto QRIS
              </button>
            )}
            <div>
              <label className="label">Nama merchant di QRIS (opsional)</label>
              <input
                className="input"
                placeholder="cth. Galleri Nusantara"
                value={pay.qrisName || ''}
                onChange={(e) => setPay({ ...pay, qrisName: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Bank ---- */}
      <div className="mt-4 rounded-xl border border-batik-100 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-batik-800">
            Rekening Bank
          </span>
          <button
            className="btn-ghost text-sm"
            onClick={() =>
              setPay({
                ...pay,
                banks: [
                  ...pay.banks,
                  { id: 'new-' + Date.now(), bank: '', accountNumber: '', accountName: '' },
                ],
              })
            }
          >
            + Tambah bank
          </button>
        </div>
        {pay.banks.length === 0 && (
          <p className="text-xs text-batik-400">Belum ada rekening bank.</p>
        )}
        <div className="space-y-2">
          {pay.banks.map((b, i) => (
            <div key={b.id || i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_1.2fr_auto]">
              <input
                className="input"
                placeholder="Bank (BCA)"
                value={b.bank}
                onChange={(e) => setBank(i, 'bank', e.target.value)}
              />
              <input
                className="input"
                placeholder="No. rekening"
                value={b.accountNumber}
                onChange={(e) => setBank(i, 'accountNumber', e.target.value)}
              />
              <input
                className="input"
                placeholder="Atas nama"
                value={b.accountName}
                onChange={(e) => setBank(i, 'accountName', e.target.value)}
              />
              <button
                className="btn-ghost px-2 text-red-600"
                onClick={() =>
                  setPay({ ...pay, banks: pay.banks.filter((_, j) => j !== i) })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- E-wallet ---- */}
      <div className="mt-4 rounded-xl border border-batik-100 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-batik-800">E-Wallet</span>
          <button
            className="btn-ghost text-sm"
            onClick={() =>
              setPay({
                ...pay,
                ewallets: [
                  ...pay.ewallets,
                  { id: 'new-' + Date.now(), type: 'OVO', number: '', name: '' },
                ],
              })
            }
          >
            + Tambah e-wallet
          </button>
        </div>
        {pay.ewallets.length === 0 && (
          <p className="text-xs text-batik-400">
            Belum ada e-wallet (OVO, GoPay, ShopeePay, DANA).
          </p>
        )}
        <div className="space-y-2">
          {pay.ewallets.map((w, i) => (
            <div key={w.id || i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_1.2fr_auto]">
              <select
                className="input"
                value={w.type}
                onChange={(e) => setEw(i, 'type', e.target.value)}
              >
                {EWALLET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Nomor / ID"
                value={w.number}
                onChange={(e) => setEw(i, 'number', e.target.value)}
              />
              <input
                className="input"
                placeholder="Atas nama"
                value={w.name}
                onChange={(e) => setEw(i, 'name', e.target.value)}
              />
              <button
                className="btn-ghost px-2 text-red-600"
                onClick={() =>
                  setPay({
                    ...pay,
                    ewallets: pay.ewallets.filter((_, j) => j !== i),
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="label">Instruksi pembayaran (opsional)</label>
        <textarea
          className="input min-h-[70px]"
          placeholder="cth. Transfer sesuai nominal, lalu tekan 'Saya sudah membayar'. Simpan bukti transfer."
          value={pay.instructions || ''}
          onChange={(e) => setPay({ ...pay, instructions: e.target.value })}
        />
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            msg.type === 'ok'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.text}
        </div>
      )}
      <button className="btn-primary mt-4 w-full" onClick={save} disabled={busy}>
        {busy ? 'Menyimpan…' : 'Simpan Metode Pembayaran'}
      </button>
    </div>
  );
}

function PasswordCard() {
  const [f, setF] = useState({ cur: '', neu: '', conf: '' });
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (f.neu.length < 6)
      return setMsg({ type: 'err', text: 'Password baru minimal 6 karakter.' });
    if (f.neu !== f.conf)
      return setMsg({ type: 'err', text: 'Konfirmasi password tidak cocok.' });
    setBusy(true);
    try {
      await api.changePassword(f.cur, f.neu);
      setF({ cur: '', neu: '', conf: '' });
      setMsg({ type: 'ok', text: 'Password berhasil diubah. Sesi tetap aktif.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="mb-1 font-bold text-batik-900">Ubah Password Admin</h2>
      <p className="mb-4 text-xs text-batik-500">
        Password disimpan ter-enkripsi. Mengganti password mencabut akses sesi
        lain secara otomatis.
      </p>
      <div className="space-y-3">
        <div>
          <label className="label">Password saat ini</label>
          <input
            type="password"
            className="input"
            autoComplete="current-password"
            value={f.cur}
            onChange={(e) => setF({ ...f, cur: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Password baru (min. 6 karakter)</label>
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={f.neu}
            onChange={(e) => setF({ ...f, neu: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Ulangi password baru</label>
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={f.conf}
            onChange={(e) => setF({ ...f, conf: e.target.value })}
          />
        </div>
        {msg && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.type === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {msg.text}
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Menyimpan…' : 'Ubah Password'}
        </button>
      </div>
    </form>
  );
}

function SettingsAdmin() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.settings().then(setS).catch(() => {});
  }, []);

  async function save() {
    try {
      // Kirim hanya field yang dikelola kartu ini (payment punya kartu sendiri).
      await api.updateSettings({
        businessName: s.businessName,
        dpPercent: s.dpPercent,
        pickupOffsetDays: s.pickupOffsetDays,
      });
      setMsg('Pengaturan disimpan.');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PaymentSettingsCard />
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 font-bold text-batik-900">Pengaturan Rental</h2>
        {!s ? (
          <p className="text-batik-500">Memuat…</p>
        ) : (
          <div className="space-y-4">
        <div>
          <label className="label">Nama bisnis</label>
          <input
            className="input"
            value={s.businessName || ''}
            onChange={(e) => setS({ ...s, businessName: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Persentase DP (%)</label>
          <input
            type="number"
            className="input"
            value={s.dpPercent}
            onChange={(e) => setS({ ...s, dpPercent: e.target.value })}
          />
        </div>
        <div>
          <label className="label">
            Jeda pengambilan setelah pembayaran (hari)
          </label>
          <input
            type="number"
            className="input"
            value={s.pickupOffsetDays}
            onChange={(e) => setS({ ...s, pickupOffsetDays: e.target.value })}
          />
          <p className="mt-1 text-xs text-batik-400">
            Default 1 = pengambilan dimulai H+1 setelah pembayaran DP/lunas
            diverifikasi.
          </p>
        </div>
        <div className="rounded-lg bg-batik-50 px-3 py-2 text-sm text-batik-600">
          Mode pembayaran:{' '}
          {s.paymentGateway?.enabled ? (
            <b className="text-green-700">
              Midtrans QRIS ({s.paymentGateway.sandbox ? 'Sandbox' : 'Produksi'}) —
              otomatis
            </b>
          ) : (
            <b className="text-batik-800">
              Manual — QRIS statis (foto) + transfer bank/e-wallet
            </b>
          )}
        </div>
            {msg && <div className="text-sm text-batik-600">{msg}</div>}
            <button className="btn-primary w-full" onClick={save}>
              Simpan Pengaturan
            </button>
          </div>
        )}
          </div>
          <PasswordCard />
        </div>
      </div>
    </div>
  );
}
