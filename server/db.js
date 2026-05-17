'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// DATA_DIR bisa di-override (mis. arahkan ke volume/disk persisten saat deploy).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function id() {
  return crypto.randomUUID();
}

/** Foto pakaian adat (placeholder bertema dari Unsplash; bisa diganti via admin). */
function img(seed) {
  return `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=900&q=70`;
}

function seedProducts() {
  const data = [
    {
      name: 'Ulos Batak (Sumatera Utara)',
      province: 'Sumatera Utara',
      pricePerDay: 150000,
      stock: 5,
      description:
        'Kain tenun Ulos khas Batak yang sarat makna adat. Cocok untuk acara pernikahan dan upacara adat. Termasuk selendang dan aksesoris kepala.',
      images: ['photo-1583391733956-6c78276477e2', 'photo-1602810318383-e386cc2a3ccf', 'photo-1490481651871-ab68de25d43d'],
    },
    {
      name: 'Bundo Kanduang (Sumatera Barat)',
      province: 'Sumatera Barat',
      pricePerDay: 200000,
      stock: 4,
      description:
        'Busana adat Minangkabau lengkap dengan tingkuluak (penutup kepala bertanduk) dan kain songket emas yang megah.',
      images: ['photo-1595777457583-95e059d581b8', 'photo-1583391733981-3cc6c1f1f5e1', 'photo-1539109136881-3be0616acf4b'],
    },
    {
      name: 'Kebaya Encim Betawi (DKI Jakarta)',
      province: 'DKI Jakarta',
      pricePerDay: 120000,
      stock: 8,
      description:
        'Kebaya Encim Betawi dengan bordir bunga, dipadukan kain batik Betawi. Anggun untuk acara resmi maupun foto budaya.',
      images: ['photo-1610030469983-98e550d6193c', 'photo-1583391733975-b8e6b1a8f0c0', 'photo-1594633312681-425c7b97ccd1'],
    },
    {
      name: 'Kebaya & Beskap Jawa (Jawa Tengah)',
      province: 'Jawa Tengah',
      pricePerDay: 175000,
      stock: 6,
      description:
        'Set pasangan: kebaya brokat untuk wanita dan beskap dengan blangkon untuk pria, lengkap dengan jarik batik solo.',
      images: ['photo-1604004555489-723a93d6ce74', 'photo-1583391733956-6c78276477e2', 'photo-1591130901921-3f0652bb3915'],
    },
    {
      name: 'Pangsi & Kebaya Sunda (Jawa Barat)',
      province: 'Jawa Barat',
      pricePerDay: 140000,
      stock: 6,
      description:
        'Busana adat Sunda: pangsi hitam untuk pria dan kebaya Sunda untuk wanita, dengan totopong (ikat kepala) khas.',
      images: ['photo-1539109136881-3be0616acf4b', 'photo-1595777457583-95e059d581b8', 'photo-1610030469983-98e550d6193c'],
    },
    {
      name: 'Payas Agung Bali (Bali)',
      province: 'Bali',
      pricePerDay: 250000,
      stock: 3,
      description:
        'Payas Agung Bali yang mewah, busana pengantin adat Bali lengkap dengan mahkota emas (petitis) dan kain prada.',
      images: ['photo-1537953773345-d172ccf13cf1', 'photo-1518002171953-a080ee817e1f', 'photo-1604004555489-723a93d6ce74'],
    },
    {
      name: 'Baju Bodo (Sulawesi Selatan)',
      province: 'Sulawesi Selatan',
      pricePerDay: 130000,
      stock: 7,
      description:
        'Baju Bodo Bugis-Makassar, salah satu busana tertua di dunia, berbahan tipis transparan dengan warna cerah dan sarung sutera.',
      images: ['photo-1594633312681-425c7b97ccd1', 'photo-1583391733981-3cc6c1f1f5e1', 'photo-1539109136881-3be0616acf4b'],
    },
    {
      name: 'King Baba & King Bibinge (Kalimantan Barat)',
      province: 'Kalimantan Barat',
      pricePerDay: 220000,
      stock: 3,
      description:
        'Busana adat Dayak dari kulit kayu dan manik-manik, dilengkapi hiasan bulu enggang yang khas Kalimantan.',
      images: ['photo-1518002171953-a080ee817e1f', 'photo-1537953773345-d172ccf13cf1', 'photo-1602810318383-e386cc2a3ccf'],
    },
    {
      name: 'Ti’i Langga (Nusa Tenggara Timur)',
      province: 'Nusa Tenggara Timur',
      pricePerDay: 160000,
      stock: 4,
      description:
        'Busana adat Rote dengan topi Ti’i Langga berbentuk khas dan kain tenun ikat NTT yang berwarna alami.',
      images: ['photo-1490481651871-ab68de25d43d', 'photo-1595777457583-95e059d581b8', 'photo-1591130901921-3f0652bb3915'],
    },
    {
      name: 'Koteka & Rok Rumbai (Papua)',
      province: 'Papua',
      pricePerDay: 145000,
      stock: 5,
      description:
        'Busana adat Papua untuk pertunjukan budaya, lengkap dengan hiasan kepala bulu burung cenderawasih (replika) dan aksesoris manik.',
      images: ['photo-1602810318383-e386cc2a3ccf', 'photo-1537953773345-d172ccf13cf1', 'photo-1490481651871-ab68de25d43d'],
    },
    {
      name: 'Aesan Gede (Sumatera Selatan)',
      province: 'Sumatera Selatan',
      pricePerDay: 230000,
      stock: 3,
      description:
        'Busana pengantin Palembang Aesan Gede dengan dominasi merah-emas, songket lepus, dan mahkota Aesan yang berkilau.',
      images: ['photo-1583391733981-3cc6c1f1f5e1', 'photo-1604004555489-723a93d6ce74', 'photo-1518002171953-a080ee817e1f'],
    },
    {
      name: 'Baju Cele (Maluku)',
      province: 'Maluku',
      pricePerDay: 125000,
      stock: 6,
      description:
        'Baju Cele khas Maluku dengan motif garis geometris dan kain salele, busana adat untuk acara penting dan tari-tarian.',
      images: ['photo-1591130901921-3f0652bb3915', 'photo-1594633312681-425c7b97ccd1', 'photo-1583391733956-6c78276477e2'],
    },
  ];

  return data.map((p) => ({
    id: id(),
    category: 'Pakaian Adat',
    ...p,
    images: p.images.map(img),
    active: true,
    createdAt: new Date().toISOString(),
  }));
}

