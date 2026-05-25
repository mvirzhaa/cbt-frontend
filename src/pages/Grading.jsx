import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config/api';

export default function Grading() {
    const backendFileBaseUrl = API_BASE_URL.replace(/\/+$/, '');
    // State Master Data
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);

    // State Filter (3 Tingkat)
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [studentList, setStudentList] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');

    // State Eksekusi
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputScores, setInputScores] = useState({});
    const [expandedAnswers, setExpandedAnswers] = useState({});

    // State untuk filter tipe soal
    const [filterType, setFilterType] = useState('all'); // 'all', 'auto', 'manual'
    const [recalculating, setRecalculating] = useState(false);

    // 1. Tarik Data Awal (Matkul & Ujian)
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { headers: { Authorization: `Bearer ${token}` } };
            const [resMatkul, resExams] = await Promise.all([
                axios.get('/api/matakuliah', headers),
                axios.get('/api/exams', headers)
            ]);
            setMatkulList(resMatkul.data.data || []);
            setAllExams(resExams.data.data || []);
        } catch (error) { 
            console.error("Gagal menarik data awal:", error); 
        }
    };

    // 2. Jika Matkul dipilih, saring Ujiannya
    const handleMatkulChange = (e) => {
        const mkId = e.target.value;
        setSelectedMatkul(mkId);
        
        const examsForThisMatkul = allExams.filter(ex => ex.kode_mk === mkId);
        setFilteredExams(examsForThisMatkul);
        
        setSelectedExam('');
        setAnswers([]); // Reset daftar jawaban
        setExpandedAnswers({});
    };

    // 3. Jika Ujian dipilih, tarik daftar mahasiswa yang ikut ujian
    const handleExamChange = async (e) => {
        const examId = e.target.value;
        setSelectedExam(examId);
        setExpandedAnswers({});

        if (!examId) {
            setStudentList([]);
            setSelectedStudent('');
            setAnswers([]);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Ambil semua jawaban untuk mendapatkan daftar mahasiswa unik
            const res = await axios.get(`/api/grading/exams/${examId}/all-answers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allAnswers = res.data.data || [];

            // Ekstrak mahasiswa unik
            const uniqueStudents = [];
            const seenIds = new Set();
            allAnswers.forEach(ans => {
                if (ans.users && !seenIds.has(ans.user_id)) {
                    seenIds.add(ans.user_id);
                    uniqueStudents.push({
                        id: ans.user_id,
                        nama: ans.users.nama,
                        nim: ans.users.nim || ans.users.username
                    });
                }
            });

            setStudentList(uniqueStudents);
            setAnswers([]);
            setSelectedStudent('');
        } catch (error) {
            console.error("Gagal menarik data mahasiswa", error);
            // Fallback: gunakan endpoint lama jika endpoint baru tidak tersedia
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/grading/exams/${examId}/answers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allAnswers = res.data.data || [];
                const uniqueStudents = [];
                const seenIds = new Set();
                allAnswers.forEach(ans => {
                    if (ans.users && !seenIds.has(ans.user_id)) {
                        seenIds.add(ans.user_id);
                        uniqueStudents.push({
                            id: ans.user_id,
                            nama: ans.users.nama,
                            nim: ans.users.nim || ans.users.username
                        });
                    }
                });
                setStudentList(uniqueStudents);
            } catch (fallbackError) {
                console.error("Gagal dengan endpoint fallback", fallbackError);
                Swal.fire('Error', 'Gagal memuat data mahasiswa', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // 4. Jika Mahasiswa dipilih, tarik semua jawabannya
    const handleStudentChange = async (e) => {
        const studentId = e.target.value;
        setSelectedStudent(studentId);
        setExpandedAnswers({});

        if (!studentId) {
            setAnswers([]);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/grading/exams/${selectedExam}/students/${studentId}/answers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnswers(res.data.data || []);
        } catch (error) {
            console.error("Gagal menarik jawaban mahasiswa", error);
            Swal.fire('Error', 'Gagal memuat jawaban mahasiswa', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 5. Simpan Nilai Manual (hanya untuk tipe 4)
    const handleSaveScore = async (ans, bobotMaksimal) => {
        const responseId = ans.id;
        // Gunakan nilai input jika dosen mengetik, jika tidak, gunakan nilai AI (ans.skor)
        const skorBaru = inputScores[responseId] !== undefined ? inputScores[responseId] : ans.skor;

        if (skorBaru === null || skorBaru === undefined || skorBaru === '') return Swal.fire('Oops', 'Masukkan nilai terlebih dahulu!', 'warning');
        if (parseFloat(skorBaru) > parseFloat(bobotMaksimal)) return Swal.fire('Ditolak', `Skor tidak boleh melebihi bobot maksimal (${bobotMaksimal})!`, 'error');

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/grading/responses/${responseId}/score`, { skor: skorBaru }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nilai disimpan!', showConfirmButton: false, timer: 1500 });

            // Update answers state untuk menandai sebagai sudah dinilai
            setAnswers(prev => prev.map(a => a.id === responseId ? { ...a, skor: skorBaru, graded: true } : a));
            setInputScores(prev => {
                const newScores = { ...prev };
                delete newScores[responseId];
                return newScores;
            });
        } catch (error) {
            Swal.fire('Gagal', 'Tidak dapat menyimpan nilai ke server', 'error');
        }
    };

    // 6. Batch Recalculate Skor Exam (setelah dosen selesai verifikasi)
    const handleRecalculate = async () => {
        if (!selectedExam) return;

        const result = await Swal.fire({
            title: 'Recalculate Skor?',
            text: 'Sistem akan menghitung ulang seluruh skor mahasiswa untuk ujian ini berdasarkan nilai terbaru.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0f4c3a',
            confirmButtonText: 'Ya, Hitung Ulang',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;

        setRecalculating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/grading/exams/${selectedExam}/recalculate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: res.data.message || 'Skor berhasil dihitung ulang!',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error) {
            console.error("Gagal recalculate:", error);
            Swal.fire('Gagal', 'Tidak dapat menghitung ulang skor. Coba lagi nanti.', 'error');
        } finally {
            setRecalculating(false);
        }
    };

    // Helper untuk menentukan apakah jawaban benar (untuk tipe 1 dan 2)
    const isAnswerCorrect = (ans) => {
        if (!ans.questions) return false;

        if (ans.questions.tipe_soal === 'TIPE_1') {
            // Single choice — jawaban disimpan di jawaban_teks
            return String(ans.jawaban_teks || '').trim().toUpperCase() === String(ans.questions.kunci_jawaban || '').trim().toUpperCase();
        } else if (ans.questions.tipe_soal === 'TIPE_2') {
            // Multiple choice — format: "A,C,E" (comma-separated)
            try {
                const studentAnswer = String(ans.jawaban_teks || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s).sort();
                const correctAnswer = String(ans.questions.kunci_jawaban || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s).sort();

                // Cek apakah semua jawaban siswa ada di kunci jawaban dan jumlahnya sama
                return studentAnswer.length === correctAnswer.length &&
                    studentAnswer.every((sa, idx) => sa === correctAnswer[idx]);
            } catch (error) {
                return false;
            }
        }
        return false;
    };

    const toggleExpand = (id) => {
        setExpandedAnswers(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Filter jawaban berdasarkan tipe
    const filteredAnswers = answers.filter(ans => {
        if (filterType === 'all') return true;
        if (filterType === 'auto') return ['TIPE_1', 'TIPE_2'].includes(ans.questions?.tipe_soal);
        if (filterType === 'manual') return ans.questions?.tipe_soal === 'TIPE_4';
        return true;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8 pb-12">
            
            {/* 🌟 HEADER HALAMAN */}
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Evaluasi & Penilaian Ujian</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">Lihat hasil jawaban mahasiswa untuk pilihan ganda (auto-koreksi) dan berikan penilaian manual untuk soal essay atau upload file.</p>
            </div>

            {/* 🌟 FILTER 3 TINGKAT */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Kotak 1: Pilih Matkul */}
                    <div className="flex-1 relative z-10">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">1</span>
                            Filter Mata Kuliah
                        </label>
                        <select value={selectedMatkul} onChange={handleMatkulChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer appearance-none shadow-sm">
                            <option value="" disabled>-- Pilih Mata Kuliah Terlebih Dahulu --</option>
                            {matkulList.map(mk => (
                                <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                            ))}
                        </select>
                    </div>

                    {/* Kotak 2: Pilih Ujian */}
                    <div className="flex-1 relative z-10">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-[#0f4c3a]/10 text-[#0f4c3a] rounded-full flex items-center justify-center text-[10px]">2</span>
                            Pilih Lembar Sesi Ujian
                        </label>
                        <select value={selectedExam} onChange={handleExamChange} disabled={!selectedMatkul || filteredExams.length === 0} className={`w-full px-5 py-4 border rounded-xl text-[14px] font-bold outline-none transition-all appearance-none shadow-sm ${!selectedMatkul ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 cursor-pointer'}`}>
                            <option value="" disabled>
                                {!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : filteredExams.length === 0 ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --"}
                            </option>
                            {filteredExams.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.nama_ujian} (Durasi: {ex.durasi} Menit)</option>
                            ))}
                        </select>
                    </div>

                    {/* Kotak 3: Pilih Mahasiswa */}
                    <div className="flex-1 relative z-10">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px]">3</span>
                            Pilih Mahasiswa
                        </label>
                        <select value={selectedStudent} onChange={handleStudentChange} disabled={!selectedExam || studentList.length === 0} className={`w-full px-5 py-4 border rounded-xl text-[14px] font-bold outline-none transition-all appearance-none shadow-sm ${!selectedExam || studentList.length === 0 ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer'}`}>
                            <option value="" disabled>
                                {!selectedExam ? "Pilih Ujian dulu ➔" : studentList.length === 0 ? "Belum ada mahasiswa" : "-- Pilih Mahasiswa --"}
                            </option>
                            {studentList.map(student => (
                                <option key={student.id} value={student.id}>{student.nama} ({student.nim})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filter Tipe Soal + Recalculate Button */}
                {selectedStudent && (
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Filter Tipe:</span>
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-[#0f4c3a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setFilterType('auto')}
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'auto' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Auto-Koreksi (PG)
                            </button>
                            <button
                                onClick={() => setFilterType('manual')}
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'manual' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Penilaian Manual
                            </button>
                        </div>

                        {/* Tombol Recalculate */}
                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating || !selectedExam}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#0f4c3a] to-[#1a6b52] hover:from-[#0a3628] hover:to-[#0f4c3a] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#0f4c3a]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {recalculating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Menghitung...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Recalculate Skor
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* 🌟 KUMPULAN JAWABAN MAHASISWA */}
            {selectedStudent && (
                <div className="space-y-6">
                    {/* Header Kecil Indikator Jumlah */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                            </div>
                            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">
                                Total Jawaban: <span className="text-blue-600 ml-1">{filteredAnswers.length} Soal</span>
                            </h4>
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                            Mahasiswa: {studentList.find(s => s.id === parseInt(selectedStudent))?.nama}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-4 border-[#0f4c3a]/20 border-t-[#0f4c3a] rounded-full animate-spin"></div>
                        </div>
                    ) : filteredAnswers.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 p-16 rounded-3xl text-center shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            </div>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight">Tidak Ada Data</h4>
                            <p className="text-slate-500 text-[14px] mt-2 font-medium">Tidak ada jawaban untuk filter yang dipilih.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-200/80">
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[60px]">No.</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[120px]">Tipe</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Pertanyaan & Jawaban</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[140px]">Status</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[200px]">Skor / Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredAnswers.map((ans, idx) => {
                                            const maxScore = 100;
                                            const tipe = ans.questions?.tipe_soal;
                                            const isAutoGraded = ['TIPE_1', 'TIPE_2'].includes(tipe);
                                            const isCorrect = isAutoGraded && isAnswerCorrect(ans);
                                            const isManualType = tipe === 'TIPE_4';
                                            const isExpanded = !!expandedAnswers[ans.id];

                                            return (
                                                <React.Fragment key={ans.id}>
                                                    <tr className={`hover:bg-slate-50/40 transition-colors ${isExpanded ? 'bg-slate-50/30' : ''}`}>
                                                        {/* 1. No */}
                                                        <td className="py-4 px-6 text-center">
                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-[12px]">
                                                                {idx + 1}
                                                            </span>
                                                        </td>

                                                        {/* 2. Tipe */}
                                                        <td className="py-4 px-6">
                                                            {tipe === 'TIPE_1' ? (
                                                                <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-100">
                                                                    PG Single
                                                                </span>
                                                            ) : tipe === 'TIPE_2' ? (
                                                                <span className="inline-flex items-center bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-purple-100">
                                                                    PG Multi
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-100">
                                                                    Essay / File
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* 3. Pertanyaan & Jawaban */}
                                                        <td className="py-4 px-6 space-y-2">
                                                            <div>
                                                                <p className={`text-[14px] font-semibold text-slate-700 leading-normal ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                                    {ans.questions?.isi_soal}
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="flex flex-wrap items-center gap-3 text-[12px]">
                                                                {isAutoGraded ? (
                                                                    <>
                                                                        <span className="text-slate-500">
                                                                            Pilihan: <strong className={`px-1.5 py-0.5 rounded font-black ${isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>{ans.jawaban_teks || '-'}</strong>
                                                                        </span>
                                                                        <span className="text-slate-300">|</span>
                                                                        <span className="text-slate-500">
                                                                            Kunci: <strong className="bg-slate-50 text-slate-700 px-1.5 py-0.5 border border-slate-150 rounded">{ans.questions?.kunci_jawaban || '-'}</strong>
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-slate-400">Jawaban:</span>
                                                                        {ans.file_path ? (
                                                                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                                Dokumen Terlampir
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-600 font-medium line-clamp-1 italic max-w-xs md:max-w-md">
                                                                                "{ans.jawaban_teks || 'Tidak mengisi kolom teks.'}"
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                <button 
                                                                    onClick={() => toggleExpand(ans.id)} 
                                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors ml-auto cursor-pointer"
                                                                >
                                                                    {isExpanded ? (
                                                                        <>
                                                                            Tutup Detail
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            Lihat Detail
                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* 4. Status */}
                                                        <td className="py-4 px-6 text-center">
                                                            {isAutoGraded ? (
                                                                isCorrect ? (
                                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                        Benar
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-100">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                        Salah
                                                                    </span>
                                                                )
                                                            ) : (
                                                                ans.skor !== null && ans.skor !== undefined ? (
                                                                    <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-teal-100">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                                                        Ternilai
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100 animate-pulse">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                        Perlu Nilai
                                                                    </span>
                                                                )
                                                            )}
                                                        </td>

                                                        {/* 5. Skor / Aksi */}
                                                        <td className="py-4 px-6 text-center">
                                                            <div className="flex items-center justify-center">
                                                                {isAutoGraded ? (
                                                                    <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-black text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                        {isCorrect ? maxScore : 0}
                                                                    </span>
                                                                ) : (
                                                                    // Manual Grade Input
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="relative flex items-center">
                                                                            <input
                                                                                type="number" min="0" max={maxScore}
                                                                                value={inputScores[ans.id] !== undefined ? inputScores[ans.id] : (ans.skor !== null && ans.skor !== undefined ? Math.round(Number(ans.skor)) : '')}
                                                                                onChange={(e) => setInputScores({ ...inputScores, [ans.id]: e.target.value })}
                                                                                disabled={ans.skor !== null && ans.skor !== undefined && inputScores[ans.id] === undefined}
                                                                                className="w-16 px-2.5 py-1 text-center font-bold text-slate-800 bg-white border border-slate-350 rounded-lg focus:border-[#0f4c3a] focus:ring-1 focus:ring-[#0f4c3a]/20 outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 transition-all shadow-sm"
                                                                                placeholder="0"
                                                                            />
                                                                            <span className="text-[11px] font-bold text-slate-400 ml-1.5">/ {maxScore}</span>
                                                                        </div>

                                                                        {ans.skor !== null && ans.skor !== undefined && inputScores[ans.id] === undefined ? (
                                                                            <button 
                                                                                onClick={() => setInputScores({ ...inputScores, [ans.id]: ans.skor })} 
                                                                                title="Edit Nilai"
                                                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                            </button>
                                                                        ) : (
                                                                            <button 
                                                                                onClick={() => handleSaveScore(ans, maxScore)} 
                                                                                title="Simpan Nilai"
                                                                                className="p-1.5 text-white hover:text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm cursor-pointer"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Sub-row */}
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/30">
                                                            <td colSpan={5} className="p-5 border-t border-b border-slate-100">
                                                                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                                                                    {/* Section Title */}
                                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                            Detail Soal & Jawaban Lengkap
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-slate-400">
                                                                            Response ID: #{ans.id}
                                                                        </span>
                                                                    </div>

                                                                    {/* Pertanyaan Lengkap */}
                                                                    <div className="space-y-1">
                                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pertanyaan / Instruksi</h5>
                                                                        <p className="text-[14px] font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                                            {ans.questions?.isi_soal}
                                                                        </p>
                                                                    </div>

                                                                    {/* Tampilkan Opsi Jawaban (jika TIPE_1 atau TIPE_2) */}
                                                                    {isAutoGraded && ans.questions?.opsi_jawaban && (
                                                                        <div className="space-y-2 pt-2">
                                                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Daftar Pilihan Jawaban</h5>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                {(() => {
                                                                                    try {
                                                                                        const opsi = JSON.parse(ans.questions.opsi_jawaban);
                                                                                        const studentAnswers = tipe === 'TIPE_2'
                                                                                            ? String(ans.jawaban_teks || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s)
                                                                                            : [String(ans.jawaban_teks || '').trim().toUpperCase()];
                                                                                        const correctAnswers = tipe === 'TIPE_2'
                                                                                            ? String(ans.questions.kunci_jawaban || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s)
                                                                                            : [String(ans.questions.kunci_jawaban || '').trim().toUpperCase()];

                                                                                        return Object.entries(opsi).map(([key, value]) => {
                                                                                            const isSelected = studentAnswers.includes(key);
                                                                                            const isCorrectAnswer = correctAnswers.includes(key);

                                                                                            return (
                                                                                                <div 
                                                                                                    key={key} 
                                                                                                    className={`p-3 rounded-xl border-2 flex items-start gap-3 transition-colors ${
                                                                                                        isSelected 
                                                                                                            ? (isCorrectAnswer ? 'bg-emerald-50/70 border-emerald-350 text-slate-800 font-medium' : 'bg-rose-50/70 border-rose-355 text-slate-800 font-medium') 
                                                                                                            : (isCorrectAnswer ? 'bg-blue-50/70 border-blue-200 text-slate-800 font-medium' : 'bg-slate-50/50 border-slate-200 text-slate-600')
                                                                                                    }`}
                                                                                                >
                                                                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                                                                                                        isSelected 
                                                                                                            ? (isCorrectAnswer ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800') 
                                                                                                            : (isCorrectAnswer ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600')
                                                                                                    }`}>
                                                                                                        {key}
                                                                                                    </span>
                                                                                                    <div className="space-y-0.5">
                                                                                                        <p className="text-[13px] leading-normal">{value}</p>
                                                                                                        <div className="flex gap-2 mt-1">
                                                                                                            {isSelected && <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Dipilih Siswa</span>}
                                                                                                            {isCorrectAnswer && <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Jawaban Benar</span>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        });
                                                                                    } catch (error) {
                                                                                        return <p className="text-red-500 text-[12px]">Error parsing options</p>;
                                                                                    }
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Tampilkan Jawaban Essay / File (jika TIPE_4) */}
                                                                    {isManualType && (
                                                                        <div className="space-y-2 pt-2">
                                                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Penyelesaian Lengkap Mahasiswa</h5>
                                                                            {ans.file_path ? (
                                                                                <div className="p-4 bg-blue-50/30 border border-blue-200 rounded-xl flex items-center justify-between">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                                                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-[13px] font-bold text-slate-800">Dokumen Lampiran Ujian</p>
                                                                                            <p className="text-[11px] font-medium text-slate-500">Silakan unduh atau tinjau berkas yang dikirimkan.</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <a 
                                                                                        href={`${backendFileBaseUrl}/${String(ans.file_path || '').replace(/^\/+/, '')}`} 
                                                                                        target="_blank" 
                                                                                        rel="noreferrer" 
                                                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                                                                    >
                                                                                        Unduh File
                                                                                    </a>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                                                    {ans.jawaban_teks || <span className="text-slate-400 italic">Peserta tidak mengisi kolom teks jawaban.</span>}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
