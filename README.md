# Silsilah Keluarga Pro v4.0.0

Rombakan profesional untuk aplikasi silsilah keluarga berbasis HTML/CSS/JavaScript dan Firebase Realtime Database.

## Fitur utama
- Antarmuka desktop dan mobile yang responsif
- Pohon keluarga interaktif dengan zoom, drag, relasi pasangan, anak, orang tua, dan saudara
- Profil lengkap, foto, lokasi, biografi, ulang tahun, statistik, dan peta migrasi
- Sinkronisasi Firebase dengan status cloud dan cache lokal saat koneksi bermasalah
- Sesi login tersimpan sampai pengguna menekan Keluar
- Ekspor PNG, PDF, JSON, dan paket proyek web

## Deploy ke Vercel
Unggah seluruh isi folder ini ke repository GitHub yang terhubung ke Vercel. Pastikan `index.html`, `style.css`, dan `script.js` berada di root repository.

## Catatan keamanan
Kode akses pada versi ini tetap kompatibel dengan database lama (`silsilah_v2/settings/accessCode`). Untuk keamanan tingkat produksi, gunakan Firebase Authentication dan Rules berbasis `auth != null`; kode akses sisi klien bukan pengganti autentikasi server.
