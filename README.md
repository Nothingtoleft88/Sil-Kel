# Silsilah Keluarga Pro v4.6.0

Versi ini mengganti total sistem garis silsilah lama dengan konektor SVG berbasis hubungan keluarga.

## Perbaikan inti
- Garis keturunan anak dimulai dari **titik tengah hubungan kedua orang tua** (simbol hati), bukan dari kartu pasangan.
- Anak dari pasangan berbeda dikelompokkan dan ditarik dari union pasangan yang benar berdasarkan `linkedSpouseId`.
- Pasangan kedua/eks didukung: anak yang terkait ditarik dari hubungan pasangan yang tepat.
- Garis tetap presisi saat zoom, pan, resize, rotasi HP/tablet, cetak PNG/PDF, dan Buku Keluarga.
- Sistem lama berbasis pseudo-element dinonaktifkan agar tidak terjadi garis ganda atau salah pusat.
- Seluruh data, profil, relasi, foto, dokumen, astrologi, riwayat, dan node Firebase `silsilah_v2` tidak diubah.
