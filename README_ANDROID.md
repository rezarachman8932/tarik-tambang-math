# Panduan Menjalankan Game Tarik Tambang Math di Android Studio 📱🤖

Aplikasi ini telah berhasil dikonversi ke bahasa **Kotlin** murni menggunakan framework UI modern **Jetpack Compose**. Kamu bisa membukanya dan menjalankannya langsung di Android Studio dengan mudah!

---

## 🛠️ Persyaratan Sistem
1. **Android Studio** (Versi Ladybug / Koala / terbaru direkomendasikan).
2. **Java Development Kit (JDK 17 atau 21)**.
3. Emulator perangkat Android atau HP Android asli terhubung dengan kabel USB (aktifkan *USB Debugging*).

---

## 📂 Struktur Folder Proyek Android
Seluruh file kode sumber Kotlin tersimpan mandiri di dalam direktori `/app`:
* `/app/src/main/java/com/mathgame/tariktambang/types/GameTypes.kt` -> Model data state permainan (Skor, Level, Operasi MTK).
* `/app/src/main/java/com/mathgame/tariktambang/utils/MathUtils.kt` -> Logika acak soal matematika cerdas anak-anak.
* `/app/src/main/java/com/mathgame/tariktambang/components/RopeView.kt` -> Komponen Tali Tarik Tambang interaktif + Animasi "💥 TALI PUTUS!".
* `/app/src/main/java/com/mathgame/tariktambang/components/NumpadView.kt` -> Papan ketik angka (numpad) interaktif.
* `/app/src/main/java/com/mathgame/tariktambang/MainActivity.kt` -> Halaman Utama Game, Mode Komputer 🤖, Mode 2 Pemain Lokal ⚔️, dan Efek Animasi (Skor Membesar & Timer Merah Berkedip ⚡).

---

## 🚀 Langkah-Langkah Import ke Android Studio

### Langkah 1: Ekspor Proyek dari Google AI Studio
1. Klik tombol **Settings** di pojok kanan atas layar AI Studio milikmu.
2. Pilih menu **Export to ZIP** untuk mengunduh seluruh proyek ke komputermu, ATAU klik **Export to GitHub** jika kamu ingin menyimpannya langsung ke repositori GitHub pribadimu.
3. Ekstrak file ZIP yang sudah kamu unduh di atas ke folder pilihanmu di komputer.

### Langkah 2: Buka Proyek di Android Studio
1. Buka aplikasi **Android Studio** di komputermu.
2. Klik tombol **Open** (atau *File -> Open...*).
3. Arahkan penjelajah file dan pilih **folder utama hasil ekstrak secara langsung (root folder)**.
4. Klik **OK**. Android Studio akan mendeteksi `settings.gradle` secara otomatis di root folder tersebut, mengonfigurasinya sebagai proyek Android, dan mengunduh seluruh modul dependensi yang dibutuhkan secara mandiri.

### Langkah 3: Menjalankan Proyek
1. Tunggu proses **Gradle Sync** selesai (ditandai dengan munculnya ikon checklist berwarna hijau di kanan bawah atau sinkronisasi selesai tanpa error).
2. Pilih Perangkat Emulator ataupun HP Android aslimu di bar atas Android Studio.
3. Klik tombol **Run App 🟩** (ikon segitiga hijau) di bagian atas layar.
4. Selamat! Aplikasi game **Tug of War Matematika** versi native Kotlin berhasil dipasang dan siap dimainkan dengan performa tinggi!

---

## ✨ Fitur-Fitur Premium Versi Kotlin Jetpack Compose:
1. **Rancangan UI Modern**: Memakai kaidah Material Design 3 dengan palet warna cerah ramah anak-anak.
2. **Animasi Angka Pegas (Spring Animation)**: Setiap kali pemain menjawab benar, skor tarikan akan membesar secara mulus seketika dengan gaya pegas (Spring), menggantikan fungsi `framer-motion` di web.
3. **Urgensi Timer 10 Detik Akhir**: Angka countdown otomatis membesar, menyala merah terang, dan berkedip dramatis jika sisa waktu di bawah 10 detik.
4. **Logika Bot Responsif**: Bot komputer akan otomatis menarik tali setiap selang beberapa detik tergantung tingkat kesulitan yang kamu pilih.
