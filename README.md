# Galleri Nusantara — Rental Pakaian

Aplikasi web rental pakaian (pakaian adat & kategori lain) dengan katalog,
penjadwalan lewat **kalender**, **pembayaran QRIS statis + transfer bank/e-wallet**,
dan **panel admin** terproteksi.

- Frontend: React + Vite + Tailwind (`client/`)
- Backend: Node.js + Express (`server/`)
- Satu proses Node menyajikan API **dan** tampilan web sekaligus saat produksi.

---

## 1. Fitur

- **Halaman Masuk** — isi nama, nomor telepon, email. Hanya **nama** & **nomor
  telepon** yang wajib.
- **Katalog** — produk dari berbagai kategori (Pakaian Adat, Gaun & Kebaya
  Modern, Jas & Formal, Kostum, dll — kategori bisa ditambah sendiri). Tiap
  produk punya **galeri foto (carousel)**, stok, harga/hari, deskripsi,
  provinsi/asal. Ada filter kategori & pencarian.
- **Penyewaan dengan kalender** — pilih tanggal mulai & lama sewa; stok dicek
  per rentang tanggal; pilih **DP** (persentase) atau **Lunas**.
- **Pembayaran** — nominal (DP/Lunas/pelunasan) dihitung otomatis, lalu
  ditampilkan: **foto QRIS statis**, daftar **rekening bank** & **e-wallet**
  (OVO/GoPay/ShopeePay/DANA/LinkAja) berikut tombol salin. Pelanggan menekan
  **"Saya sudah membayar"**, admin memverifikasi. *(Opsional: Midtrans untuk
  konfirmasi otomatis — lihat bagian 4.)*
- **Jadwal pengambilan otomatis** — dimulai **H+1 setelah pembayaran
  diverifikasi** (jeda hari bisa diatur).
- **Panel admin** (`/admin`) — terproteksi password (token diverifikasi server,
  tahan restart). Kelola katalog & stok (tambah/edit/hapus via dialog di tengah
  layar), unggah foto, atur metode pembayaran, verifikasi pembayaran, ubah
  status pesanan, atur persentase DP & jeda pengambilan, ganti password.
- **Responsif** — nyaman di HP, tablet, dan desktop.

---

## 2. Menjalankan di Komputer (development)

Prasyarat: **Node.js 18+**.

```bash
npm run install-all      # pasang dependensi root + server + client
npm run dev              # jalankan server + client bersamaan
```

- Aplikasi pelanggan: <http://localhost:5173>
- API server: <http://localhost:4000>
- Admin: <http://localhost:5173/admin> (password default `admin123`)

Untuk uji mode produksi di lokal:

```bash
npm run build            # build frontend ke client/dist
npm start                # 1 proses di http://localhost:4000 (web + API)
```

---

## 3. Konfigurasi (`.env`)

