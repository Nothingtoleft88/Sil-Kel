# Silsilah Keluarga Pro Max v5.0.0

Ruang kerja silsilah keluarga modern berbasis web dengan arsitektur Heritage Precision, visualisasi vektor relasi dinamis, dan sistem penjelajahan interaktif.

## Pembaruan Utama (Overhaul v5.0.0)

1. **Desain & Estetika Heritage Precision**:
   - Skema warna Obsidian Slate dipadukan dengan kanvas arsip beresolusi tinggi dan kontras WCAG AA 4.5:1.
   - Tipografi modern menggunakan *Plus Jakarta Sans* untuk hierarki judul, *Inter* untuk keterbacaan data, dan *JetBrains Mono* untuk indikator numerik.
   - Kartu anggota silsilah dengan tata letak proporsional, pembeda gender yang bermartabat, status hidup/wafat, dan lencana generasi.

2. **Pengalaman Pengguna Interaktif (Interactive DX)**:
   - **Slide-Over Profile Inspector**: Klik kartu anggota akan membuka panel inspektur samping yang mulus tanpa menutupi kanvas kerja.
   - **Lineage Path Highlighting**: Sorot otomatis garis leluhur langsung (ke atas) dan keturunan (ke bawah) saat suatu profil dipilih.
   - **Radar Minimap Interaktif**: Navigator kanvas di sudut kanan bawah dengan frame viewport langsung yang dapat dipantau dan dikontrol.
   - **Navigasi Cepat Garis Keturunan**: Tombol pintas cerdas di panel profil untuk langsung meluncurkan kamera kanvas (`flyToPerson`) ke ayah, ibu, pasangan, atau anak.
   - **Pencarian Cepat dengan Autocomplete**: Input pencarian global dengan pintasan tombol `/` dan hasil dropdown instan.
   - **Pilihan Kepadatan Tampilan**: Beralih antara mode Detail (kartu lengkap) dan mode Kompak (tampilan ringkas untuk pohon keluarga besar).

3. **Modul Ruang Kerja Terpadu**:
   - **Pohon Silsilah**: Kanvas interaktif dengan zoom halus dan pergeseran presisi.
   - **Direktori Anggota**: Tabel dan kartu profil dengan filter generasi, gender, status, dan pengurutan cerdas.
   - **Timeline Keluarga**: Rekam jejak sejarah kelahiran, pernikahan, dan peristiwa keluarga lintas dekade.
   - **Kalender & Agenda**: Kalender bulanan dengan deteksi otomatis hari ulang tahun dan acara reuni.
   - **Arsip & Galeri Media**: Galeri foto dan dokumen pembuktian silsilah dengan pratinjau langsung.
   - **Statistik & Analisis**: Ringkasan demografi, rasio gender, dan persebaran kota kelahiran.
   - **Jejak Migrasi**: Peta interaktif Leaflet yang memetakan persebaran dan rute migrasi keluarga.
   - **Kualitas Data**: Audit kelengkapan data foto profil dan tanggal lahir keluarga.
   - **Riwayat Versi**: Snapshot cloud otomatis dengan opsi pemulihan 1-klik.

4. **Konektor Vektor SVG Presisi**:
   - Garis keturunan anak diturunkan secara akurat dari titik temu hubungan kedua orang tua (union heart), mendukung pernikahan ganda dan pengelompokan anak berdasarkan pasangan terkait (`linkedSpouseId`).

5. **Integritas Data & Backend**:
   - Kompatibilitas 100% dengan database Firebase Realtime (`silsilah_v2` dan `silsilah_v2_history`).
   - Ekspor dan impor lengkap: JSON, GEDCOM 5.5.1, PDF Bagan Lanskap A3, PDF Buku Silsilah Lengkap, dan cadangan proyek web (.ZIP).
