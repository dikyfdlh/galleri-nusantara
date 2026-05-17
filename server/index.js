'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const { load, save, id } = require('./db');
const gateway = require('./gateway');

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---- Uploads ----
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /image\/(png|jpe?g|webp|gif)/.test(file.mimetype)),
});

// ---- Admin auth ----
// Token stateless = HMAC(ADMIN_SECRET, materi-password-efektif).
// Password efektif: hash tersimpan di db (bila admin pernah ganti via panel),
// jika belum -> ADMIN_PASSWORD dari .env. Token otomatis berubah saat password
// berubah, dan tetap valid walau server di-restart (selama password sama).
const ADMIN_SECRET =
  (process.env.ADMIN_SECRET || '').trim() ||
  crypto.createHash('sha256').update('gn-secret:' + ADMIN_PASSWORD).digest('hex');

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const dk = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return `${salt}:${dk}`;
}

function verifyAgainstHash(pw, stored) {
  const [salt, dk] = String(stored).split(':');
  if (!salt || !dk) return false;
  const calc = crypto.scryptSync(String(pw), salt, 32);
  const dkBuf = Buffer.from(dk, 'hex');
  return dkBuf.length === calc.length && crypto.timingSafeEqual(dkBuf, calc);
}

/** Materi rahasia untuk menurunkan token (tanpa mengekspos password). */
function secretMaterial(db) {
  const stored = db.settings && db.settings.adminPasswordHash;
  return stored ? 'hash:' + stored : 'env:' + ADMIN_PASSWORD;
}

function currentToken(db) {
  return crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update('gn-admin:' + secretMaterial(db))
    .digest('hex');
}

function verifyPassword(db, input) {
  const stored = db.settings && db.settings.adminPasswordHash;
  if (stored) return verifyAgainstHash(input, stored);
  return timingSafeEqual(input, ADMIN_PASSWORD);
}

function requireAdmin(req, res, next) {
  const db = load();
  const t = req.headers['x-admin-token'];
  if (t && timingSafeEqual(t, currentToken(db))) return next();
  return res.status(401).json({ error: 'Akses admin diperlukan' });
}

app.post('/api/admin/login', (req, res) => {
  const db = load();
  const password = (req.body && req.body.password) || '';
  if (verifyPassword(db, password)) return res.json({ token: currentToken(db) });
  res.status(401).json({ error: 'Password salah' });
});

// Verifikasi token admin (dipakai dashboard sebelum menampilkan apa pun).
app.get('/api/admin/verify', requireAdmin, (req, res) => res.json({ ok: true }));

// Ganti password admin (disimpan ter-hash di db). Token ikut berputar.
app.post('/api/admin/password', requireAdmin, (req, res) => {
  const db = load();
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyPassword(db, currentPassword || ''))
    return res.status(400).json({ error: 'Password saat ini salah' });
  const np = String(newPassword || '');
  if (np.length < 6)
    return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
  if (timingSafeEqual(np, currentPassword || ''))
    return res.status(400).json({ error: 'Password baru harus berbeda' });
  db.settings.adminPasswordHash = hashPassword(np);
  save();
  // Kembalikan token baru agar sesi admin tetap aktif tanpa login ulang.
  res.json({ ok: true, token: currentToken(db) });
});

// =================== CUSTOMERS ===================
// Nama & nomor telepon wajib; email opsional.
app.post('/api/customers', (req, res) => {
  const db = load();
  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  const email = (req.body.email || '').trim();

  if (!name) return res.status(400).json({ error: 'Nama wajib diisi' });
  if (!phone) return res.status(400).json({ error: 'Nomor telepon wajib diisi' });

  let cust = db.customers.find((c) => c.phone === phone);
  if (cust) {
    cust.name = name;
    if (email) cust.email = email;
  } else {
    cust = { id: id(), name, phone, email: email || '', createdAt: new Date().toISOString() };
    db.customers.push(cust);
  }
  save();
  res.json(cust);
});

// =================== PRODUCTS ===================
app.get('/api/products', (req, res) => {
  const db = load();
  const includeInactive = req.query.all === '1';
  const list = db.products
    .filter((p) => includeInactive || p.active !== false)
    .map((p) => ({ ...p, available: availableStock(db, p) }));
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  res.json({ ...p, available: availableStock(db, p) });
});

