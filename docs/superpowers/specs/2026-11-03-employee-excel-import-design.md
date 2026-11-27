# Impor karyawan dari Excel

Tanggal: 2026-11-03

## Tujuan

Halaman Employees (`/employees`) bisa mengimpor banyak karyawan dari file `.xlsx` tanpa menunggu seluruh proses selesai di satu request HTTP. File masuk antrean BullMQ. Layar menampilkan progress. Akun SSO tidak dibuat.

## Template

File template punya dua sheet.

Sheet `Data` hanya berisi baris header. Sheet `Contoh` berisi satu baris sampel dan tidak pernah diimpor.

Header sheet `Data`, urutan ini:

| Kolom | Wajib | Aturan |
|---|---|---|
| Nama depan | ya | teks tidak kosong |
| Nama belakang | ya | teks tidak kosong |
| Departemen | ya | nama atau kode departemen yang sudah ada di perusahaan yang sedang aktif |
| Tipe kerja | ya | `PERMANENT`, `CONTRACT`, `TEMPORARY`, `INTERN`, atau `DAILY_WORKER` |
| Email | tidak | kalau diisi, harus format email yang valid |
| Telepon | tidak | disimpan apa adanya |
| Tanggal bergabung | tidak | `YYYY-MM-DD`. Kosong berarti tanggal proses baris itu |

Kode pegawai tidak ada di Excel.

## Kode pegawai

Dialog impor meminta prefix NIK sebelum file dikirim.

- Prefix tepat 2 digit, rentang `10`–`99`.
- Satu pekerjaan impor memakai satu prefix untuk semua baris.
- Kode yang dibuat selalu 6 digit angka: prefix + 4 digit urutan.
- Urutan dihitung dari kode pegawai 6 digit di perusahaan yang sama yang diawali prefix itu. Nilai berikutnya adalah yang terbesar ditambah satu.
- Kalau belum ada kode dengan prefix itu, urutan mulai `0001`. Contoh: prefix `90` menghasilkan `900001`. Contoh lanjutan: kode terakhir `900042` menghasilkan `900043`.
- Kalau urutan berikutnya melewati `9999`, baris itu gagal.
- Form tambah karyawan satu per satu tidak berubah, termasuk aturan kode otomatis yang sudah ada di form itu.

## Perilaku tiap baris

Worker membuat karyawan HRMS saja. `createSsoUser` tidak dipakai.

Baris kosong dilewati dan tidak dihitung.

Baris gagal kalau salah satu ini terjadi:

- kolom wajib kosong
- departemen tidak ketemu (cocokkan kode persis, lalu nama tanpa membedakan huruf besar)
- tipe kerja di luar daftar
- email terisi tetapi formatnya salah
- email terisi dan sudah dipakai karyawan lain di perusahaan yang sama
- nomor urut prefix habis

Beberapa baris tanpa email tidak dianggap duplikat. Satu baris gagal tidak menghentikan baris lain. Karyawan yang sudah terbuat tetap tersimpan.

Kolom `Employee.email` sekarang wajib dan unik per perusahaan. Migrasi membuat kolom itu boleh kosong. Indeks unik tetap menolak email non-kosong yang sama. Di PostgreSQL beberapa `NULL` tidak saling bentrok.

Tanggal bergabung tetap kolom wajib di database. Nilai kosong diisi tanggal kalender saat baris diproses, di zona Asia/Jakarta.

## Antrean dan API

Redis sudah dipakai lewat `QueueModule`. Antrean baru bernama `employee-import`.

Izin untuk unduh template, unggah, dan lihat status sama dengan tambah karyawan: `employees:create`.

- `GET /api/employees/import/template` mengembalikan file `.xlsx`.
- `POST /api/employees/import` menerima `multipart` dengan field `file` dan `nikPrefix`. File disimpan sementara, pekerjaan dimasukkan ke antrean, lalu response langsung berisi ID pekerjaan. Proses baris tidak terjadi di request ini.
- `GET /api/employees/import/:jobId` mengembalikan status pekerjaan.

Batasan unggah: file `.xlsx` saja, maksimum 5 MB, maksimum 5000 baris data. Pelanggaran ditolak di request unggah.

Kalau perusahaan yang sama masih punya pekerjaan impor berstatus menunggu atau sedang berjalan, unggahan baru ditolak dengan HTTP 409. Body-nya berisi ID dan status pekerjaan yang sedang berjalan supaya layar bisa menampilkannya.

Worker menghapus file sementara setelah pekerjaan selesai atau gagal total.

Status pekerjaan:

- `waiting` atau `active`: masih diproses
- `completed`: worker selesai, termasuk kalau ada baris yang gagal
- `failed`: worker berhenti karena file tidak bisa dibaca atau header sheet `Data` tidak sesuai. Tidak ada karyawan yang dibuat pada kegagalan ini.

Isi status:

- `total`, `processed`, `created`, `failed`
- `errors`: daftar `{ row, message }` untuk baris yang gagal. `row` adalah nomor baris di sheet `Data`, header dihitung sebagai baris 1.

## Layar

Di halaman Employees, di samping Add Employee:

- Unduh template
- Import

Import membuka dialog dengan isian prefix dan pemilih file. Setelah unggah berhasil, dialog tetap terbuka dan menampilkan batang progress plus angka total, berhasil, dan gagal. Layar meminta status sekali per detik sampai pekerjaan `completed` atau `failed`. Daftar gagal menampilkan nomor baris dan alasan. Saat `completed`, daftar karyawan dimuat ulang.

Kalau unggahan ditolak karena impor lain masih berjalan, dialog menampilkan progress pekerjaan itu.

## Pengujian

- Prefix `90` tanpa kode yang ada menghasilkan `900001`. Kode `900042` yang ada menghasilkan `900043`.
- Departemen tidak dikenal, tipe kerja salah, dan email duplikat membuat baris itu gagal, dan baris berikutnya tetap diproses.
- Unggah membalas ID pekerjaan tanpa menunggu seluruh file selesai.
- Prefix di luar `10`–`99` ditolak.
- Layar menampilkan angka progress dari payload status.
