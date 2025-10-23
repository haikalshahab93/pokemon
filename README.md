# Pokemon Pokédex & Battle Game

Deskripsi Singkat

Sebuah game berbasis web yang menggabungkan Pokédex dengan fitur pertempuran dan penangkapan. Kamu bisa menjelajah daftar Pokémon, mencari dan memfilter berdasarkan tipe, menandai favorit, menangkap Pokémon, serta bertarung melawan lawan acak untuk mendapatkan hadiah, badge, dan meningkatkan win streak. Progres pemain disimpan per-user menggunakan localStorage.

Fitur Utama

- Browsing & Pencarian: Lihat grid kartu Pokémon, cari berdasarkan nama, dan filter berdasarkan tipe.
- Favorit & Tangkapan: Tandai Pokémon favorit dan lihat koleksi tangkapanmu.
- Pertarungan (Battle): Hadapi lawan acak. Sistem damage, turn, critical, dan super-effective dilacak.
- Ringkasan Pertarungan: EndBattleOverlay menampilkan hasil (menang/kalah), metrik, hadiah, serta badge baru.
- Hadiah & Badge: Hadiah berdasarkan difficulty, performa, dan win streak. Badge dikumpulkan dan ditampilkan.
- Multi-User: Pilih atau tambahkan user di Header. Progres tiap user disimpan terpisah.

Cara Bermain

1) Pilih User
- Di Header, pilih user aktif atau tambahkan user baru. Semua progres (favorit, tangkapan, badge, streak) akan mengikuti user yang dipilih.

2) Menjelajah & Memfilter
- Gunakan kolom pencarian untuk mencari Pokémon berdasarkan nama.
- Pilih tipe untuk memfilter (mis. Fire, Water, Grass). Setel ke "All" untuk melihat semua.
- Aktifkan/Nonaktifkan "Favorites only" atau "Captured only" sesuai kebutuhan.

3) Membuka Detail & Aksi
- Klik kartu Pokémon untuk membuka detail (Modal). Dari sini kamu bisa:
  - Capture: Memulai proses penangkapan.
  - Battle: Memulai pertarungan melawan lawan acak.

4) Pertarungan
- Di BattleOverlay, pilih gerakan dengan menekan tombol angka 1–4 (atau klik tombol gerakan).
- Perhatikan HP, damage, critical, dan efek tipe. Bertarung hingga salah satu pihak kehabisan HP.

5) Ringkasan & Hadiah
- Setelah pertarungan selesai, EndBattleOverlay akan menampilkan hasil, metrik (turn, damage, critical/super-effective), hadiah, dan badge baru jika ada.
- Kamu bisa memilih "Rematch" untuk bertarung lagi atau menutup overlay untuk kembali ke grid.

6) Melihat Tangkapan & Koleksi
- Buka Captures dari Header untuk melihat Pokémon yang sudah kamu tangkap.

Tips

- Jika grid kosong, pastikan pencarian kosong, tipe disetel ke "All", dan matikan filter Favorites/Captured.
- Tombol "Load more" dan "Reset" digunakan untuk memuat halaman tambahan atau mengembalikan ke halaman awal.

Menjalankan Proyek

- Install: npm install
- Jalankan: npm run dev
- Buka di browser: http://localhost:5173/

Catatan

- Semua progres pemain disimpan otomatis di localStorage per user.
- Efek visual (konfeti saat menang, haze saat kalah) muncul di EndBattleOverlay untuk menambah pengalaman bermain.
