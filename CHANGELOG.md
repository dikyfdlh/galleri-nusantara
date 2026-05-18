# Changelog

Semua perubahan penting per versi. Setiap versi punya **tag Git** & **GitHub
Release** sebagai artefak permanen — versi lama tetap tersimpan walau ada versi
baru. Format mengikuti semantic versioning (MAJOR.MINOR.PATCH).

## [1.1.0] - 2026-05-17

### Ditambahkan
- Pembayaran **manual**: QRIS statis (foto) + multi rekening bank + e-wallet,
  diatur dari panel admin (Midtrans tetap opsional via `.env`).
- **Kategori produk** (pakaian adat & kategori lain) + filter di katalog.
- **Testimoni/dokumentasi** dari pesanan yang sudah selesai (tombol per
  pesanan di tab Pesanan), tampil di bawah form masuk pelanggan.
- **Rating pelanggan** dari halaman "Pesanan Saya" untuk pesanan selesai.
- Upload **foto/video** pada testimoni & rating (maksimal 25 MB).
- Opsi **Anonim** — nama disamarkan (huruf awal & akhir) di halaman publik.
- **Alamat & peta Google** (embed tanpa API key) di halaman masuk.
- Tombol **Pelanggan** di navbar; footer diperbarui.
- Editor katalog admin: kartu menyamping + dialog tambah/edit/hapus di tengah,
  responsif HP/tablet/PC.

### Keamanan
- Token admin **stateless** (HMAC, tahan restart) + verifikasi server sebelum
  panel admin tampil; fitur **ganti password** admin.
- Daftar testimoni lengkap (`?all=1`) wajib token admin.

### Operasional
- Siap **deploy VPS** (Hostinger): PM2 + Nginx + HTTPS, `DATA_DIR`/`UPLOAD_DIR`
  dapat diarahkan ke disk persisten, Dockerfile, panduan & backup cron.

## [1.0.0] - 2026-05-17

- Rilis awal: halaman masuk, katalog + galeri carousel, penyewaan via
  kalender, pembayaran QRIS, jadwal pengambilan H+1, panel admin.