/** Simpan kategori baru ke daftar agar muncul di saran (datalist). */
function registerCategory(db, cat) {
  if (!cat) return;
  if (!Array.isArray(db.settings.categories)) db.settings.categories = [];
  if (!db.settings.categories.includes(cat)) db.settings.categories.push(cat);
}

app.post('/api/products', requireAdmin, (req, res) => {
  const db = load();
  const b = req.body || {};
  const p = {
    id: id(),
    name: (b.name || 'Pakaian Baru').trim(),
    category: (b.category || 'Pakaian Adat').trim(),
    province: (b.province || '').trim(),
    pricePerDay: Math.max(0, Number(b.pricePerDay) || 0),
    stock: Math.max(0, parseInt(b.stock, 10) || 0),
    description: (b.description || '').trim(),
    images: Array.isArray(b.images) ? b.images : [],
    active: true,
    createdAt: new Date().toISOString(),
  };
  registerCategory(db, p.category);
  db.products.push(p);
  save();
  res.json(p);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  const b = req.body || {};
  if (b.name !== undefined) p.name = String(b.name).trim();
  if (b.category !== undefined) p.category = String(b.category).trim() || 'Pakaian Adat';
  if (b.province !== undefined) p.province = String(b.province).trim();
  if (b.pricePerDay !== undefined) p.pricePerDay = Math.max(0, Number(b.pricePerDay) || 0);
  if (b.stock !== undefined) p.stock = Math.max(0, parseInt(b.stock, 10) || 0);
  if (b.description !== undefined) p.description = String(b.description).trim();
  if (b.images !== undefined && Array.isArray(b.images)) p.images = b.images;
  if (b.active !== undefined) p.active = !!b.active;
  registerCategory(db, p.category);
  save();
  res.json(p);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = load();
  const idx = db.products.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  db.products.splice(idx, 1);
  save();
  res.json({ ok: true });
});

app.post('/api/products/:id/images', requireAdmin, upload.array('images', 8), (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
  p.images = [...(p.images || []), ...urls];
  save();
  res.json(p);
});

app.delete('/api/products/:id/images', requireAdmin, (req, res) => {
  const db = load();
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan' });
  const url = req.body.url;
  p.images = (p.images || []).filter((u) => u !== url);
  save();
  res.json(p);
});

// =================== BOOKINGS ===================
const HOLDING_STATES = ['awaiting_payment', 'verifying', 'paid_dp', 'verifying_settlement', 'paid_full', 'picked_up'];

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Format Date -> 'YYYY-MM-DD' memakai komponen lokal (hindari pergeseran UTC). */
function ymd(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function bookingEnd(startDate, days) {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + Math.max(1, days) - 1);
  return ymd(d);
}

/** Stok tersisa produk pada rentang tertentu (atau total bila tanpa rentang). */
function availableStock(db, product, startDate, days) {
  if (!startDate) {
    const held = db.bookings.filter(
      (bk) => bk.productId === product.id && HOLDING_STATES.includes(bk.status)
    ).length;
    return Math.max(0, product.stock - held);
  }
  const end = bookingEnd(startDate, days);
  const overlapping = db.bookings.filter(
    (bk) =>
      bk.productId === product.id &&
      HOLDING_STATES.includes(bk.status) &&
      rangesOverlap(startDate, end, bk.startDate, bookingEnd(bk.startDate, bk.days))
  ).length;
  return Math.max(0, product.stock - overlapping);
}

/** Jadwal pengambilan = max(tanggal diminta, hari ini + offset hari). */
function computePickup(db, b) {
  const offset = db.settings.pickupOffsetDays ?? 1;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + offset);
  const requested = new Date(b.startDate + 'T00:00:00');
  return ymd(base > requested ? base : requested);
}

/**
 * Terapkan pembayaran yang sudah terbukti (oleh admin manual ATAU gateway).
 * settlement=true berarti pelunasan sisa setelah DP.
 */
function applyVerifiedPayment(db, b, { settlement, by, note }) {
  if (settlement) {
    b.amountPaid = b.total;
    b.status = 'paid_full';
  } else if (b.paymentType === 'full') {
    b.amountPaid = b.total;
    b.status = 'paid_full';
  } else {
    b.amountPaid = b.dpAmount;
    b.status = 'paid_dp';
  }
  b.pickupDate = computePickup(db, b);
  b.payments.push({ at: new Date().toISOString(), by: by || 'system', note });
}

