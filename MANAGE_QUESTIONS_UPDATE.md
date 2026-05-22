# 📝 Update ManageQuestions.jsx - Multiple Choice Support

## 🎯 Summary

Menambahkan support untuk **TIPE_2 (Multiple Choice)** di halaman manajemen bank soal, di mana dosen dapat membuat soal pilihan ganda dengan **lebih dari 1 jawaban benar**.

---

## ✨ Perubahan yang Dilakukan

### 1. **State Management**

#### State Baru:
```javascript
const [kunciJawabanMultiple, setKunciJawabanMultiple] = useState([]);
```
- Menyimpan array index (0-3) untuk jawaban benar multiple choice
- Contoh: `[0, 2]` artinya opsi A dan C adalah jawaban benar

#### State yang Diupdate:
- `tipeSoal`: Menambahkan value `'pg_multiple'` selain `'pg'`, `'esai'`, `'upload'`

---

### 2. **UI/UX Improvements**

#### Tombol Tipe Soal (Header Form):
**Sebelum:**
- ✅ PG Single Choice (TIPE_1)
- ❌ ~~Pilihan Ganda~~ (nama tidak spesifik)
- ✅ Soal Esai (TIPE_3)
- ✅ Upload Berkas (TIPE_4)

**Sesudah:**
- ✅ **PG Single Choice** (TIPE_1) - hanya 1 jawaban benar
- ✅ **PG Multiple Choice** (TIPE_2) - bisa lebih dari 1 jawaban benar ⭐ BARU
- ✅ Soal Esai (TIPE_3)
- ✅ Upload Berkas (TIPE_4)

#### Form Multiple Choice:
Ketika memilih "PG Multiple Choice":

1. **Label Form**:
   ```
   Opsi & Kunci Jawaban (Bisa Pilih Lebih dari 1 Jawaban Benar)
   ```

2. **Info Box** (biru):
   ```
   💡 Klik tombol A/B/C/D untuk menandai jawaban yang benar. 
   Anda bisa memilih lebih dari satu jawaban.
   ```

3. **Interaksi**:
   - Klik tombol A/B/C/D untuk **toggle** (on/off)
   - Bisa memilih **0 hingga 4 jawaban** sebagai benar
   - Visual feedback:
     - ✅ Selected: background hijau + border hijau + icon checkmark
     - ⬜ Not selected: background abu-abu

4. **Summary Box** (hijau):
   ```
   Jawaban Benar: A, C
   ```
   Muncul di bawah form jika sudah ada jawaban yang dipilih

#### Tampilan Tabel:
Badge tipe soal di tabel bank soal:
- **TIPE_1**: Badge biru - "PG Single"
- **TIPE_2**: Badge **ungu** - "PG Multiple" ⭐ BARU
- **TIPE_3**: Badge hijau - "Esai"
- **TIPE_4**: Badge amber - "Upload"

---

### 3. **Logic Implementation**

#### A. Save Logic (`handleSimpanSoal`)

**Mapping tipe soal ke database:**
```javascript
let dbTipeSoal = 'TIPE_1';
if (tipeSoal === 'pg_multiple') dbTipeSoal = 'TIPE_2';  // ⭐ BARU
if (tipeSoal === 'esai') dbTipeSoal = 'TIPE_3';
if (tipeSoal === 'upload') dbTipeSoal = 'TIPE_4';
```

**Kunci jawaban untuk multiple choice:**
```javascript
if (tipeSoal === 'pg_multiple') {
    // Convert index array [0, 2] to key array ["A", "C"]
    const selectedKeys = kunciJawabanMultiple.map(idx => ['A', 'B', 'C', 'D'][idx]);
    // Save as JSON string: '["A","C"]'
    dbKunciJawaban = JSON.stringify(selectedKeys);
}
```

**Opsi jawaban:**
```javascript
opsi_jawaban: (tipeSoal === 'pg' || tipeSoal === 'pg_multiple') ? JSON.stringify({
    A: opsi[0],
    B: opsi[1],
    C: opsi[2],
    D: opsi[3]
}) : null
```

#### B. Edit Logic (`handleMulaiEdit`)

**Parse kunci jawaban dari database:**
```javascript
if (formTipe === 'pg_multiple') {
    // Parse JSON array: ["A", "C"] -> [0, 2]
    const kunciArray = JSON.parse(q.kunci_jawaban || '[]');
    const keys = ['A', 'B', 'C', 'D'];
    const indices = kunciArray.map(k => keys.indexOf(k)).filter(idx => idx >= 0);
    setKunciJawabanMultiple(indices);
}
```

#### C. Toggle Multiple Choice (`toggleMultipleChoice`)

```javascript
const toggleMultipleChoice = (index) => {
    setKunciJawabanMultiple(prev => {
        if (prev.includes(index)) {
            // Remove if already selected
            return prev.filter(i => i !== index);
        } else {
            // Add if not selected, keep sorted
            return [...prev, index].sort();
        }
    });
};
```

---

## 📊 Data Structure

### Database Schema (Tidak Berubah)

Table: `questions`
```sql
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT,
    tipe_soal ENUM('TIPE_1', 'TIPE_2', 'TIPE_3', 'TIPE_4'),
    isi_soal TEXT,
    opsi_jawaban JSON,        -- {"A":"text","B":"text","C":"text","D":"text"}
    kunci_jawaban VARCHAR(255) -- TIPE_2: '["A","C"]'
);
```

### Format Data untuk TIPE_2

