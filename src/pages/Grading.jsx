import { useState, useEffect } from 'react';
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

    // State untuk filter tipe soal
    const [filterType, setFilterType] = useState('all'); // 'all', 'auto', 'manual' 

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
    };

    // 3. Jika Ujian dipilih, tarik daftar mahasiswa yang ikut ujian
    const handleExamChange = async (e) => {
        const examId = e.target.value;
        setSelectedExam(examId);

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

    // Helper untuk menentukan apakah jawaban benar (untuk tipe 1 dan 2)
    const isAnswerCorrect = (ans) => {
        if (!ans.questions) return false;

        if (ans.questions.tipe_soal === 'TIPE_1') {
            // Single choice
            return ans.pilihan_jawaban === ans.questions.kunci_jawaban;
        } else if (ans.questions.tipe_soal === 'TIPE_2') {
            // Multiple choice - bandingkan array jawaban
            try {
                const studentAnswer = JSON.parse(ans.pilihan_jawaban || '[]');
                const correctAnswer = JSON.parse(ans.questions.kunci_jawaban || '[]');

                if (!Array.isArray(studentAnswer) || !Array.isArray(correctAnswer)) return false;

                // Cek apakah semua jawaban siswa ada di kunci jawaban dan jumlahnya sama
                return studentAnswer.length === correctAnswer.length &&
                    studentAnswer.every(sa => correctAnswer.includes(sa));
            } catch (error) {
                return false;
            }
        }
        return false;
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

                {/* Filter Tipe Soal */}
                {selectedStudent && (
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
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
                )}
            </div>

            {/* 🌟 KUMPULAN KARTU JAWABAN MAHASISWA */}
            {selectedStudent && (
                <div className="space-y-8">
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
                        <div className="text-[11px] text-slate-500 font-medium">
                            {studentList.find(s => s.id === parseInt(selectedStudent))?.nama}
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
                        filteredAnswers.map((ans) => {
                            const maxScore = 100;
                            const tipe = ans.questions?.tipe_soal;
                            const isAutoGraded = ['TIPE_1', 'TIPE_2'].includes(tipe);
                            const isCorrect = isAnswerCorrect(ans);
                            const isManualType = tipe === 'TIPE_4';

                            return (
                                <div key={ans.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden relative group hover:border-[#0f4c3a]/30 transition-all">
                                    {/* Indicator Bar */}
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${isAutoGraded ? (isCorrect ? 'bg-gradient-to-b from-emerald-500 to-green-600' : 'bg-gradient-to-b from-red-500 to-rose-600') : 'bg-gradient-to-b from-[#d4af37] to-amber-500'}`}></div>

                                    <div className="p-8 md:p-10 flex flex-col md:flex-row gap-10">

                                        {/* Kiri: Identitas & Isi Jawaban */}
                                        <div className="flex-[2.5] space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-lg border border-slate-200">
                                                        {ans.users?.nama?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[16px] font-black text-slate-800">{ans.users?.nama}</h4>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                                                {tipe === 'TIPE_1' ? 'PG Single' : tipe === 'TIPE_2' ? 'PG Multiple' : 'Essay/Upload'}
                                                            </span>
                                                            {isAutoGraded && (
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                                    {isCorrect ? '✓ Benar' : '✗ Salah'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Pertanyaan / Instruksi
                                                </p>
                                                <p className="text-[15px] font-semibold text-slate-700 leading-relaxed">{ans.questions?.isi_soal}</p>

                                                {/* Tampilkan opsi untuk pilihan ganda */}
                                                {(tipe === 'TIPE_1' || tipe === 'TIPE_2') && ans.questions?.opsi_jawaban && (
                                                    <div className="mt-4 space-y-2">
                                                        {(() => {
                                                            try {
                                                                const opsi = JSON.parse(ans.questions.opsi_jawaban);
                                                                const studentAnswers = tipe === 'TIPE_2' ? JSON.parse(ans.pilihan_jawaban || '[]') : [ans.pilihan_jawaban];
                                                                const correctAnswers = tipe === 'TIPE_2' ? JSON.parse(ans.questions.kunci_jawaban || '[]') : [ans.questions.kunci_jawaban];

                                                                return Object.entries(opsi).map(([key, value]) => {
                                                                    const isSelected = studentAnswers.includes(key);
                                                                    const isCorrectAnswer = correctAnswers.includes(key);

                                                                    return (
                                                                        <div key={key} className={`p-3 rounded-lg border-2 ${isSelected ? (isCorrectAnswer ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300') : (isCorrectAnswer ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200')}`}>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px] ${isSelected ? (isCorrectAnswer ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800') : (isCorrectAnswer ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600')}`}>
                                                                                    {key}
                                                                                </span>
                                                                                <span className="text-[14px] font-medium text-slate-700">{value}</span>
                                                                                {isSelected && <span className="ml-auto text-[11px] font-black">Dipilih Mahasiswa</span>}
                                                                                {isCorrectAnswer && !isSelected && <span className="ml-auto text-[11px] font-black text-blue-600">Jawaban Benar</span>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                });
                                                            } catch (error) {
                                                                return <p className="text-red-500 text-[12px]">Error parsing options</p>;
                                                            }
                                                        })()}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Jawaban untuk tipe 4 (essay/upload) */}
                                            {isManualType && (
                                                <div>
                                                    <p className="text-[10px] font-black text-[#0f4c3a] uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Penyelesaian Mahasiswa
                                                    </p>
                                                    {ans.file_path ? (
                                                        <div className="p-6 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                                <div>
                                                                    <p className="text-[13px] font-bold text-slate-800">Dokumen Terlampir</p>
                                                                    <p className="text-[11px] font-medium text-slate-500">Klik tombol di samping untuk melihat file.</p>
                                                                </div>
                                                            </div>
                                                            <a href={`${backendFileBaseUrl}/${String(ans.file_path || '').replace(/^\/+/, '')}`} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                                                Lihat File
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-[15px] font-medium text-slate-800 leading-loose whitespace-pre-wrap">
                                                            {ans.jawaban_teks || <span className="text-slate-400 italic">Peserta tidak mengisi kolom teks.</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Kanan: Panel Nilai */}
                                        {isAutoGraded ? (
                                            // Tampilan untuk auto-graded (read-only)
                                            <div className={`flex-1 rounded-2xl p-8 flex flex-col justify-center text-center shadow-lg relative overflow-hidden ${isCorrect ? 'bg-gradient-to-b from-emerald-500 to-green-600' : 'bg-gradient-to-b from-red-500 to-rose-600'}`}>
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none"></div>

                                                <label className="block text-[11px] font-black text-white/80 uppercase tracking-widest mb-4">Skor Auto-Koreksi</label>

                                                <div className="flex flex-col items-center justify-center gap-3 mb-6 relative z-10">
                                                    <div className="w-full max-w-[140px] text-center text-6xl font-black text-white py-4">
                                                        {isCorrect ? maxScore : 0}
                                                    </div>
                                                    <div className="bg-black/20 px-4 py-1.5 rounded-full border border-white/20 flex flex-col items-center gap-1">
                                                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Batas Maks: {maxScore}</span>
                                                    </div>
                                                </div>

                                                <div className="w-full px-6 py-4 bg-white/20 text-white font-black text-[13px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 relative z-10">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Sudah Dinilai Otomatis
                                                </div>
                                            </div>
                                        ) : (
                                            // Panel penilaian manual untuk tipe 4
                                            <div className="flex-1 bg-gradient-to-b from-[#0f4c3a] to-[#0a3628] rounded-2xl p-8 flex flex-col justify-center text-center shadow-lg relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none"></div>

                                                <label className="block text-[11px] font-black text-emerald-300 uppercase tracking-widest mb-4">
                                                    {ans.skor !== null && ans.skor !== undefined ? 'Nilai Tersimpan' : 'Skor Final Dosen'}
                                                </label>

                                                <div className="flex flex-col items-center justify-center gap-3 mb-8 relative z-10">
                                                    <input
                                                        type="number" min="0" max={maxScore}
                                                        value={inputScores[ans.id] !== undefined ? inputScores[ans.id] : (ans.skor !== null && ans.skor !== undefined ? Math.round(Number(ans.skor)) : '')}
                                                        onChange={(e) => setInputScores({ ...inputScores, [ans.id]: e.target.value })}
                                                        disabled={ans.skor !== null && ans.skor !== undefined && inputScores[ans.id] === undefined}
                                                        className="w-full max-w-[140px] text-center text-5xl font-black text-slate-800 px-2 py-4 bg-white border-4 border-[#d4af37] rounded-2xl focus:border-emerald-400 focus:ring-0 outline-none transition-colors shadow-inner disabled:opacity-50"
                                                        placeholder="0"
                                                    />
                                                    <div className="bg-black/20 px-4 py-1.5 rounded-full border border-white/10 flex flex-col items-center gap-1">
                                                        <span className="text-[11px] font-black text-emerald-100 uppercase tracking-widest">Batas Maks: {maxScore}</span>
                                                    </div>
                                                </div>

                                                {ans.skor !== null && ans.skor !== undefined && inputScores[ans.id] === undefined ? (
                                                    <button onClick={() => setInputScores({ ...inputScores, [ans.id]: ans.skor })} className="w-full px-6 py-4 bg-white/20 hover:bg-white/30 text-white font-black text-[13px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Edit Nilai
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleSaveScore(ans, maxScore)} className="w-full px-6 py-4 bg-[#d4af37] hover:bg-[#b5952f] text-[#0f4c3a] font-black text-[13px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 flex items-center justify-center gap-2 relative z-10">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        Simpan Nilai
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </motion.div>
    );
}