/**
 * Sinkronisasi status transaksi gateway untuk satu booking (dipanggil saat
 * frontend polling GET booking). Aman bila gateway nonaktif / tidak ada charge.
 */
async function syncGateway(db, b) {
  if (!gateway.isEnabled()) return false;
  const g = b.gateway;
  if (!g || g.status !== 'pending') return false;
  if (!['awaiting_payment', 'awaiting_settlement'].includes(b.status)) return false;
  // throttle: jangan tanya Midtrans lebih sering dari 4 detik sekali
  if (g.lastSyncAt && Date.now() - new Date(g.lastSyncAt).getTime() < 4000) return false;
  g.lastSyncAt = new Date().toISOString();
  try {
    const st = await gateway.getTransactionStatus(g.orderId);
    const mapped = gateway.mapStatus(st.transaction_status, st.fraud_status);
    if (mapped === 'paid') {
      g.status = 'paid';
      applyVerifiedPayment(db, b, {
        settlement: g.stage === 'settlement',
        by: 'midtrans',
        note: `Pembayaran QRIS terkonfirmasi otomatis (Midtrans, ${g.orderId})`,
      });
      save();
      return true;
    }
    if (mapped === 'failed') {
      g.status = 'failed';
      save();
    }
  } catch {
    /* abaikan error sinkronisasi sementara */
  }
  return false;
}

app.post('/api/bookings', (req, res) => {
  const db = load();
  const { customerId, productId, startDate, days, paymentType } = req.body || {};
  const cust = db.customers.find((c) => c.id === customerId);
  const prod = db.products.find((p) => p.id === productId);
  if (!cust) return res.status(400).json({ error: 'Pelanggan tidak dikenal, silakan masuk ulang' });
  if (!prod) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  const d = Math.max(1, parseInt(days, 10) || 1);
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    return res.status(400).json({ error: 'Tanggal sewa tidak valid' });

  // Tanggal mulai minimal besok (pengambilan = pembayaran + 1 hari)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minStart = new Date(today);
  minStart.setDate(minStart.getDate() + 1);
  if (new Date(startDate + 'T00:00:00') < minStart)
    return res.status(400).json({ error: 'Tanggal mulai paling cepat besok' });

  if (availableStock(db, prod, startDate, d) <= 0)
    return res.status(409).json({ error: 'Stok tidak tersedia untuk tanggal tersebut' });

  const total = prod.pricePerDay * d;
  const pt = paymentType === 'full' ? 'full' : 'dp';
  const dpPercent = db.settings.dpPercent || 50;
  const dpAmount = Math.round((total * dpPercent) / 100);

  const booking = {
    id: id(),
    code: 'GN-' + Date.now().toString(36).toUpperCase().slice(-6),
    customerId,
    customer: { name: cust.name, phone: cust.phone, email: cust.email },
    productId,
    productName: prod.name,
    productImage: (prod.images || [])[0] || '',
    startDate,
    days: d,
    endDate: bookingEnd(startDate, d),
    pricePerDay: prod.pricePerDay,
    total,
    paymentType: pt,
    dpPercent,
    dpAmount,
    amountDue: pt === 'full' ? total : dpAmount, // jumlah yang harus dibayar sekarang
    amountPaid: 0,
    status: 'awaiting_payment',
    pickupDate: null,
    payments: [],
    createdAt: new Date().toISOString(),
  };
  db.bookings.push(booking);
  save();
  res.json(booking);
});

app.get('/api/bookings', (req, res) => {
  const db = load();
  const { customerId } = req.query;
  let list = db.bookings;
  if (customerId) list = list.filter((b) => b.customerId === customerId);
  res.json(list.slice().reverse());
});

app.get('/api/bookings/:id', async (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  await syncGateway(db, b); // konfirmasi otomatis bila sudah dibayar (Midtrans)
  res.json(b);
});

