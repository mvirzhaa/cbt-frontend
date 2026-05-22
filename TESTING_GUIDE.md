# 🧪 Testing Guide - Grading Page Updates

## Prerequisites

Sebelum testing, pastikan:

### 1. Database MySQL Running
```bash
# Windows (XAMPP/WAMP)
# Start MySQL dari XAMPP/WAMP Control Panel

# Atau check jika sudah running:
netstat -ano | findstr :3306
```

### 2. Backend Server Running
```bash
cd /d/Belajar/cbt-api
node index.js
```
Server akan berjalan di: `http://localhost:3000`

### 3. Frontend Server Running
```bash
cd /d/Belajar/cbt-frontend
npm run dev
```
Frontend akan berjalan di: `http://localhost:5173/cbt/`

---

## 📋 Test Cases

### Test Case 1: Login sebagai Dosen

**Endpoint**: `POST /api/login`

**Credentials**:
- Email: `dosen@cbt.com`
- Password: `rahasia123`

**Expected Result**: Token JWT diterima

---

### Test Case 2: Get All Answers (Endpoint Baru)

**Endpoint**: `GET /api/grading/exams/:exam_id/all-answers`

**Headers**:
```
Authorization: Bearer {token}
```

**Expected Response**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "exam_id": 1,
      "question_id": 1,
      "pilihan_jawaban": "A",
      "jawaban_teks": null,
      "file_path": null,
      "skor": 100,
      "status_penilaian": "selesai",
      "users": {
        "nama": "Mahasiswa Teladan",
        "nim": "12345678",
        "username": "mahasiswa123"
      },
      "questions": {
        "isi_soal": "Pertanyaan...",
        "tipe_soal": "TIPE_1",
        "kunci_jawaban": "A",
        "opsi_jawaban": "{\"A\":\"Option A\",\"B\":\"Option B\"}",
        "bobot_nilai": "10"
      }
    }
  ]
}
```

**Features**:
- ✅ Mengembalikan SEMUA jawaban (tidak hanya status: menunggu)
- ✅ Include data users lengkap (nama, nim, username)
- ✅ Include kunci_jawaban untuk auto-koreksi
- ✅ Include opsi_jawaban untuk ditampilkan
- ✅ Sorted by user_id dan question_id

---

### Test Case 3: Get Student Answers (Endpoint Baru)

**Endpoint**: `GET /api/grading/exams/:exam_id/students/:student_id/answers`

**Headers**:
```
Authorization: Bearer {token}
```

**Expected Response**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "exam_id": 1,
      "question_id": 1,
      "pilihan_jawaban": "A",
      "skor": 100,
      "users": {
        "nama": "Mahasiswa Teladan"
      },
      "questions": {
        "isi_soal": "Pertanyaan...",
        "tipe_soal": "TIPE_1",
        "kunci_jawaban": "A",
        "opsi_jawaban": "{\"A\":\"Option A\"}"
      }
    }
  ]
}
```

**Features**:
- ✅ Mengembalikan semua jawaban untuk 1 mahasiswa spesifik
- ✅ Sorted by question_id (urut sesuai nomor soal)

---

### Test Case 4: UI Testing - Frontend Grading Page

#### 4.1 Filter 3 Tingkat
1. Buka halaman Grading: `http://localhost:5173/cbt/grading`
2. Login sebagai dosen
3. **Filter Mata Kuliah**:
   - Pilih salah satu mata kuliah
   - ✅ Dropdown Ujian harus terisi dengan ujian yang sesuai
4. **Filter Ujian**:
   - Pilih salah satu ujian
   - ✅ Dropdown Mahasiswa harus terisi dengan mahasiswa yang mengikuti ujian
5. **Filter Mahasiswa**:
   - Pilih salah satu mahasiswa
   - ✅ Tampil semua jawaban mahasiswa tersebut

#### 4.2 Filter Tipe Soal
Setelah memilih mahasiswa:
1. Klik tombol **"Semua"**: Tampil semua jawaban
2. Klik tombol **"Auto-Koreksi (PG)"**: Hanya tampil TIPE_1 dan TIPE_2
3. Klik tombol **"Penilaian Manual"**: Hanya tampil TIPE_4

#### 4.3 Tampilan Soal Pilihan Ganda (TIPE_1 - Single Choice)

**Expected Display**:
- ✅ Badge "PG Single"
- ✅ Badge status: "✓ Benar" (hijau) atau "✗ Salah" (merah)
- ✅ Border bar kiri: hijau jika benar, merah jika salah
- ✅ Semua opsi jawaban ditampilkan:
  - Opsi yang dipilih mahasiswa & benar: **hijau**
  - Opsi yang dipilih mahasiswa & salah: **merah**
  - Opsi benar yang tidak dipilih: **biru**
  - Opsi lain: putih
- ✅ Panel skor: background hijau/merah, read-only
- ✅ Skor: 100 jika benar, 0 jika salah

#### 4.4 Tampilan Soal Pilihan Ganda (TIPE_2 - Multiple Choice)

