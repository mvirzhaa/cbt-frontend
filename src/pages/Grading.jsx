import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config/api';
import matkulService from '../services/matkul.service';
import examService from '../services/exam.service';
import gradingService from '../services/grading.service';
import MathText from '../components/MathText';
import MatkulSelect from '../components/MatkulSelect';

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
    const [attemptsByUser, setAttemptsByUser] = useState({}); // user_id -> attempt (buat tombol Reset & Verifikasi)
    const [resettingAttempt, setResettingAttempt] = useState(false);

    // Info bobot/grading_type ujian yang lagi dipilih -- dipakai modal verifikasi
    // & estimasi nilai akhir (dipindah ke sini dari RekapNilai.jsx: verifikasi +
    // publish nilai sekarang jadi satu tempat sama penilaian manual).
    const [examInfo, setExamInfo] = useState(null);

    // State Modal Verifikasi (dipindah dari RekapNilai.jsx -- lihat CLAUDE.md:
    // nilai yang belum diverifikasi di sini tidak bisa dipush ke SIAKAD, gating-nya
    // sudah ditegakkan backend lewat syarat exam_attempts.status === 'SELESAI').
    const [verifyModal, setVerifyModal] = useState({
        isOpen: false,
        attempt: null,
        scores: { pilgan: 0, esai: 0, file: 0 }
    });

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

    // Deep-link dari tombol "Verifikasi" di Rekap Nilai (RekapNilai.jsx mengirim
    // ?exam_id=&student_id= begitu tabel verifikasi dipindah ke sini) -- begitu
    // daftar ujian termuat, auto-pilih matkul+ujian+mahasiswa yang dituju. Pola
    // sama persis dengan deep-link exam_id dari LMS yang sudah ada di RekapNilai.jsx.
    useEffect(() => {
        const list = allExams?.data;
        if (!Array.isArray(list) || list.length === 0) return;

        const params = new URLSearchParams(window.location.search);
        const examIdParam = params.get('exam_id');
        const studentIdParam = params.get('student_id');
        if (!examIdParam) return;
        window.history.replaceState({}, '', window.location.pathname);

        const ex = list.find(e => e.id.toString() === examIdParam);
        if (!ex) return;

        setSelectedMatkul(ex.kode_mk);
        setFilteredExams(list.filter(e => e.kode_mk === ex.kode_mk));
        setSelectedExam(examIdParam);
        applyDeepLinkedExam(examIdParam, studentIdParam);
    }, [allExams]);

    const applyDeepLinkedExam = async (examId, studentIdParam) => {
        await handleExamChange({ target: { value: examId } });
        if (!studentIdParam) return;
        setSelectedStudent(studentIdParam);
        setLoading(true);
        try {
            const data = await gradingService.getStudentAnswers(examId, studentIdParam);
            setAnswers(data || []);
        } catch (error) {
            console.error("Gagal menarik jawaban mahasiswa (deep-link):", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [resMatkul, resExams] = await Promise.all([
                matkulService.getMatkul(),
                examService.getExams()
            ]);
            setMatkulList(resMatkul || []);
            setAllExams(resExams || []);
        } catch (error) { 
            console.error("Gagal menarik data awal:", error); 
        }
    };

    // 2. Jika Matkul dipilih, saring Ujiannya
    const handleMatkulChange = (mkId) => {
        setSelectedMatkul(mkId);
        
        const examsForThisMatkul = allExams?.data?.filter(ex => ex.kode_mk === mkId) || [];
        setFilteredExams(examsForThisMatkul);
        
        setSelectedExam('');
        setAnswers([]); // Reset daftar jawaban
        setExpandedAnswers({});
        setExamInfo(null);
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
            setAttemptsByUser({});
            setExamInfo(null);
            return;
        }

        fetchAttemptsMap(examId);

        setLoading(true);
        try {
            // Ambil semua jawaban untuk mendapatkan daftar mahasiswa unik
            const resData = await gradingService.getAllAnswers(examId);
            const allAnswers = resData?.data || resData || [];

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
                const resData = await gradingService.getAnswers(examId);
                const allAnswers = resData?.data || resData || [];
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

    // 3b. Peta user_id -> attempt (buat tau attempt_id & status sinkron SIAKAD, dipakai tombol Reset)
    const fetchAttemptsMap = async (examId) => {
        try {
            const resData = await gradingService.getAttempts(examId);
            const list = resData?.data || resData || [];
            const map = {};
            list.forEach(a => { map[a.user_id] = a; });
            setAttemptsByUser(map);
            setExamInfo(resData?.exam_info || null);
        } catch (error) {
            console.error("Gagal menarik data attempt", error);
        }
    };

    // Estimasi nilai akhir SEBELUM diverifikasi -- sama persis dengan
    // RekapNilai.jsx (dipindah ke sini bareng modal verifikasinya).
    const estimateFinalScore = (attempt) => {
        if (!attempt) return null;
        if (examInfo?.grading_type === 'PER_SOAL') {
            return attempt.preview_final_score !== null && attempt.preview_final_score !== undefined
                ? attempt.preview_final_score
                : null;
        }
        return (
            (attempt.skor_pilgan_100 * ((examInfo?.bobot_pilgan || 0) / 100)) +
            (attempt.skor_esai_100 * ((examInfo?.bobot_esai || 0) / 100)) +
            (attempt.skor_file_100 * ((examInfo?.bobot_upload || 0) / 100))
        );
    };

    const openVerifyModal = () => {
        const attempt = attemptsByUser[selectedStudent];
        if (!attempt) return;
        setVerifyModal({
            isOpen: true,
            attempt,
            scores: {
                pilgan: attempt.skor_pilgan_100,
                esai: attempt.skor_esai_100,
                file: attempt.skor_file_100
            }
        });
    };

    const closeVerifyModal = () => {
        setVerifyModal({ isOpen: false, attempt: null, scores: { pilgan: 0, esai: 0, file: 0 } });
    };

    const handleScoreChange = (type, value) => {
        let num = parseFloat(value);
        if (isNaN(num)) num = 0;
        if (num > 100) num = 100;
        if (num < 0) num = 0;
        setVerifyModal(prev => ({
            ...prev,
            scores: { ...prev.scores, [type]: num }
        }));
    };

    const submitVerification = async () => {
        try {
            // Mode Per Soal: nilai akhir dihitung server-side dari bobot tiap soal,
            // tidak ada override kategori pilgan/esai/upload untuk dikirim.
            const payload = examInfo?.grading_type === 'PER_SOAL' ? {} : {
                skor_pilgan_100: verifyModal.scores.pilgan,
                skor_esai_100: verifyModal.scores.esai,
                skor_file_100: verifyModal.scores.file
            };

            await gradingService.verifyExamAttempt(verifyModal.attempt.attempt_id, payload);

            Swal.fire({
                icon: 'success',
                title: 'Verifikasi Berhasil!',
                text: 'Nilai telah dipublikasikan ke mahasiswa dan siap dipush ke SIAKAD.',
                timer: 1800,
                showConfirmButton: false
            });

            closeVerifyModal();
            fetchAttemptsMap(selectedExam);
        } catch (error) {
            console.error("Gagal verifikasi:", error);
            Swal.fire('Gagal Verifikasi', error.response?.data?.message || 'Terjadi kesalahan saat memverifikasi nilai.', 'error');
        }
    };

    // Reset attempt mahasiswa yang lagi dipilih, supaya dia bisa ujian ulang dari awal
    const handleResetAttempt = async (force = false, reason = '') => {
        const attempt = attemptsByUser[selectedStudent];
        if (!attempt) return;

        if (!force) {
            const namaMhs = (studentList?.data || studentList || []).find(s => s.id === parseInt(selectedStudent))?.nama;
            const result = await Swal.fire({
                title: 'Reset Attempt Ujian?',
                html: `Jawaban dan nilai <strong>${namaMhs}</strong> untuk ujian ini akan <strong>dihapus permanen</strong>, supaya dia bisa mengerjakan lagi dari awal. Tindakan ini tidak bisa dibatalkan.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Ya, Reset',
                cancelButtonText: 'Batal'
            });
            if (!result.isConfirmed) return;
        }

        setResettingAttempt(true);
        try {
            const res = await gradingService.resetAttempt(attempt.attempt_id, force, reason);
            Swal.fire({ icon: 'success', title: 'Attempt Direset', text: res.message, timer: 2000, showConfirmButton: false });
            setSelectedStudent('');
            setAnswers([]);
            handleExamChange({ target: { value: selectedExam } }); // refresh daftar mahasiswa & attempt
        } catch (error) {
            console.error("Gagal reset attempt:", error);
            const errData = error.response?.data;
            if (errData?.canForce || errData?.needsReason) {
                const forceResult = await Swal.fire({
                    title: 'Sudah Terkirim ke SIAKAD',
                    html: `${errData.message}<br/><br/>Kalau Anda <strong>yakin</strong> sudah membereskan nilainya langsung di SIAKAD (sistem ini tidak mengecek ulang ke sana), isi alasannya untuk paksa reset attempt CBT-nya.`,
                    icon: 'warning',
                    input: 'textarea',
                    inputPlaceholder: 'Alasan reset paksa (wajib diisi, tercatat di log)...',
                    inputValidator: (value) => !value?.trim() ? 'Alasan wajib diisi.' : undefined,
                    showCancelButton: true,
                    confirmButtonColor: '#dc2626',
                    confirmButtonText: 'Ya, Paksa Reset',
                    cancelButtonText: 'Batal'
                });
                if (forceResult.isConfirmed) {
                    return handleResetAttempt(true, forceResult.value.trim());
                }
            } else {
                Swal.fire('Error', errData?.message || 'Gagal mereset attempt ujian.', 'error');
            }
        } finally {
            setResettingAttempt(false);
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
            const data = await gradingService.getStudentAnswers(selectedExam, studentId);
            setAnswers(data || []);
        } catch (error) {
            console.error("Gagal menarik jawaban mahasiswa", error);
            Swal.fire('Error', 'Gagal memuat jawaban mahasiswa', 'error');
        } finally {
            setLoading(false);
        }
    };

    // 4b. Dipanggil dari ikon "Lihat Jawaban" di tabel Daftar Mahasiswa --
    // menggantikan dropdown "Pilih Mahasiswa" yang sebelumnya ada di filter.
    const viewStudentAnswers = (studentId) => handleStudentChange({ target: { value: studentId.toString() } });

    const backToStudentList = () => {
        setSelectedStudent('');
        setAnswers([]);
        setExpandedAnswers({});
    };

    // 5. Simpan Nilai Manual (hanya untuk tipe 4)
    const handleSaveScore = async (ans, bobotMaksimal) => {
        const responseId = ans.id;
        // Gunakan nilai input jika dosen mengetik, jika tidak, gunakan nilai AI (ans.skor)
        const skorBaru = inputScores[responseId] !== undefined ? inputScores[responseId] : ans.skor;

        if (skorBaru === null || skorBaru === undefined || skorBaru === '') return Swal.fire('Oops', 'Masukkan nilai terlebih dahulu!', 'warning');
        if (parseFloat(skorBaru) > parseFloat(bobotMaksimal)) return Swal.fire('Ditolak', `Skor tidak boleh melebihi bobot maksimal (${bobotMaksimal})!`, 'error');

        try {
            await gradingService.saveScore(responseId, skorBaru);

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nilai disimpan!', showConfirmButton: false, timer: 1500 });

            // Update answers state untuk menandai sebagai sudah dinilai
            setAnswers(prev => {
                const prevArray = prev?.data || prev || [];
                return prevArray.map(a => a.id === responseId ? { ...a, skor: skorBaru, graded: true } : a);
            });
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
            const resultData = await gradingService.recalculate(selectedExam);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: resultData.message || 'Skor berhasil dihitung ulang!',
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
    const filteredAnswers = (answers?.data || answers || []).filter(ans => {
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
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 relative">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none -z-10">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Kotak 1: Pilih Matkul */}
                    <div className="flex-1 md:flex-[1.4] relative z-10">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">1</span>
                            Filter Mata Kuliah
                        </label>
                        <MatkulSelect matkulList={matkulList} value={selectedMatkul} onChange={handleMatkulChange} placeholder="-- Pilih Mata Kuliah Terlebih Dahulu --" />
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

                </div>

                {/* Filter Tipe Soal + Recalculate Button */}
                {selectedStudent && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                        <div className="flex flex-wrap items-center gap-3">
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
                            className="w-full sm:w-auto justify-center px-5 py-2.5 bg-gradient-to-r from-[#0f4c3a] to-[#1a6b52] hover:from-[#0a3628] hover:to-[#0f4c3a] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#0f4c3a]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

            {/* 🌟 DAFTAR MAHASISWA MENGERJAKAN -- menggantikan dropdown "Pilih
                Mahasiswa": tiap baris punya ikon "Lihat Jawaban" buat masuk ke
                detail jawaban + verifikasi mahasiswa itu. */}
            {selectedExam && !selectedStudent && (
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Daftar Mahasiswa Mengerjakan</h3>
                        <span className="bg-[#0f4c3a]/10 text-[#0f4c3a] text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-[#0f4c3a]/20">Peserta: {studentList.length}</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-white">
                                    <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[60px] text-center">No.</th>
                                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mahasiswa</th>
                                    <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="py-5 px-6 text-[10px] font-black text-[#0f4c3a] uppercase tracking-widest text-center bg-[#0f4c3a]/5">Nilai Akhir</th>
                                    <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-16 text-center text-slate-400 font-bold animate-pulse">Memuat data...</td></tr>
                                ) : studentList.length === 0 ? (
                                    <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold text-sm">Belum ada mahasiswa yang mengumpulkan ujian ini.</td></tr>
                                ) : (
                                    studentList.map((student, idx) => {
                                        const attempt = attemptsByUser[student.id];
                                        const isVerified = attempt?.status === 'SELESAI';
                                        const estimate = attempt ? estimateFinalScore(attempt) : null;
                                        return (
                                            <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="py-4 px-6 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-[12px]">{idx + 1}</span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <p className="font-black text-slate-800 text-[13px]">{student.nama}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{student.nim}</p>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {isVerified ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Final</span>
                                                    ) : attempt ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">-</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-center bg-[#0f4c3a]/[0.02]">
                                                    {isVerified ? (
                                                        <span className="text-lg font-black tracking-tight text-[#0f4c3a]">{parseFloat(Number(attempt.final_score).toFixed(2))}</span>
                                                    ) : estimate !== null ? (
                                                        <span className="text-lg font-black tracking-tight italic text-slate-400">≈{parseFloat(Number(estimate).toFixed(2))}</span>
                                                    ) : (
                                                        <span className="text-lg font-black tracking-tight text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <button
                                                        onClick={() => viewStudentAnswers(student.id)}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        Lihat Jawaban
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 🌟 VERIFIKASI & PUBLISH NILAI (dipindah dari Rekap Nilai -- lihat
                CLAUDE.md: selama belum diverifikasi di sini, nilai tidak akan bisa
                dipush ke SIAKAD, karena backend mensyaratkan exam_attempts.status
                === 'SELESAI' sebelum attempt bisa dipush). */}
            {selectedStudent && attemptsByUser[selectedStudent] && (() => {
                const attempt = attemptsByUser[selectedStudent];
                const isVerified = attempt.status === 'SELESAI';
                const bobotSoalBelumPas = examInfo?.grading_type === 'PER_SOAL' && examInfo?.total_bobot_soal !== 100;
                const estimate = estimateFinalScore(attempt);
                return (
                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="flex items-center gap-5">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status Verifikasi</p>
                                {isVerified ? (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Final — Siap Dipush ke SIAKAD</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Belum Diverifikasi — Belum Bisa Dipush</span>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    {isVerified ? 'Nilai Akhir Terpublikasi' : 'Estimasi Nilai Akhir'}
                                </p>
                                <p className={`text-xl font-black tracking-tight ${isVerified ? 'text-[#0f4c3a]' : 'text-slate-400 italic'}`}>
                                    {isVerified
                                        ? parseFloat(Number(attempt.final_score).toFixed(2))
                                        : (estimate !== null ? `≈${parseFloat(Number(estimate).toFixed(2))}` : '-')}
                                </p>
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            {bobotSoalBelumPas && (
                                <p className="text-[11px] text-red-600 font-medium">⚠ Total bobot soal {examInfo?.total_bobot_soal}, bukan 100 — perbaiki di menu Kelola Soal dulu.</p>
                            )}
                            {!bobotSoalBelumPas && !attempt.is_all_graded && (
                                <p className="text-[11px] text-amber-600 font-medium">⚠ Belum semua soal dinilai — nilai masih bisa berubah.</p>
                            )}
                            <button
                                onClick={openVerifyModal}
                                disabled={bobotSoalBelumPas}
                                className={`px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
                            >
                                {isVerified ? 'Edit Verifikasi' : 'Verifikasi & Publish'}
                            </button>
                        </div>
                    </div>
                );
            })()}

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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={backToStudentList}
                                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Daftar Mahasiswa
                            </button>
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                                Mahasiswa: {(studentList?.data || studentList || []).find(s => s.id === parseInt(selectedStudent))?.nama}
                            </div>
                            {attemptsByUser[selectedStudent] && (
                                <button
                                    onClick={() => handleResetAttempt()}
                                    disabled={resettingAttempt}
                                    title={attemptsByUser[selectedStudent]?.siakad_sync_status === 'TERKIRIM' ? 'Sudah terkirim ke SIAKAD, batalkan dulu di sana' : 'Hapus attempt supaya mahasiswa bisa ujian ulang'}
                                    className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 transition-colors"
                                >
                                    {resettingAttempt ? 'Mereset...' : 'Reset Attempt'}
                                </button>
                            )}
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
                                            // FIX 2026-08-22: sebelumnya hardcode 100, gak peduli bobot
                                            // soal ini beneran berapa -- bikin dosen input skor 0-100
                                            // padahal soalnya cuma bobot 20, dan tampilan hasil PG benar
                                            // juga salah nunjukin "100" padahal poin aslinya cuma sebesar bobot.
                                            const maxScore = parseFloat(ans.questions?.bobot_nilai) || 10;
                                            const tipe = ans.questions?.tipe_soal;
                                            const isAutoGraded = ['TIPE_1', 'TIPE_2'].includes(tipe);
                                            const isCorrect = isAutoGraded && isAnswerCorrect(ans);
                                            const isManualType = tipe === 'TIPE_3' || tipe === 'TIPE_4';
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
                                                                    <MathText text={ans.questions?.isi_soal} />
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
                                                                                value={inputScores[ans.id] !== undefined ? inputScores[ans.id] : (ans.skor !== null && ans.skor !== undefined ? parseFloat(Number(ans.skor).toFixed(2)) : '')}
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
                                                                            <MathText text={ans.questions?.isi_soal} />
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
                                                                                                        <p className="text-[13px] leading-normal"><MathText text={value} /></p>
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
                                                                        <div className="space-y-4 pt-2">
                                                                            {/* Jawaban Mahasiswa */}
                                                                            <div className="space-y-2">
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

                                                                            {/* Kunci Jawaban Essay */}
                                                                            <div className="space-y-2">
                                                                                <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                                                    Kunci Jawaban / Model Jawaban
                                                                                </h5>
                                                                                {ans.questions?.kunci_jawaban ? (
                                                                                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[14px] font-medium text-emerald-900 leading-relaxed whitespace-pre-wrap">
                                                                                        <MathText text={ans.questions.kunci_jawaban} />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[13px] font-medium text-slate-400 italic">
                                                                                        Kunci jawaban belum diisi. Silakan edit soal di menu <strong>Manajemen Bank Soal</strong> untuk menambahkan model jawaban.
                                                                                    </div>
                                                                                )}
                                                                            </div>
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

            {/* MODAL VERIFIKASI (dipindah dari RekapNilai.jsx) */}
            <AnimatePresence>
                {verifyModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h4 className="font-black text-slate-800">Verifikasi Nilai Mahasiswa</h4>
                                <button onClick={closeVerifyModal} className="text-slate-400 hover:text-slate-600 p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-black">
                                        {verifyModal.attempt?.nama_mahasiswa?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{verifyModal.attempt?.nama_mahasiswa}</p>
                                        <p className="text-xs font-medium text-slate-500">{verifyModal.attempt?.nim}</p>
                                    </div>
                                </div>

                                {examInfo?.grading_type === 'PER_SOAL' ? (
                                    <>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                            Ujian ini bermode <b>Per Soal</b> — nilai akhir dihitung otomatis dari bobot tiap soal (bukan persentase kategori), langsung dari jawaban yang sudah dinilai di tabel di atas. Tidak ada skor kategori untuk disesuaikan manual di sini.
                                        </p>
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center mt-2">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                                                {verifyModal.attempt?.final_score !== null && verifyModal.attempt?.final_score !== undefined ? 'Nilai Akhir Terpublikasi:' : 'Estimasi Nilai Akhir:'}
                                            </span>
                                            <span className="text-xl font-black text-[#0f4c3a]">
                                                {verifyModal.attempt?.final_score !== null && verifyModal.attempt?.final_score !== undefined
                                                    ? parseFloat(Number(verifyModal.attempt.final_score).toFixed(2))
                                                    : (verifyModal.attempt?.preview_final_score !== null && verifyModal.attempt?.preview_final_score !== undefined
                                                        ? `≈${parseFloat(Number(verifyModal.attempt.preview_final_score).toFixed(2))}`
                                                        : 'Belum ada jawaban dinilai')}
                                            </span>
                                        </div>
                                        {verifyModal.attempt && !verifyModal.attempt.is_all_graded && verifyModal.attempt.final_score === null && (
                                            <p className="text-xs text-amber-600 font-medium">⚠ Belum semua soal dinilai — estimasi ini masih bisa berubah.</p>
                                        )}
                                        {examInfo?.total_bobot_soal !== 100 && (
                                            <p className="text-xs text-red-600 font-medium">⚠ Total bobot semua soal saat ini {examInfo?.total_bobot_soal}, bukan 100 — verifikasi akan ditolak sampai diperbaiki di menu Kelola Soal.</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                            Anda dapat menyesuaikan skor di bawah ini sebelum mempublikasikan nilai akhir. Skor dihitung dalam skala 0 - 100.
                                        </p>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Pilgan ({examInfo?.bobot_pilgan}%)</label>
                                                <input
                                                    type="number"
                                                    min="0" max="100"
                                                    value={verifyModal.scores.pilgan}
                                                    onChange={(e) => handleScoreChange('pilgan', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Esai AI ({examInfo?.bobot_esai}%)</label>
                                                <input
                                                    type="number"
                                                    min="0" max="100"
                                                    value={verifyModal.scores.esai}
                                                    onChange={(e) => handleScoreChange('esai', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Upload ({examInfo?.bobot_upload}%)</label>
                                                <input
                                                    type="number"
                                                    min="0" max="100"
                                                    value={verifyModal.scores.file}
                                                    onChange={(e) => handleScoreChange('file', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Live Preview Total Score */}
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center mt-2">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Estimasi Total Akhir:</span>
                                            <span className="text-xl font-black text-[#0f4c3a]">
                                                {parseFloat(Number(
                                                    (verifyModal.scores.pilgan * ((examInfo?.bobot_pilgan || 0) / 100)) +
                                                    (verifyModal.scores.esai * ((examInfo?.bobot_esai || 0) / 100)) +
                                                    (verifyModal.scores.file * ((examInfo?.bobot_upload || 0) / 100))
                                                ).toFixed(2))}
                                            </span>
                                        </div>
                                        {verifyModal.attempt && !verifyModal.attempt.is_all_graded && (
                                            <p className="text-xs text-amber-600 font-medium">⚠ Belum semua soal dinilai — estimasi ini masih bisa berubah.</p>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={closeVerifyModal} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Batal
                                </button>
                                <button onClick={submitVerification} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
                                    Verifikasi & Publish
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