**Contoh Soal:**
```
Pertanyaan: "Manakah yang termasuk bahasa pemrograman? (Pilih semua yang benar)"

Opsi:
A. Python
B. HTML
C. Java
D. CSS
```

**Payload yang dikirim ke backend:**
```json
{
    "exam_id": 1,
    "tipe_soal": "TIPE_2",
    "isi_soal": "Manakah yang termasuk bahasa pemrograman? (Pilih semua yang benar)",
    "opsi_jawaban": "{\"A\":\"Python\",\"B\":\"HTML\",\"C\":\"Java\",\"D\":\"CSS\"}",
    "kunci_jawaban": "[\"A\",\"C\"]"
}
```

---

## 🧪 Testing Checklist

### Test Case 1: Create Multiple Choice Question

1. ✅ Login sebagai dosen
2. ✅ Navigate ke "Manajemen Bank Soal"
3. ✅ Pilih ujian dari dropdown
4. ✅ Klik tombol "PG Multiple Choice"
5. ✅ Isi pertanyaan
6. ✅ Isi semua opsi (A, B, C, D)
7. ✅ Klik tombol A dan C untuk menandai sebagai jawaban benar
8. ✅ Verify summary box menampilkan "Jawaban Benar: A, C"
9. ✅ Klik "Tambah ke Bank Soal"
10. ✅ Verify soal muncul di tabel dengan badge "PG Multiple" (ungu)

### Test Case 2: Edit Multiple Choice Question

1. ✅ Klik tombol "Edit" pada soal TIPE_2
2. ✅ Verify form terisi dengan data yang benar:
   - Tipe soal: PG Multiple Choice
   - Pertanyaan terisi
   - Opsi A-D terisi
   - Kunci jawaban terpilih (button highlight hijau)
3. ✅ Ubah salah satu opsi
4. ✅ Toggle kunci jawaban (misalnya remove A, add D)
5. ✅ Klik "Sahkan Perubahan"
6. ✅ Verify perubahan tersimpan

### Test Case 3: Validate Multiple Answers

1. ✅ Buat soal dengan 2 jawaban benar (A, B)
2. ✅ Verify save berhasil
3. ✅ Buat soal dengan 3 jawaban benar (A, B, C)
4. ✅ Verify save berhasil
5. ✅ Buat soal dengan 4 jawaban benar (A, B, C, D)
6. ✅ Verify save berhasil
7. ✅ Buat soal dengan 0 jawaban benar
8. ✅ Verify save berhasil (meskipun tidak recommended)

### Test Case 4: Delete Multiple Choice Question

1. ✅ Klik tombol "Hapus" pada soal TIPE_2
2. ✅ Verify dialog konfirmasi muncul
3. ✅ Klik "Ya, Hapus Permanen!"
4. ✅ Verify soal terhapus dari tabel

### Test Case 5: Integration with Grading Page

1. ✅ Mahasiswa mengerjakan ujian dengan soal TIPE_2
2. ✅ Mahasiswa memilih jawaban (misalnya A, C)
3. ✅ Submit jawaban
4. ✅ Dosen membuka halaman Grading
5. ✅ Verify jawaban mahasiswa ditampilkan dengan benar
6. ✅ Verify auto-koreksi:
   - Jika mahasiswa pilih A, C dan kunci adalah A, C → ✅ BENAR (skor 100)
   - Jika mahasiswa pilih A saja → ✗ SALAH (skor 0) - kurang jawaban
   - Jika mahasiswa pilih A, C, D → ✗ SALAH (skor 0) - ada jawaban salah

---

## 🔄 Backward Compatibility

✅ **Tidak ada breaking changes**:
- Soal TIPE_1 (PG Single) tetap berfungsi normal
- Soal TIPE_3 (Esai) tidak terpengaruh
- Soal TIPE_4 (Upload) tidak terpengaruh
- Database schema tidak berubah (TIPE_2 sudah ada dari awal)

---

## 📌 Important Notes

1. **Validasi di Frontend**:
   - Semua opsi (A-D) wajib diisi
   - Tidak ada validasi minimum jawaban benar (bisa 0-4)
   - Dosen bertanggung jawab memastikan ada jawaban benar yang dipilih

2. **Auto-Grading Logic** (di Grading.jsx):
   ```javascript
   // Mahasiswa HARUS pilih SEMUA jawaban yang benar
   // DAN tidak boleh ada jawaban salah yang dipilih
   const isCorrect = studentAnswer.length === correctAnswer.length &&
                     studentAnswer.every(sa => correctAnswer.includes(sa));
   ```

3. **UI Consistency**:
   - Warna ungu (purple) digunakan khusus untuk TIPE_2
   - Icon checkmark (✓) muncul saat opsi dipilih sebagai kunci jawaban

4. **Recommendations for Lecturers**:
   - Minimal pilih 2 jawaban benar untuk multiple choice
   - Buat instruksi yang jelas: "(Pilih semua yang benar)"
   - Hindari membuat semua opsi benar (tidak ada challenge)

---

## 🚀 Next Steps

Setelah update ini, sistem mendukung:
- ✅ TIPE_1: Pilihan Ganda Single Choice (1 jawaban benar)
- ✅ TIPE_2: Pilihan Ganda Multiple Choice (>1 jawaban benar) ⭐ BARU
- ✅ TIPE_3: Essay dengan AI Grading
- ✅ TIPE_4: Upload File dengan Manual Grading

**Ready for production!** 🎉