**Expected Display**:
- ✅ Badge "PG Multiple"
- ✅ Badge status: "✓ Benar" (jika semua jawaban benar) atau "✗ Salah"
- ✅ Border bar kiri: hijau jika semua benar, merah jika ada yang salah
- ✅ Semua opsi jawaban ditampilkan dengan highlight:
  - Opsi yang dipilih mahasiswa (bisa lebih dari 1): **highlight**
  - Opsi benar yang tidak dipilih: **biru**
- ✅ Panel skor: background hijau/merah, read-only
- ✅ Skor: 100 jika semua jawaban benar, 0 jika ada yang salah/kurang

**Logika Auto-Koreksi TIPE_2**:
```javascript
// Mahasiswa harus memilih SEMUA jawaban yang benar
// DAN tidak boleh ada jawaban yang salah dipilih
const studentAnswer = ["A", "C"];      // Jawaban mahasiswa
const correctAnswer = ["A", "C"];       // Kunci jawaban

// ✅ BENAR jika: panjang sama DAN semua elemen mahasiswa ada di kunci
const isCorrect = studentAnswer.length === correctAnswer.length &&
                  studentAnswer.every(sa => correctAnswer.includes(sa));
```

#### 4.5 Tampilan Soal Manual (TIPE_4 - Essay/Upload)

**Expected Display**:
- ✅ Badge "Essay/Upload"
- ✅ Border bar kiri: emas/kuning
- ✅ Jika ada file: Tombol "Lihat File" untuk download
- ✅ Jika ada teks: Tampil textarea dengan jawaban mahasiswa
- ✅ Panel input nilai:
  - Input field untuk nilai (0-100)
  - Jika belum dinilai: tombol "Simpan Nilai"
  - Jika sudah dinilai: nilai read-only dengan tombol "Edit Nilai"
  - Setelah klik "Edit Nilai": input active dan tombol berubah jadi "Simpan Nilai"

#### 4.6 Submit Score Manual
1. Pilih mahasiswa dengan soal TIPE_4
2. Input nilai (0-100)
3. Klik "Simpan Nilai"
4. ✅ Alert success
5. ✅ Nilai tersimpan dan input menjadi read-only
6. ✅ Tombol berubah menjadi "Edit Nilai"

---

## 🔧 Manual Testing dengan cURL

### 1. Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dosen@cbt.com","password":"rahasia123"}'
```

### 2. Get All Answers (replace {token} dan {exam_id})
```bash
curl http://localhost:3000/api/grading/exams/{exam_id}/all-answers \
  -H "Authorization: Bearer {token}"
```

### 3. Get Student Answers (replace {token}, {exam_id}, {student_id})
```bash
curl http://localhost:3000/api/grading/exams/{exam_id}/students/{student_id}/answers \
  -H "Authorization: Bearer {token}"
```

### 4. Submit Score
```bash
curl -X PUT http://localhost:3000/api/grading/responses/{response_id}/score \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"skor":85}'
```

---

## 🐛 Common Issues

### Issue 1: Database not connected
**Error**: `Can't reach database server at 127.0.0.1:3306`

**Solution**:
- Start MySQL server (XAMPP/WAMP)
- Check connection: `mysql -u root -p`

### Issue 2: Token expired
**Error**: `Token tidak valid atau kedaluwarsa`

**Solution**:
- Login ulang untuk mendapatkan token baru

### Issue 3: Akses ditolak
**Error**: `Akses Ditolak!`

**Solution**:
- Pastikan login sebagai dosen
- Check apakah ujian milik dosen yang login

---

## ✅ Success Criteria

Testing dianggap **BERHASIL** jika:

1. ✅ Endpoint `/api/grading/exams/:exam_id/all-answers` mengembalikan SEMUA jawaban
2. ✅ Endpoint `/api/grading/exams/:exam_id/students/:student_id/answers` mengembalikan jawaban per mahasiswa
3. ✅ Frontend menampilkan filter 3 tingkat (Matkul → Ujian → Mahasiswa)
4. ✅ Tampilan soal PG menampilkan semua opsi dengan highlight yang benar
5. ✅ Auto-koreksi TIPE_1 dan TIPE_2 berfungsi dengan benar
6. ✅ Panel skor auto-koreksi read-only (tidak bisa diedit)
7. ✅ Penilaian manual TIPE_4 bisa input dan save nilai
8. ✅ Filter tipe soal berfungsi (Semua/Auto/Manual)

---

## 📝 Notes

- **TIPE_1**: Pilihan Ganda Single Choice (hanya 1 jawaban benar)
- **TIPE_2**: Pilihan Ganda Multiple Choice (bisa lebih dari 1 jawaban benar)
- **TIPE_3**: Essay dengan AI Grading (tidak dibahas di update ini)
- **TIPE_4**: Essay/Upload File dengan manual grading oleh dosen

---

## 📞 Support

Jika ada masalah, check:
1. Console browser (F12) untuk error frontend
2. Terminal backend untuk error API
3. MySQL logs untuk error database
