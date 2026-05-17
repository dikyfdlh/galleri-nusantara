'use strict';

/**
 * Integrasi payment gateway Midtrans (Core API) untuk QRIS dinamis.
 *
 * Alur:
 *   1. createQrisCharge() -> POST /v2/charge (payment_type: qris)
 *      Midtrans balas QR image + qr_string. Uang masuk ke rekening settlement
 *      merchant yang terdaftar di akun Midtrans (T+1 ke rekening bank pemilik).
 *   2. Pelanggan scan & bayar pakai aplikasi apa pun yang mendukung QRIS.
 *   3. Konfirmasi otomatis lewat:
 *        a. Webhook HTTP Notification dari Midtrans (produksi), ATAU
 *        b. getTransactionStatus() — polling status dari server kita
 *           (andal untuk localhost / tanpa URL publik).
 *
 * Dokumen: https://docs.midtrans.com/reference/qris
 */

const crypto = require('crypto');

function cfg() {
  const provider = (process.env.PAYMENT_GATEWAY || '').trim().toLowerCase();
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  const isProd = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';
  return {
    enabled: provider === 'midtrans' && serverKey.length > 0,
    serverKey,
    clientKey: (process.env.MIDTRANS_CLIENT_KEY || '').trim(),
    isProd,
    base: isProd ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com',
  };
}

function isEnabled() {
  return cfg().enabled;
}

function authHeader(serverKey) {
  // Basic auth: username = ServerKey, password kosong
  return 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
}

/**
 * Buat transaksi QRIS di Midtrans.
 * @returns {Promise<{orderId,qrImageUrl,qrString,raw}>}
 */
async function createQrisCharge({ orderId, amount, itemName, customer }) {
  const c = cfg();
  if (!c.enabled) throw new Error('Midtrans belum dikonfigurasi');

  const gross = Math.round(amount);
  const body = {
    payment_type: 'qris',
    transaction_details: { order_id: orderId, gross_amount: gross },
    qris: { acquirer: 'gopay' },
    item_details: [
      { id: 'sewa', price: gross, quantity: 1, name: String(itemName || 'Rental').slice(0, 50) },
    ],
    customer_details: {
      first_name: (customer?.name || 'Pelanggan').slice(0, 50),
      phone: (customer?.phone || '').slice(0, 20),
      email: customer?.email || undefined,
    },
  };

  const res = await fetch(`${c.base}/v2/charge`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(c.serverKey),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.status_code && Number(data.status_code) >= 400)) {
    throw new Error(
      `Midtrans gagal membuat QRIS: ${data.status_message || res.status} ${
        (data.validation_messages || []).join('; ')
      }`
    );
  }

  const actions = data.actions || [];
  const qrAction =
    actions.find((a) => a.name === 'generate-qr-code') || actions.find((a) => /qr/.test(a.name));

  return {
    orderId,
    qrImageUrl: qrAction ? qrAction.url : null,
    qrString: data.qr_string || null,
    transactionId: data.transaction_id || null,
    raw: data,
  };
}

/** Ambil status transaksi dari Midtrans (untuk sinkronisasi server). */
async function getTransactionStatus(orderId) {
  const c = cfg();
  if (!c.enabled) throw new Error('Midtrans belum dikonfigurasi');
  const res = await fetch(`${c.base}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: authHeader(c.serverKey) },
  });
  return res.json().catch(() => ({}));
}

/**
 * Petakan status Midtrans -> status internal: 'paid' | 'pending' | 'failed'.
 */
function mapStatus(transactionStatus, fraudStatus) {
  const t = transactionStatus;
  if (t === 'capture') return fraudStatus === 'challenge' ? 'pending' : 'paid';
  if (t === 'settlement') return 'paid';
  if (t === 'pending') return 'pending';
  if (['deny', 'cancel', 'expire', 'failure'].includes(t)) return 'failed';
  return 'pending';
}

/**
 * Verifikasi signature webhook Midtrans:
 * sha512(order_id + status_code + gross_amount + ServerKey)
 */
function verifyNotificationSignature(notif) {
  const c = cfg();
  if (!c.serverKey) return false;
  const expected = crypto
    .createHash('sha512')
    .update(
      String(notif.order_id) +
        String(notif.status_code) +
        String(notif.gross_amount) +
        c.serverKey
    )
    .digest('hex');
  return expected === notif.signature_key;
}

function publicConfig() {
  const c = cfg();
  return { enabled: c.enabled, provider: c.enabled ? 'midtrans' : null, sandbox: !c.isProd };
}

module.exports = {
  isEnabled,
  createQrisCharge,
  getTransactionStatus,
  mapStatus,
  verifyNotificationSignature,
  publicConfig,
};
