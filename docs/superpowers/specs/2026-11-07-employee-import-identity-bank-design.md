# Impor identitas dan rekening karyawan

Tanggal: 2026-11-07

## Tujuan

Impor Excel karyawan mengisi NIK KTP, jenis kelamin, nomor telepon, dan rekening bank pertama. Nama tetap dua kolom. Antrean, prefix NIK pegawai, dan larangan membuat akun SSO tidak berubah.

## Template

Sheet `Data` memuat header. Sheet `Contoh` memuat header yang sama plus satu baris sampel dan tidak diimpor.

Urutan header:

| Kolom | Wajib | Aturan |
|---|---|---|
| Nama depan | ya | teks tidak kosong |
| Nama belakang | tidak | disimpan apa adanya, boleh kosong |
| NIK KTP | ya | 16 digit setelah karakter non-angka dibuang; unik di perusahaan dan di dalam file |
| NO TELPON | tidak | disimpan ke `phone` dengan aturan telepon yang sudah ada |
| JENIS KELAMIN | tidak | kosong menjadi `null`; nilai yang diterima menjadi `male` atau `female` |
| NO REKENING | ya | teks tidak kosong setelah spasi dibuang |
| NAMA BANK | ya | teks tidak kosong setelah spasi di ujung dibuang dan spasi beruntun dijadikan satu spasi |
| Departemen | tidak | aturan yang sudah berjalan |
| Jabatan | tidak | aturan yang sudah berjalan |
| Tipe kerja | ya | aturan yang sudah berjalan |
| Email | tidak | aturan yang sudah berjalan |
| Tanggal bergabung | tidak | aturan yang sudah berjalan |

Header dibandingkan persis, termasuk huruf besar. File dengan header lama, termasuk kolom `Telepon`, ditolak seluruhnya dengan pesan `Header sheet Data tidak sesuai template`.

Kolom `NIK KTP` dan `NO REKENING` di template berformat teks untuk baris 2 sampai 5001. Nomor 16 digit yang disimpan Excel sebagai angka bisa kehilangan digit terakhir.

Baris sampel:

`Amir`, `Mufid`, `3201010101010001`, `08123456789`, `Laki-laki`, `1234567890`, `BCA`, `Engineering`, `Staff`, `PERMANENT`, `amir@eiger.test`, `2026-01-15`

Daftar kolom di dialog impor memakai urutan header yang sama.

## Jenis kelamin

Perbandingan tidak membedakan huruf besar. Token yang diterima:

| Input | Tersimpan |
|---|---|
| `laki-laki`, `laki laki`, `l`, `pria` | `male` |
| `perempuan`, `p`, `wanita` | `female` |
| kosong | `null` |

Nilai lain membuat baris gagal dengan pesan `Jenis kelamin tidak valid`.

## Rekening

Tabel baru `employee_bank_accounts`:

- `id`, `tenantId`, `employeeId`, `accountNumber`, `bankName`, `bankNameKey`, `isPrimary`, `createdAt`, `updatedAt`
- `accountNumber` menyimpan nomor setelah semua spasi dibuang
- `bankName` menyimpan nama setelah trim dan setelah spasi beruntun dijadikan satu, dengan kapital asli
- `bankNameKey` menyimpan `bankName` dalam huruf kecil
- satu karyawan bisa punya banyak rekening
- indeks unik parsial memastikan paling satu baris `isPrimary = true` per karyawan
- unik pada `(tenantId, bankNameKey, accountNumber)`
- rekening terhapus saat karyawan terhapus

Impor membuat tepat satu rekening dengan `isPrimary = true`. Layar tambah dan ubah karyawan tidak berubah di pekerjaan ini.

## Alur satu baris

Parser menolak baris yang gagal validasi dan tetap memproses baris lain. Pengecekan di dalam file:

- email, seperti sekarang
- NIK KTP yang sama
- pasangan nomor rekening dan nama bank yang sama, tanpa membedakan huruf besar pada nama bank

Worker lalu memeriksa database untuk email, NIK KTP, dan pasangan rekening. Karyawan dan rekening dibuat dalam satu transaksi. Nomor pegawai di urutan memori baru maju setelah transaksi berhasil. Kalau transaksi gagal, karyawan baris itu tidak tersimpan dan nomor pegawai itu tidak terpakai.

Kolom yang ditulis ke karyawan dari field baru: `ktpNumber`, `gender`, `phone`.

## Pesan gagal

Beberapa alasan pada baris yang sama digabung dengan `; `.

- `NIK KTP wajib diisi`
- `NIK KTP harus 16 digit`
- `NIK KTP harus diisi sebagai teks`
- `NIK KTP sudah dipakai`
- `Jenis kelamin tidak valid`
- `Nomor rekening wajib diisi`
- `Nomor rekening harus diisi sebagai teks`
- `Nama bank wajib diisi`
- `Nomor rekening sudah dipakai`

Pesan `NIK KTP harus diisi sebagai teks` dan `Nomor rekening harus diisi sebagai teks` dipakai saat sel berupa angka yang tidak aman dibaca sebagai bilangan bulat. Angka yang masih aman diubah menjadi deretan digit, lalu aturan panjang dan wajib berlaku. Pemulihan angka nol di depan khusus nomor telepon tidak berlaku untuk NIK KTP dan nomor rekening.

Pelanggaran unik di database memakai `NIK KTP sudah dipakai` atau `Nomor rekening sudah dipakai`, bukan pesan mentah database.

File unduhan baris gagal memakai 12 kolom template yang sama, lalu kolom `Alasan gagal`.

## Pengujian

- Template memuat header baru, baris sampel, dan format teks pada NIK KTP serta nomor rekening.
- Baris lengkap memetakan `Laki-laki` ke `male`, NIK 16 digit, telepon, dan rekening.
- `L`, `P`, `Perempuan`, `Wanita`, `Pria`, dan `laki laki` mengikuti tabel jenis kelamin. Nilai lain gagal. Kosong menjadi `null`.
- NIK kosong, 15 digit, 17 digit, atau angka Excel yang tidak aman gagal dengan pesan yang sesuai. NIK berisi spasi atau titik yang tersisa 16 digit diterima.
- Nomor rekening atau nama bank yang kosong gagal. Nomor rekening berupa angka yang tidak aman gagal.
- NIK duplikat di file, atau pasangan rekening duplikat dengan beda huruf besar pada nama bank, membuat baris kedua gagal.
- Service membuat karyawan dan satu rekening utama dalam satu transaksi.
- NIK atau rekening yang sudah ada di perusahaan membuat baris gagal dan tidak menyimpan karyawan.
- Kegagalan simpan rekening membatalkan karyawan baris itu dan tidak memajukan nomor pegawai.
- File gagal memuat 12 kolom asli plus alasan.
- Dialog impor menampilkan 12 header yang sama.