Salin contoh lalu sunting:

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/Mac
```

| Variabel | Fungsi |
|---|---|
| `PORT` | Port server (default `4000`). |
| `NODE_ENV` | Set `production` saat live. |
| `ADMIN_PASSWORD` | **Password panel admin. WAJIB diganti sebelum live.** |
| `ADMIN_SECRET` | Kunci rahasia penanda token admin. Isi acak: `openssl rand -hex 32`. |
| `DATA_DIR` | Lokasi database (`db.json`). Kosong = `server/data`. |
| `UPLOAD_DIR` | Lokasi foto upload. Kosong = `server/uploads`. |
| `PAYMENT_GATEWAY`, `MIDTRANS_*` | Opsional — aktifkan Midtrans (bagian 4). |

> Mengganti `ADMIN_PASSWORD`/`ADMIN_SECRET` otomatis membuat sesi admin lama
> tidak berlaku (harus login ulang). `.env` tidak ikut ter-commit.

---

## 4. Pengaturan Pembayaran

### Default — Manual (QRIS statis + bank/e-wallet) — *tanpa biaya gateway*

Tidak perlu `.env`. Atur lewat **/admin → Pengaturan → Metode Pembayaran**:

1. **Unggah foto barcode QRIS** statis milik usaha Anda.
2. Tambah satu/lebih **rekening bank** (bank, no. rekening, atas nama).
3. Tambah **e-wallet** (OVO, GoPay, ShopeePay, DANA, LinkAja, dll).
4. (Opsional) isi instruksi pembayaran & nama merchant.

Alur: pelanggan melihat nominal + QRIS + rekening → membayar → menekan
**"Saya sudah membayar"** → admin cek mutasi → tombol **Verifikasi** di tab
**Pesanan** → status menjadi DP/Lunas dan **jadwal pengambilan muncul**.

### Opsional — Midtrans (QRIS dinamis, konfirmasi OTOMATIS)

Jika ingin pembayaran terkonfirmasi sendiri tanpa verifikasi manual, isi di
`.env`:

```
PAYMENT_GATEWAY=midtrans
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...
MIDTRANS_IS_PRODUCTION=false
```

Daftar di <https://dashboard.midtrans.com> (sandbox gratis untuk uji coba),
ambil **Server/Client Key** di Settings → Access Keys. Untuk produksi lengkapi
profil bisnis + rekening pencairan dan set `MIDTRANS_IS_PRODUCTION=true`.
Webhook (opsional, konfirmasi instan): set **Payment Notification URL** =
`https://DOMAIN-ANDA/api/webhook/midtrans`. Tanpa webhook tetap jalan (server
menanyakan status saat halaman pembayaran terbuka).

---

## 5. Deploy ke Hostinger VPS (rekomendasi)

VPS = data aman di disk, biaya tetap, tanpa batasan lisensi komersial.

### 5.1 Berlangganan & buat VPS

1. **hostinger.co.id → VPS Hosting** → pilih paket **KVM 1** (cukup; bisa
   upgrade kapan saja) → pilih periode → bayar.
2. Wizard setup VPS:
   - **Plain OS → Ubuntu** → versi **LTS terbaru (24.04 / 22.04) 64-bit**.
     (Jangan pilih Docker/Control panel/Aplikasi.)
   - Set **password root** (catat). Tambah **SSH key** bila ada.
3. Catat **IP VPS** dari **hPanel → VPS → Overview**.
4. Punya domain? **hPanel → Domain → DNS Zone**: buat **A record** `@` dan
   `www` → **IP VPS**.

### 5.2 Siapkan server

```bash
ssh root@IP_VPS
reboot                       # bereskan kernel baru (server fresh), tunggu ~30s
ssh root@IP_VPS              # masuk lagi
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx
```

### 5.3 Kirim kode aplikasi ke VPS

**Opsi A — GitHub (disarankan, update cukup `git pull`).**
Di komputer Anda:

```bash
cd x:\Bisnis\GalleriNusantara
git init && git add . && git commit -m "Galleri Nusantara"
git branch -M main
git remote add origin https://github.com/USERNAME/galleri-nusantara.git
git push -u origin main      # password = Personal Access Token GitHub
```

Di VPS:

```bash
cd /var/www && git clone https://github.com/USERNAME/galleri-nusantara.git galleri && cd galleri
```

**Opsi B — Tanpa GitHub (WinSCP).** Buka **WinSCP** (SFTP, host = IP VPS,
user `root`, password root) → buat folder `/var/www/galleri` → unggah semua isi
proyek **kecuali** `node_modules`, `client/dist`, `server/data`, `.env`.

### 5.4 Konfigurasi, build, jalankan

```bash
cd /var/www/galleri
cp .env.example .env
nano .env
#   NODE_ENV=production
#   ADMIN_PASSWORD=passwordKuatAnda
#   ADMIN_SECRET=  ← isi hasil: openssl rand -hex 32
npm run install-all
npm run build
npm i -g pm2
pm2 start server/index.js --name galleri
pm2 save && pm2 startup       # jalankan baris yang ditampilkan
```

