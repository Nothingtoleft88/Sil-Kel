# Silsilah Keluarga Pro v4.3.0

Versi ini mempertahankan seluruh data lama pada Firebase `silsilah_v2`, lalu meningkatkan fitur zodiak dan astrologi menjadi berbasis posisi astronomis.

## Astrologi Presisi
- Matahari tropikal dihitung dari longitude ekliptika sebenarnya.
- Bulan dihitung dari posisi geosentrik pada waktu lahir.
- Ascendant dihitung dari Greenwich Apparent Sidereal Time, longitude, latitude, dan obliquity.
- Shio dapat memakai batas Tahun Baru Imlek atau Li Chun.
- Elemen dan polaritas tahun Tionghoa dihitung dari Heavenly Stem.
- Tanggal tanpa jam tidak dipaksa menjadi hasil palsu: aplikasi menampilkan dua kemungkinan saat melewati batas tanda.
- Skor kelengkapan data menjelaskan tingkat presisi hasil.

## Data baru opsional
`birthTime`, `birthTimezone`, `birthUtcOffset`, `birthLatitude`, `birthLongitude`, dan `chineseZodiacBasis`. Data profil lama tetap kompatibel.

## Mesin astronomi
Astronomy Engine 2.1.19 dipanggil dari CDN versi terkunci. Jika CDN tidak tersedia, aplikasi memakai rumus cadangan lokal dan menandai statusnya.

Astrologi adalah tradisi interpretatif; posisi astronomis dapat dihitung dengan presisi, tetapi makna kepribadian tidak merupakan fakta ilmiah.
