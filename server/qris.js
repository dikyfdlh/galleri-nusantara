'use strict';

/**
 * Mesin QRIS dinamis.
 *
 * QRIS mengikuti standar EMVCo Merchant-Presented QR (TLV: Tag-Length-Value).
 * Dari sebuah QRIS STATIS milik merchant, kita bisa membuat QRIS DINAMIS dengan:
 *   - Tag 01 (Point of Initiation Method): "11" (statis) -> "12" (dinamis)
 *   - Tag 54 (Transaction Amount): disisipkan sesuai nominal
 *   - Tag 63 (CRC): dihitung ulang (CRC-16/CCITT-FALSE)
 *
 * Referensi: EMV QRCPS & Spesifikasi QRIS (ASPI / Bank Indonesia).
 */

/** CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflect, xorout 0x0000.
 *  Dihitung atas byte UTF-8 (sesuai spesifikasi EMVCo). */
function crc16(str) {
  const bytes = Buffer.from(str, 'utf8');
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Parse TLV level atas menjadi list { tag, value } dengan urutan asli. */
function parseTLV(payload) {
  const out = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.substring(i, i + 2);
    const len = parseInt(payload.substring(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const value = payload.substring(i + 4, i + 4 + len);
    out.push({ tag, value });
    i += 4 + len;
  }
  return out;
}

function tlv(tag, value) {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Ubah QRIS statis menjadi dinamis dengan nominal tertentu.
 * @param {string} baseString QRIS statis (mulai "00020101...")
 * @param {number} amount nominal dalam Rupiah (integer)
 * @returns {string} payload QRIS dinamis lengkap dengan CRC
 */
function makeDynamicQris(baseString, amount) {
  const clean = String(baseString).trim().replace(/\s+/g, '');
  const items = parseTLV(clean).filter((it) => it.tag !== '63');

  const map = new Map();
  for (const it of items) map.set(it.tag, it.value);

  // Point of Initiation Method -> dinamis
  map.set('01', '12');
  // Transaction Amount (tanpa pemisah ribuan, tanpa desimal untuk Rupiah)
  map.set('54', String(Math.round(amount)));

  // Susun ulang dengan tag terurut menaik (sesuai praktik EMVCo)
  const sortedTags = [...map.keys()].sort((a, b) => Number(a) - Number(b));
  let payload = '';
  for (const tag of sortedTags) payload += tlv(tag, map.get(tag));

  payload += '6304';
  payload += crc16(payload);
  return payload;
}

/**
 * Payload DEMO bila merchant belum mengisi QRIS_BASE_STRING.
 * Tetap valid secara struktur EMVCo & memuat nominal, namun tidak terhubung ke
 * rekening manapun (tidak bisa dipakai membayar sungguhan).
 */
function makeDemoQris(amount, merchantName, merchantCity) {
  const name = (merchantName || 'GALLERI NUSANTARA').toUpperCase().substring(0, 25);
  const city = (merchantCity || 'JAKARTA').toUpperCase().substring(0, 15);

  // Merchant Account Information (tag 26) — domain demo, NMID dummy
  const acc =
    tlv('00', 'ID.DEMO.WWW') +
    tlv('01', 'DEMOMERCHANT0000000000000') +
    tlv('02', 'ID1024000000000') +
    tlv('03', 'UMI');

  let payload = '';
  payload += tlv('00', '01'); // Payload Format Indicator
  payload += tlv('01', '12'); // Dinamis
  payload += tlv('26', acc); // Merchant Account Information
  payload += tlv('52', '0000'); // Merchant Category Code
  payload += tlv('53', '360'); // Currency = IDR
  payload += tlv('54', String(Math.round(amount))); // Amount
  payload += tlv('58', 'ID'); // Country
  payload += tlv('59', name); // Merchant Name
  payload += tlv('60', city); // Merchant City
  payload += '6304';
  payload += crc16(payload);
  return payload;
}

/**
 * Bangun payload QRIS final + info apakah ini DEMO atau merchant sungguhan.
 */
function buildQrisPayload(amount, { baseString, merchantName, merchantCity }) {
  if (baseString && baseString.trim().length > 10) {
    try {
      return { payload: makeDynamicQris(baseString, amount), demo: false };
    } catch (e) {
      // jika base string tidak valid, jatuh ke demo
    }
  }
  return {
    payload: makeDemoQris(amount, merchantName, merchantCity),
    demo: true,
  };
}

module.exports = { crc16, parseTLV, makeDynamicQris, makeDemoQris, buildQrisPayload };