Uji: buka `http://IP_VPS:4000`.

### 5.5 Firewall + domain + HTTPS

```bash
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
nano /etc/nginx/sites-available/galleri
```

```nginx
server {
  server_name domain-anda.com www.domain-anda.com;
  client_max_body_size 10M;
  location / {
    proxy_pass http://localhost:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
  }
}
```

```bash
ln -s /etc/nginx/sites-available/galleri /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

Selesai → akses `https://domain-anda.com`. Login admin di `/admin`, lalu atur
**Metode Pembayaran** (bagian 4).

### 5.6 Update aplikasi

```bash
cd /var/www/galleri && git pull && npm run build && pm2 restart galleri
# (Opsi B: timpa file lewat WinSCP lalu: npm run build && pm2 restart galleri)
```

### 5.7 Backup data (penting untuk bisnis)

Data ada di `server/data/db.json` + `server/uploads/`. Backup harian otomatis:

```bash
mkdir -p /root/backup
crontab -e
# tambahkan baris ini (backup tiap hari 02:00, simpan 14 hari terakhir):
0 2 * * * tar -czf /root/backup/galleri-$(date +\%F).tgz -C /var/www/galleri server/data server/uploads && find /root/backup -name 'galleri-*.tgz' -mtime +14 -delete
```

Unduh berkala ke komputer: `scp root@IP_VPS:/root/backup/galleri-*.tgz .`

---

## 6. Alternatif hosting lain (opsional)

Semua memakai pola `npm run build` → `npm start` dan butuh **volume/disk
persisten** (arahkan `DATA_DIR`/`UPLOAD_DIR` ke sana) agar data tidak hilang:

- **Docker** — sudah ada `Dockerfile`:
  `docker run -d -p 80:4000 -e ADMIN_PASSWORD=... -e ADMIN_SECRET=... -v galleri-data:/data --name galleri galleri`
- **Railway / Fly.io** — set env + mount volume ke `/data`
  (`DATA_DIR=/data`, `UPLOAD_DIR=/data/uploads`).
- **Render** — butuh Disk berbayar untuk persistensi (tanpa itu hanya demo).
- **Demo cepat** — `npm start` lalu `npx cloudflared tunnel --url http://localhost:4000`.
- **Jaringan toko (LAN)** — `npm start`, akses `http://IP-komputer:4000` dari
  perangkat lain di Wi-Fi sama.

> Catatan: layanan serverless (mis. Vercel) **tidak cocok** untuk versi ini
> karena database & foto disimpan di file (perlu refactor ke DB + object
> storage). VPS adalah pilihan paling proper & hemat.

---

## 7. Checklist sebelum live

- [ ] `ADMIN_PASSWORD` kuat + `ADMIN_SECRET` acak
- [ ] `NODE_ENV=production`
- [ ] Data di disk/volume persisten (VPS: otomatis aman)
- [ ] `npm run build` sukses sebelum `npm start`
- [ ] Domain + HTTPS aktif
- [ ] **Metode Pembayaran** sudah diisi di panel admin (QRIS + bank/e-wallet)
- [ ] Backup otomatis aktif (5.7)

---

## 8. Struktur Proyek

```
server/   Express API + penyimpanan data (JSON) + integrasi opsional Midtrans
client/   React + Vite + Tailwind (UI pelanggan & admin)
Dockerfile, Procfile, .env.example
```

- Database: `server/data/db.json` (atau `DATA_DIR`). Hapus untuk reset & memuat
  ulang katalog contoh.
- Foto: `server/uploads/` (atau `UPLOAD_DIR`).
- Endpoint admin diproteksi di server; data rekening memang publik (untuk
  ditampilkan ke pelanggan), password tidak pernah dikirim ke klien.