// Webhook HTTP Notification dari Midtrans (produksi). Konfirmasi otomatis.
app.post('/api/webhook/midtrans', (req, res) => {
  const notif = req.body || {};
  if (!gateway.verifyNotificationSignature(notif)) {
    return res.status(403).json({ error: 'Signature tidak valid' });
  }
  const db = load();
  const b = db.bookings.find((x) => x.gateway && x.gateway.orderId === notif.order_id);
  if (!b) return res.status(200).json({ ok: true, note: 'booking tidak ditemukan' });

  const mapped = gateway.mapStatus(notif.transaction_status, notif.fraud_status);
  if (mapped === 'paid' && b.gateway.status !== 'paid') {
    b.gateway.status = 'paid';
    if (['awaiting_payment', 'awaiting_settlement'].includes(b.status)) {
      applyVerifiedPayment(db, b, {
        settlement: b.gateway.stage === 'settlement',
        by: 'midtrans',
        note: `Pembayaran QRIS terkonfirmasi via webhook (${notif.order_id})`,
      });
    }
    save();
  } else if (mapped === 'failed') {
    b.gateway.status = 'failed';
    save();
  }
  res.status(200).json({ ok: true });
});

// Hasilkan QRIS untuk tagihan yang sedang berjalan (DP/lunas/pelunasan)
app.post('/api/bookings/:id/qris', async (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  let amount;
  let stage;
  if (b.status === 'awaiting_payment') {
    amount = b.amountDue;
    stage = b.paymentType === 'full' ? 'full' : 'dp';
  } else if (b.status === 'awaiting_settlement') {
    amount = b.total - b.amountPaid;
    stage = 'settlement';
  } else {
    return res.status(400).json({ error: 'Tidak ada tagihan aktif untuk pesanan ini' });
  }

  // --- Mode Payment Gateway (Midtrans): QRIS dinamis + konfirmasi otomatis ---
  if (gateway.isEnabled()) {
    try {
      const orderId = `${b.code}-${stage}-${Date.now().toString(36)}`.toUpperCase();
      const charge = await gateway.createQrisCharge({
        orderId,
        amount,
        itemName: b.productName,
        customer: b.customer,
      });
      b.gateway = {
        provider: 'midtrans',
        orderId,
        stage,
        amount,
        status: 'pending',
        qrImageUrl: charge.qrImageUrl,
        qrString: charge.qrString,
        transactionId: charge.transactionId,
        createdAt: new Date().toISOString(),
        lastSyncAt: null,
      };
      save();
      return res.json({
        gateway: true,
        provider: 'midtrans',
        amount,
        qrImageUrl: charge.qrImageUrl,
        qrString: charge.qrString,
        orderId,
        autoConfirm: true,
        expiresInMinutes: 15,
      });
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
  }

  // --- Mode MANUAL: QRIS statis (foto) + transfer bank / e-wallet ---
  // Pelanggan bayar lalu klik "Saya sudah membayar"; admin verifikasi.
  const pay = db.settings.payment || {};
  const banks = pay.banks || [];
  const ewallets = pay.ewallets || [];
  const configured = !!(pay.qrisImage || banks.length || ewallets.length);
  res.json({
    mode: 'manual',
    gateway: false,
    autoConfirm: false,
    amount,
    qrisImage: pay.qrisImage || '',
    qrisName: pay.qrisName || db.settings.businessName || '',
    banks,
    ewallets,
    instructions: pay.instructions || '',
    configured,
  });
});

// Pelanggan menyatakan sudah membayar -> menunggu verifikasi admin
app.post('/api/bookings/:id/paid', (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  if (b.status === 'awaiting_payment') {
    b.status = 'verifying';
  } else if (b.status === 'awaiting_settlement') {
    b.status = 'verifying_settlement';
  } else {
    return res.status(400).json({ error: 'Status pesanan tidak menunggu pembayaran' });
  }
  b.payments.push({
    at: new Date().toISOString(),
    by: 'customer',
    note: 'Pelanggan menyatakan sudah membayar (QRIS)',
  });
  save();
  res.json(b);
});

// Pelanggan memilih melunasi sisa (setelah DP) -> buka tagihan pelunasan
app.post('/api/bookings/:id/settle', (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  if (b.status !== 'paid_dp')
    return res.status(400).json({ error: 'Pelunasan hanya untuk pesanan yang sudah membayar DP' });
  b.status = 'awaiting_settlement';
  save();
  res.json(b);
});

// Admin verifikasi pembayaran -> hitung jadwal pengambilan (pembayaran + offset hari)
app.post('/api/bookings/:id/verify', requireAdmin, (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

  if (b.status === 'verifying') {
    applyVerifiedPayment(db, b, { by: 'admin', note: 'Pembayaran diverifikasi admin' });
  } else if (b.status === 'verifying_settlement') {
    applyVerifiedPayment(db, b, {
      settlement: true,
      by: 'admin',
      note: 'Pelunasan diverifikasi admin',
    });
  } else {
    return res.status(400).json({ error: 'Pesanan tidak sedang menunggu verifikasi' });
  }
  save();
  res.json(b);
});

app.post('/api/bookings/:id/status', requireAdmin, (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
  const allowed = ['picked_up', 'returned', 'cancelled', 'rejected'];
  const s = req.body.status;
  if (!allowed.includes(s)) return res.status(400).json({ error: 'Status tidak valid' });
  b.status = s;
  b.payments.push({ at: new Date().toISOString(), by: 'admin', note: `Status diubah: ${s}` });
  save();
  res.json(b);
});

// =================== SETTINGS ===================
function publicSettings(db) {
  const { adminPasswordHash, ...rest } = db.settings || {};
  return { ...rest, passwordIsCustom: !!adminPasswordHash };
}

app.get('/api/settings', (req, res) => {
  const db = load();
  res.json({
    ...publicSettings(db),
    qrisConfigured: !!(process.env.QRIS_BASE_STRING || '').trim(),
    paymentGateway: gateway.publicConfig(),
  });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const db = load();
  const b = req.body || {};
  if (b.dpPercent !== undefined)
    db.settings.dpPercent = Math.min(100, Math.max(1, parseInt(b.dpPercent, 10) || 50));
  if (b.pickupOffsetDays !== undefined)
    db.settings.pickupOffsetDays = Math.max(0, parseInt(b.pickupOffsetDays, 10) || 1);
  if (b.businessName !== undefined) db.settings.businessName = String(b.businessName).trim();

  if (b.payment && typeof b.payment === 'object') {
    const pin = b.payment;
    const pay = db.settings.payment || (db.settings.payment = {});
    if (pin.qrisName !== undefined) pay.qrisName = String(pin.qrisName).trim();
    if (pin.instructions !== undefined)
      pay.instructions = String(pin.instructions).slice(0, 1000);
    if (Array.isArray(pin.banks)) {
      pay.banks = pin.banks
        .map((x) => ({
          id: x.id || id(),
          bank: String(x.bank || '').trim(),
          accountNumber: String(x.accountNumber || '').trim(),
          accountName: String(x.accountName || '').trim(),
        }))
        .filter((x) => x.bank || x.accountNumber);
    }
    if (Array.isArray(pin.ewallets)) {
      pay.ewallets = pin.ewallets
        .map((x) => ({
          id: x.id || id(),
          type: String(x.type || 'Lainnya').trim(),
          number: String(x.number || '').trim(),
          name: String(x.name || '').trim(),
        }))
        .filter((x) => x.number);
    }
  }

  save();
  res.json(publicSettings(db));
});

// Unggah / hapus foto QRIS statis (admin).
app.post('/api/settings/qris-image', requireAdmin, upload.single('image'), (req, res) => {
  const db = load();
  if (!req.file) return res.status(400).json({ error: 'File gambar tidak ada' });
  if (!db.settings.payment) db.settings.payment = {};
  db.settings.payment.qrisImage = `/uploads/${req.file.filename}`;
  save();
  res.json(publicSettings(db));
});

app.delete('/api/settings/qris-image', requireAdmin, (req, res) => {
  const db = load();
  if (db.settings.payment) db.settings.payment.qrisImage = '';
  save();
  res.json(publicSettings(db));
});

// ---- Serve client build bila ada (mode produksi) ----
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`\n  Galleri Nusantara API berjalan di http://localhost:${PORT}`);
  if (gateway.isEnabled()) {
    const g = gateway.publicConfig();
    console.log(`  Pembayaran: Midtrans QRIS (${g.sandbox ? 'SANDBOX' : 'PRODUKSI'}) — konfirmasi otomatis`);
  } else {
    console.log('  Pembayaran: MANUAL — QRIS statis (foto) + transfer bank/e-wallet, atur di /admin → Pengaturan');
  }
  console.log(`  Admin password: ${ADMIN_PASSWORD}\n`);
});