/** Daftar kategori bawaan — admin bisa menambah kategori baru lewat form
 *  (mis. "Gaun & Kebaya Modern", "Jas & Formal", "Kostum") agar ke depan
 *  butik bisa menyewakan pakaian non-tradisional di aplikasi yang sama. */
const DEFAULT_CATEGORIES = [
  'Pakaian Adat',
  'Gaun & Kebaya Modern',
  'Jas & Formal',
  'Kostum & Cosplay',
  'Lainnya',
];

function defaultData() {
  return {
    products: seedProducts(),
    customers: [],
    bookings: [],
    settings: {
      dpPercent: Number(process.env.DEFAULT_DP_PERCENT || 50),
      pickupOffsetDays: 1, // pengambilan = tanggal lunas/DP + 1 hari
      businessName: 'Galleri Nusantara',
      categories: DEFAULT_CATEGORIES,
      payment: {
        qrisImage: '', // foto QRIS statis (path /uploads/...)
        qrisName: '', // nama merchant di QRIS (opsional, ditampilkan)
        banks: [], // [{ id, bank, accountNumber, accountName }]
        ewallets: [], // [{ id, type, number, name }]  type: OVO|GoPay|ShopeePay|DANA|Lainnya
        instructions: '',
      },
    },
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      cache = defaultData();
      save();
    }
  } else {
    cache = defaultData();
    save();
  }
  migrate(cache);
  return cache;
}

/** Backfill data lama agar fitur baru (kategori) tetap jalan. */
function migrate(db) {
  let changed = false;
  if (!db.settings) db.settings = {};
  if (!Array.isArray(db.settings.categories) || db.settings.categories.length === 0) {
    db.settings.categories = DEFAULT_CATEGORIES;
    changed = true;
  }
  for (const p of db.products || []) {
    if (!p.category) {
      p.category = 'Pakaian Adat';
      changed = true;
    }
  }
  if (!db.settings.payment || typeof db.settings.payment !== 'object') {
    db.settings.payment = {
      qrisImage: '',
      qrisName: '',
      banks: [],
      ewallets: [],
      instructions: '',
    };
    changed = true;
  } else {
    const p = db.settings.payment;
    if (typeof p.qrisImage !== 'string') (p.qrisImage = ''), (changed = true);
    if (typeof p.qrisName !== 'string') (p.qrisName = ''), (changed = true);
    if (!Array.isArray(p.banks)) (p.banks = []), (changed = true);
    if (!Array.isArray(p.ewallets)) (p.ewallets = []), (changed = true);
    if (typeof p.instructions !== 'string') (p.instructions = ''), (changed = true);
  }
  if (changed) save();
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

module.exports = { load, save, id };
