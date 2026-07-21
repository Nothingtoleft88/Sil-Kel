# Silsilah Keluarga Pro v4.1.0

Versi profesional aplikasi silsilah keluarga berbasis HTML/CSS/JavaScript dan Firebase Realtime Database.

## Pembaruan utama v4.1
- Mesin kamera kanvas ditulis ulang agar zoom tidak bergeser diagonal atau terasa miring.
- Zoom mouse/trackpad kini berpusat tepat pada posisi kursor.
- Pinch zoom HP/tablet memakai Pointer Events dan mempertahankan titik di antara dua jari.
- Tombol **Fit** menyesuaikan seluruh ukuran pohon secara otomatis.
- Tombol persentase zoom dapat mengembalikan tampilan ke 100%.
- Panning, resize jendela, dan perubahan sidebar lebih stabil.
- Ekspor proyek web diperbaiki agar membawa data aktif ke paket hasil ekspor.
- Alur impor JSON diperbaiki agar langsung merender dan menyesuaikan pohon.

## Data tetap kompatibel
Versi ini tetap memakai konfigurasi Firebase dan lokasi data yang sama:

```text
silsilah_v2
├── tree
├── settings
└── meta
```

Tidak ada perubahan nama node, struktur profil, relasi, isi pohon, kode akses, atau data anggota keluarga.

## Kontrol kanvas
- Gulir mouse/trackpad: zoom pada posisi kursor
- Geser area kosong: memindahkan kanvas
- Cubit dua jari: zoom di HP/tablet
- Klik dua kali area kosong: muat seluruh pohon
- `+` / `-`: zoom
- `0` atau `F`: muat seluruh pohon
- `1`: kembali ke 100%

## Deploy ke Vercel
Unggah seluruh isi folder ini ke repository GitHub yang terhubung ke Vercel. Pastikan `index.html`, `style.css`, `script.js`, dan `vercel.json` berada di root repository.

## Catatan keamanan
Kode akses tetap kompatibel dengan `silsilah_v2/settings/accessCode`. Untuk keamanan tingkat produksi, Firebase Authentication dan Rules berbasis pengguna tetap direkomendasikan.
