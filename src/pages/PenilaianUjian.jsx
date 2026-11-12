import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config/api';
import matkulService from '../services/matkul.service';
import examService from '../services/exam.service';
import gradingService from '../services/grading.service';
import siakadService from '../services/siakad.service';
import sebService from '../services/seb.service';
import MathText from '../components/MathText';
import MatkulSelect from '../components/MatkulSelect';
import SiakadSearchPicker from '../components/SiakadSearchPicker';
import { extractBlobErrorMessage } from '../utils/format.utils';

// Menu "Penilaian & Evaluasi" dan "Rekap Nilai Akhir" digabung jadi 1 halaman
// 3 tab (lihat CLAUDE.md): (1) Penilaian Per Mahasiswa -- persis Grading.jsx
// lama, (2) Rekap & Verifikasi -- roster semua mahasiswa dgn tombol verifikasi
// langsung, dan (3) Push ke SIAKAD -- persis RekapNilai.jsx lama, termasuk
// multi-select sesi ujian yg sengaja DIPERTAHANKAN di tab ini saja (tab 1+2
// cuma 1 sesi ujian sekaligus, lebih masuk akal buat alur nilai-per-mahasiswa).

// Dropdown "pilih banyak sesi ujian sekaligus" -- dipakai di tab Push SIAKAD
// buat export/push massal. Beda sama MatkulSelect/SiakadSearchPicker yg cuma
// pilih 1 item.
function ExamMultiSelect({ exams, selectedIds, onChange, disabled, placeholder }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const toggle = (id) => {
        const idStr = id.toString();
        if (selectedIds.includes(idStr)) onChange(selectedIds.filter(x => x !== idStr));
        else onChange([...selectedIds, idStr]);
    };

    const label = selectedIds.length === 0
        ? placeholder
        : selectedIds.length === 1
            ? (exams.find(e => e.id.toString() === selectedIds[0])?.nama_ujian || '1 sesi dipilih')
            : `${selectedIds.length} sesi ujian dipilih`;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                className={`w-full px-5 py-4 border rounded-xl text-[13px] font-bold text-left outline-none transition-all flex items-center justify-between gap-2 ${disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer'}`}
            >
                <span className="truncate">{label}</span>
                <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {open && !disabled && (
                <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                    {exams.length === 0 ? (
                        <div className="px-4 py-3 text-[12px] font-medium text-slate-400">Belum ada sesi ujian di matkul ini.</div>
                    ) : exams.map(ex => {
                        const idStr = ex.id.toString();
                        const checked = selectedIds.includes(idStr);
                        return (
                            <label key={ex.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(ex.id)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                                />
                                <span className="text-[12px] font-bold text-slate-700">{ex.nama_ujian} <span className="text-slate-400 font-medium">(Durasi: {ex.durasi} Menit)</span></span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function PenilaianUjian() {
    const backendFileBaseUrl = API_BASE_URL.replace(/\/+$/, '');

    // ===== State Shared (filter Mata Kuliah + tab aktif) =====
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]);
    const [activeTab, setActiveTab] = useState('nilai'); // 'nilai' | 'rekap' | 'siakad'

    // ===== State Tab 1 "Penilaian Per Mahasiswa" & Tab 2 "Rekap & Verifikasi"
    // (1 sesi ujian sekaligus -- persis Grading.jsx lama) =====
    const [selectedExam, setSelectedExam] = useState('');
    const [studentList, setStudentList] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [attemptsByUser, setAttemptsByUser] = useState({});
    const [resettingAttempt, setResettingAttempt] = useState(false);
    const [examInfo, setExamInfo] = useState(null);
    const [verifyModal, setVerifyModal] = useState({
        isOpen: false,
        attempt: null,
        scores: { pilgan: 0, esai: 0, file: 0 }
    });
    const [answers, setAnswers] = useState([]);
    const [loadingNilai, setLoadingNilai] = useState(false);
    const [inputScores, setInputScores] = useState({});
    const [expandedAnswers, setExpandedAnswers] = useState({});
    const [filterType, setFilterType] = useState('all'); // 'all', 'auto', 'manual'
    const [recalculating, setRecalculating] = useState(false);

    // ===== State Tab 3 "Push ke SIAKAD" (multi-select sesi ujian --
    // persis RekapNilai.jsx lama, dipertahankan sesuai permintaan) =====
    const [selectedExamIds, setSelectedExamIds] = useState([]);
    const singleExamId = selectedExamIds.length === 1 ? selectedExamIds[0] : null;
    const [scores, setScores] = useState([]);
    const [examInfoMap, setExamInfoMap] = useState({});
    const [loadingRekapSiakad, setLoadingRekapSiakad] = useState(false);
    const [siakadTarget, setSiakadTarget] = useState({ kelas: '', periode: '', rencana: '' });
    const [savingTarget, setSavingTarget] = useState(false);
    const [pushingAll, setPushingAll] = useState(false);
    const [pushingRowId, setPushingRowId] = useState(null);
    const [rencanaOptions, setRencanaOptions] = useState([]);
    const [loadingRencana, setLoadingRencana] = useState(false);
    const [kelasKuliahOptions, setKelasKuliahOptions] = useState([]);
    const [kelasKuliahSearch, setKelasKuliahSearch] = useState('');
    const [kelasKuliahPickerOpen, setKelasKuliahPickerOpen] = useState(false);
    const [loadingKelasKuliah, setLoadingKelasKuliah] = useState(false);
    const [selectedKelasLabel, setSelectedKelasLabel] = useState('');
    const [sebRequire, setSebRequire] = useState(false);
    const [sebQuitPassword, setSebQuitPassword] = useState('');
    const [savingSeb, setSavingSeb] = useState(false);
    const [downloadingSeb, setDownloadingSeb] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Deep-link gabungan dari 2 menu lama (lihat CLAUDE.md "Routing & deep-link
    // compatibility"): "/grading?exam_id=&student_id=" (tombol di LMS fe-ucl)
    // buka Tab 1 langsung ke jawaban mahasiswa itu; "/rekap-nilai?exam_id="
    // (tombol "Koreksi Nilai" lama) buka Tab 2 (rekap, pengganti semantik
    // terdekat). Query dibaca sekali lalu dibuang dari address bar.
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

        if (studentIdParam) {
            setActiveTab('nilai');
            applyDeepLinkedExam(examIdParam, studentIdParam);
        } else {
            setActiveTab('rekap');
            handleExamChange({ target: { value: examIdParam } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allExams]);

    const applyDeepLinkedExam = async (examId, studentIdParam) => {
        await handleExamChange({ target: { value: examId } });
        if (!studentIdParam) return;
        setSelectedStudent(studentIdParam);
        setLoadingNilai(true);
        try {
            const data = await gradingService.getStudentAnswers(examId, studentIdParam);
            setAnswers(data || []);
        } catch (error) {
            console.error("Gagal menarik jawaban mahasiswa (deep-link):", error);
        } finally {
            setLoadingNilai(false);
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

    const resetSiakadSebSections = () => {
        setSiakadTarget({ kelas: '', periode: '', rencana: '' });
        setSebRequire(false);
        setSebQuitPassword('');
        setRencanaOptions([]);
        setSelectedKelasLabel('');
        setKelasKuliahOptions([]);
    };

    // Ganti Mata Kuliah -> reset SEMUA state turunan (tab 1+2 maupun tab 3).
    const handleMatkulChange = (mkId) => {
        setSelectedMatkul(mkId);

        const examsForThisMatkul = allExams?.data?.filter(ex => ex.kode_mk === mkId) || [];
        setFilteredExams(examsForThisMatkul);

        // Tab 1 & 2
        setSelectedExam('');
        setAnswers([]);
        setExpandedAnswers({});
        setExamInfo(null);
        setStudentList([]);
        setSelectedStudent('');
        setAttemptsByUser({});

        // Tab 3
        setSelectedExamIds([]);
        setScores([]);
        setExamInfoMap({});
        resetSiakadSebSections();
    };

    // ===================================================================
    // TAB 1 & 2 -- logic persis Grading.jsx lama
    // ===================================================================
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

        setLoadingNilai(true);
        try {
            const resData = await gradingService.getAllAnswers(examId);
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
            setAnswers([]);
            setSelectedStudent('');
        } catch (error) {
            console.error("Gagal menarik data mahasiswa", error);
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
            setLoadingNilai(false);
        }
    };

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

    // Dipanggil dari Tab 1 (tanpa argumen, pakai selectedStudent) maupun
    // Tab 2 (langsung dengan studentId, tanpa harus pindah ke Tab 1 dulu).
    const openVerifyModal = (studentIdParam) => {
        const sid = studentIdParam !== undefined && studentIdParam !== null ? studentIdParam.toString() : selectedStudent;
        const attempt = attemptsByUser[sid];
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
            handleExamChange({ target: { value: selectedExam } });
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

    const handleStudentChange = async (e) => {
        const studentId = e.target.value;
        setSelectedStudent(studentId);
        setExpandedAnswers({});

        if (!studentId) {
            setAnswers([]);
            return;
        }

        setLoadingNilai(true);
        try {
            const data = await gradingService.getStudentAnswers(selectedExam, studentId);
            setAnswers(data || []);
        } catch (error) {
            console.error("Gagal menarik jawaban mahasiswa", error);
            Swal.fire('Error', 'Gagal memuat jawaban mahasiswa', 'error');
        } finally {
            setLoadingNilai(false);
        }
    };

    const viewStudentAnswers = (studentId) => handleStudentChange({ target: { value: studentId.toString() } });

    const backToStudentList = () => {
        setSelectedStudent('');
        setAnswers([]);
        setExpandedAnswers({});
    };

    const handleSaveScore = async (ans, bobotMaksimal) => {
        const responseId = ans.id;
        const skorBaru = inputScores[responseId] !== undefined ? inputScores[responseId] : ans.skor;

        if (skorBaru === null || skorBaru === undefined || skorBaru === '') return Swal.fire('Oops', 'Masukkan nilai terlebih dahulu!', 'warning');
        if (parseFloat(skorBaru) > parseFloat(bobotMaksimal)) return Swal.fire('Ditolak', `Skor tidak boleh melebihi bobot maksimal (${bobotMaksimal})!`, 'error');

        try {
            await gradingService.saveScore(responseId, skorBaru);

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nilai disimpan!', showConfirmButton: false, timer: 1500 });

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

    const isAnswerCorrect = (ans) => {
        if (!ans.questions) return false;

        if (ans.questions.tipe_soal === 'TIPE_1') {
            return String(ans.jawaban_teks || '').trim().toUpperCase() === String(ans.questions.kunci_jawaban || '').trim().toUpperCase();
        } else if (ans.questions.tipe_soal === 'TIPE_2') {
            try {
                const studentAnswer = String(ans.jawaban_teks || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s).sort();
                const correctAnswer = String(ans.questions.kunci_jawaban || '').split(',').map(s => s.trim().toUpperCase()).filter(s => s).sort();

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

    const filteredAnswers = (answers?.data || answers || []).filter(ans => {
        if (filterType === 'all') return true;
        if (filterType === 'auto') return ['TIPE_1', 'TIPE_2'].includes(ans.questions?.tipe_soal);
        if (filterType === 'manual') return ans.questions?.tipe_soal === 'TIPE_4';
        return true;
    });

    // ===================================================================
    // TAB 3 -- logic persis RekapNilai.jsx lama (multi-select dipertahankan)
    // ===================================================================
    const handleExamSelectionChange = (newIds) => {
        setSelectedExamIds(newIds);
        fetchAttemptsDataSiakad(newIds);
    };

    const fetchAttemptsDataSiakad = async (examIds) => {
        if (!examIds || examIds.length === 0) {
            setScores([]);
            setExamInfoMap({});
            resetSiakadSebSections();
            return;
        }

        setLoadingRekapSiakad(true);
        try {
            const results = await Promise.all(examIds.map(id => gradingService.getAttempts(id)));

            const infoMap = {};
            const mergedScores = [];
            results.forEach((responseData, idx) => {
                const examId = examIds[idx];
                const info = responseData?.exam_info || null;
                infoMap[examId] = info;
                const rows = responseData?.data || responseData || [];
                rows.forEach(row => mergedScores.push({ ...row, exam_id: examId, nama_ujian: info?.nama_ujian || '' }));
            });

            setExamInfoMap(infoMap);
            setScores(mergedScores);

            if (examIds.length === 1) {
                const info = infoMap[examIds[0]];
                setSiakadTarget({
                    kelas: info?.siakad_kelas_kuliah_id || '',
                    periode: info?.siakad_periode_akademik_id || '',
                    rencana: info?.siakad_rencana_evaluasi_id || ''
                });
                setSebRequire(!!info?.seb_require);
                setSebQuitPassword('');
                setRencanaOptions([]);
                setSelectedKelasLabel('');
                setKelasKuliahOptions([]);
                if (info?.kode_mk) fetchKelasKuliahSiakad(info.kode_mk);
            } else {
                resetSiakadSebSections();
            }
        } catch (error) {
            console.error("Gagal menarik rincian nilai:", error);
            Swal.fire('Error', 'Gagal memuat data nilai ujian ini.', 'error');
        } finally {
            setLoadingRekapSiakad(false);
        }
    };

    const fetchKelasKuliahSiakad = async (kodeMk) => {
        setLoadingKelasKuliah(true);
        try {
            const result = await siakadService.searchKelasKuliah(kodeMk);
            setKelasKuliahOptions(result?.data || []);
        } catch (error) {
            console.error("Gagal menarik daftar Kelas Kuliah SIAKAD.", error);
        } finally {
            setLoadingKelasKuliah(false);
        }
    };

    const filteredKelasKuliah = kelasKuliahSearch.trim()
        ? kelasKuliahOptions.filter(k => {
            const q = kelasKuliahSearch.toLowerCase();
            return k.nama?.toLowerCase().includes(q)
                || k.mataKuliah?.kode?.toLowerCase().includes(q)
                || k.mataKuliah?.nama?.toLowerCase().includes(q)
                || k.periodeAkademik?.nama?.toLowerCase().includes(q);
          })
        : kelasKuliahOptions;

    const selectedRencanaOption = rencanaOptions.find(re => re.id === siakadTarget.rencana);
    const selectedRencanaLabel = selectedRencanaOption
        ? `${selectedRencanaOption.metodeEvaluasi} (${selectedRencanaOption.bobotEvaluasi}%)${selectedRencanaOption.jenisEvaluasi ? ` — ${selectedRencanaOption.jenisEvaluasi}` : ''}`
        : '';

    const handlePickKelasKuliah = async (item) => {
        setSiakadTarget(prev => ({ ...prev, kelas: item.id, periode: item.siakPeriodeAkademikId, rencana: '' }));
        setSelectedKelasLabel(`${item.nama} • ${item.mataKuliah?.kode} - ${item.mataKuliah?.nama} • ${item.periodeAkademik?.nama}`);
        setKelasKuliahPickerOpen(false);
        setKelasKuliahSearch('');
        setRencanaOptions([]);
        await cariKomponenSiakad(item.siakPeriodeAkademikId);
    };

    const handleExportExcel = () => {
        if (scores.length === 0) return Swal.fire('Data Kosong', 'Tidak ada data nilai untuk diekspor.', 'warning');

        const dataToExport = scores.map((s, index) => ({
            "No": index + 1,
            "Sesi Ujian": s.nama_ujian,
            "NIM": s.nim,
            "Nama Mahasiswa": s.nama_mahasiswa,
            "Skor Pilihan Ganda (100)": parseFloat(Number(s.skor_pilgan_100).toFixed(2)),
            "Skor Esai AI (100)": parseFloat(Number(s.skor_esai_100).toFixed(2)),
            "Skor Upload (100)": parseFloat(Number(s.skor_file_100).toFixed(2)),
            "Total Nilai Akhir": s.final_score !== null ? parseFloat(Number(s.final_score).toFixed(2)) : 'Menunggu',
            "Status Evaluasi": s.status === 'SELESAI' ? 'Final' : 'Menunggu Verifikasi'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian_Nilai_CBT");

        const mkName = matkulList?.data?.find(m => m.kode_mk === selectedMatkul)?.nama_mk || 'Matkul';
        const examLabel = selectedExamIds.length === 1
            ? (allExams?.data?.find(e => e.id.toString() === selectedExamIds[0])?.nama_ujian || 'Ujian')
            : `${selectedExamIds.length}Sesi`;
        XLSX.writeFile(workbook, `Rekap_${mkName}_${examLabel}.xlsx`);
    };

    const estimateFinalScoreSiakad = (score) => {
        const info = examInfoMap[score.exam_id];
        if (info?.grading_type === 'PER_SOAL') {
            return score.preview_final_score !== null && score.preview_final_score !== undefined
                ? score.preview_final_score
                : null;
        }
        return (
            (score.skor_pilgan_100 * ((info?.bobot_pilgan || 0) / 100)) +
            (score.skor_esai_100 * ((info?.bobot_esai || 0) / 100)) +
            (score.skor_file_100 * ((info?.bobot_upload || 0) / 100))
        );
    };

    const saveSiakadTarget = async () => {
        if (!singleExamId) return;
        if (!siakadTarget.kelas.trim() || !siakadTarget.periode.trim()) {
            return Swal.fire('Data Kurang', 'ID Kelas dan Periode Akademik SIAKAD wajib diisi.', 'warning');
        }
        setSavingTarget(true);
        try {
            await siakadService.setExamTarget(singleExamId, {
                siakad_kelas_kuliah_id: siakadTarget.kelas.trim(),
                siakad_periode_akademik_id: siakadTarget.periode.trim(),
                siakad_rencana_evaluasi_id: siakadTarget.rencana.trim() || null
            });
            Swal.fire({ icon: 'success', title: 'Target SIAKAD Tersimpan', timer: 1200, showConfirmButton: false });
        } catch (error) {
            console.error("Gagal menyimpan target SIAKAD:", error);
            Swal.fire('Error', error.response?.data?.message || 'Gagal menyimpan target SIAKAD.', 'error');
        } finally {
            setSavingTarget(false);
        }
    };

    const saveSebSettings = async () => {
        if (!singleExamId) return;
        const examInfoForSeb = examInfoMap[singleExamId];
        if (sebRequire && !sebQuitPassword.trim() && !examInfoForSeb?.seb_require) {
            return Swal.fire('Password Keluar Wajib Diisi', 'Isi password keluar SEB dulu sebelum mengaktifkan Wajib-SEB untuk pertama kali.', 'warning');
        }
        setSavingSeb(true);
        try {
            await sebService.setExamSettings(singleExamId, {
                seb_require: sebRequire,
                quit_password: sebQuitPassword.trim() || undefined
            });
            setSebQuitPassword('');
            setExamInfoMap(prev => ({
                ...prev,
                [singleExamId]: prev[singleExamId] ? { ...prev[singleExamId], seb_require: sebRequire } : prev[singleExamId]
            }));
            Swal.fire({ icon: 'success', title: sebRequire ? 'Wajib-SEB Diaktifkan' : 'Wajib-SEB Dimatikan', timer: 1200, showConfirmButton: false });
        } catch (error) {
            console.error("Gagal menyimpan pengaturan SEB:", error);
            Swal.fire('Error', error.response?.data?.message || 'Gagal menyimpan pengaturan SEB.', 'error');
        } finally {
            setSavingSeb(false);
        }
    };

    const downloadSebConfig = async () => {
        if (!singleExamId) return;
        setDownloadingSeb(true);
        try {
            const blob = await sebService.downloadConfig(singleExamId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${examInfoMap[singleExamId]?.nama_ujian || 'ujian'}.seb`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Gagal mengunduh file .seb:", error);
            const message = await extractBlobErrorMessage(error, 'Gagal mengunduh file .seb. Pastikan Wajib-SEB sudah diaktifkan & disimpan.');
            Swal.fire('Error', message, 'error');
        } finally {
            setDownloadingSeb(false);
        }
    };

    const cariKomponenSiakad = async (periodeOverride) => {
        if (!singleExamId) return;
        const periodeId = (periodeOverride || siakadTarget.periode).trim();
        if (!periodeId) {
            return Swal.fire('Data Kurang', 'Pilih Kelas Kuliah dulu (otomatis ngisi periode), baru cari komponennya.', 'warning');
        }
        setLoadingRencana(true);
        try {
            const result = await siakadService.getRencanaEvaluasi(examInfoMap[singleExamId]?.kode_mk, periodeId);
            const list = result?.data?.rencanaEvaluasi || [];
            setRencanaOptions(list);
            if (list.length === 0) {
                Swal.fire('Kosong', 'Tidak ada komponen Rencana Evaluasi ditemukan untuk mata kuliah/periode ini di SIAKAD.', 'info');
            }
        } catch (error) {
            console.error("Gagal menarik Rencana Evaluasi SIAKAD:", error);
            Swal.fire('Error', error.response?.data?.message || 'Gagal menarik daftar komponen dari SIAKAD.', 'error');
        } finally {
            setLoadingRencana(false);
        }
    };

    const pushOneToSiakad = async (attempt) => {
        setPushingRowId(attempt.attempt_id);
        try {
            await siakadService.pushAttempt(attempt.attempt_id);
            Swal.fire({ icon: 'success', title: 'Masuk Antrian SIAKAD', timer: 1200, showConfirmButton: false });
            fetchAttemptsDataSiakad(selectedExamIds);
        } catch (error) {
            console.error("Gagal push ke SIAKAD:", error);
            Swal.fire('Error', error.response?.data?.message || 'Gagal push nilai ke SIAKAD.', 'error');
        } finally {
            setPushingRowId(null);
        }
    };

    const pushAllToSiakad = async () => {
        if (selectedExamIds.length === 0) return;
        setPushingAll(true);
        try {
            const results = await Promise.allSettled(selectedExamIds.map(id => siakadService.pushExam(id)));
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed === 0) {
                Swal.fire({ icon: 'success', title: 'Push ke SIAKAD Dimulai', text: `Antrian push dibuat untuk ${selectedExamIds.length} sesi ujian.`, timer: 2000, showConfirmButton: false });
            } else {
                Swal.fire('Sebagian Gagal', `${selectedExamIds.length - failed} dari ${selectedExamIds.length} sesi berhasil masuk antrian, ${failed} gagal.`, 'warning');
            }
            fetchAttemptsDataSiakad(selectedExamIds);
        } catch (error) {
            console.error("Gagal push semua ke SIAKAD:", error);
            Swal.fire('Error', 'Gagal push nilai ujian ke SIAKAD.', 'error');
        } finally {
            setPushingAll(false);
        }
    };

    const siakadBadge = (status) => {
        switch (status) {
            case 'TERKIRIM':
                return <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Terkirim</span>;
            case 'ANTRIAN':
                return <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Antrian</span>;
            case 'GAGAL':
                return <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Gagal</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Belum Sinkron</span>;
        }
    };

    // ===================================================================
    // RENDER
    // ===================================================================
    const TABS = [
        { id: 'nilai', label: 'Penilaian Per Mahasiswa' },
        { id: 'rekap', label: 'Rekap & Verifikasi' },
        { id: 'siakad', label: 'Push ke SIAKAD' }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 pb-12">

            {/* HEADER */}
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Penilaian & Evaluasi Ujian</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-3xl leading-relaxed">
                    Nilai jawaban mahasiswa, verifikasi & publikasikan nilai akhir, lalu push ke SIAKAD -- semua dalam satu halaman.
                </p>
            </div>

            {/* TAB NAV */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all ${activeTab === t.id ? 'bg-[#0f4c3a] text-white shadow-lg shadow-[#0f4c3a]/20' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* FILTER MATA KULIAH (shared) + SESI UJIAN (single utk tab 1/2, multi utk tab 3) */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 relative">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none -z-10">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 md:flex-[1.4] relative z-10">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">1</span>
                            Filter Mata Kuliah
                        </label>
                        <MatkulSelect matkulList={matkulList} value={selectedMatkul} onChange={handleMatkulChange} placeholder="-- Pilih Mata Kuliah Terlebih Dahulu --" />
                    </div>

                    <div className="flex-1 relative z-10">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 bg-[#0f4c3a]/10 text-[#0f4c3a] rounded-full flex items-center justify-center text-[10px]">2</span>
                            {activeTab === 'siakad' ? 'Pilih Sesi Ujian (bisa lebih dari satu)' : 'Pilih Lembar Sesi Ujian'}
                        </label>
                        {activeTab === 'siakad' ? (
                            <ExamMultiSelect
                                exams={filteredExams}
                                selectedIds={selectedExamIds}
                                onChange={handleExamSelectionChange}
                                disabled={!selectedMatkul || filteredExams.length === 0}
                                placeholder={!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : (filteredExams.length === 0 ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --")}
                            />
                        ) : (
                            <select value={selectedExam} onChange={handleExamChange} disabled={!selectedMatkul || filteredExams.length === 0} className={`w-full px-5 py-4 border rounded-xl text-[14px] font-bold outline-none transition-all appearance-none shadow-sm ${!selectedMatkul ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 cursor-pointer'}`}>
                                <option value="" disabled>
                                    {!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : filteredExams.length === 0 ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --"}
                                </option>
                                {filteredExams.map(ex => (
                                    <option key={ex.id} value={ex.id}>{ex.nama_ujian} (Durasi: {ex.durasi} Menit)</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {activeTab !== 'siakad' && selectedStudent && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Filter Tipe:</span>
                            <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'all' ? 'bg-[#0f4c3a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Semua</button>
                            <button onClick={() => setFilterType('auto')} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'auto' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Auto-Koreksi (PG)</button>
                            <button onClick={() => setFilterType('manual')} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterType === 'manual' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Penilaian Manual</button>
                        </div>

                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating || !selectedExam}
                            className="w-full sm:w-auto justify-center px-5 py-2.5 bg-gradient-to-r from-[#0f4c3a] to-[#1a6b52] hover:from-[#0a3628] hover:to-[#0f4c3a] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#0f4c3a]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {recalculating ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Menghitung...</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Recalculate Skor</>)}
                        </button>
                    </div>
                )}
            </div>

            {/* ============================= TAB 1: PENILAIAN PER MAHASISWA ============================= */}
            {activeTab === 'nilai' && (
                <>
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
                                        {loadingNilai ? (
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
                                        onClick={() => openVerifyModal()}
                                        disabled={bobotSoalBelumPas}
                                        className={`px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
                                    >
                                        {isVerified ? 'Edit Verifikasi' : 'Verifikasi & Publish'}
                                    </button>
                                </div>
                            </div>
                        );
                    })()}

                    {selectedStudent && (
                        <div className="space-y-6">
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
                                    <button onClick={backToStudentList} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5">
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

                            {loadingNilai ? (
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
                                                    const maxScore = parseFloat(ans.questions?.bobot_nilai) || 10;
                                                    const tipe = ans.questions?.tipe_soal;
                                                    const isAutoGraded = ['TIPE_1', 'TIPE_2'].includes(tipe);
                                                    const isCorrect = isAutoGraded && isAnswerCorrect(ans);
                                                    const isManualType = tipe === 'TIPE_3' || tipe === 'TIPE_4';
                                                    const isExpanded = !!expandedAnswers[ans.id];

                                                    return (
                                                        <React.Fragment key={ans.id}>
                                                            <tr className={`hover:bg-slate-50/40 transition-colors ${isExpanded ? 'bg-slate-50/30' : ''}`}>
                                                                <td className="py-4 px-6 text-center">
                                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold text-[12px]">{idx + 1}</span>
                                                                </td>
                                                                <td className="py-4 px-6">
                                                                    {tipe === 'TIPE_1' ? (
                                                                        <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-100">PG Single</span>
                                                                    ) : tipe === 'TIPE_2' ? (
                                                                        <span className="inline-flex items-center bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-purple-100">PG Multi</span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-amber-100">Essay / File</span>
                                                                    )}
                                                                </td>
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

                                                                        <button onClick={() => toggleExpand(ans.id)} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors ml-auto cursor-pointer">
                                                                            {isExpanded ? (<>Tutup Detail<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg></>) : (<>Lihat Detail<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></>)}
                                                                        </button>
                                                                    </div>
                                                                </td>

                                                                <td className="py-4 px-6 text-center">
                                                                    {isAutoGraded ? (
                                                                        isCorrect ? (
                                                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Benar</span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Salah</span>
                                                                        )
                                                                    ) : (
                                                                        ans.skor !== null && ans.skor !== undefined ? (
                                                                            <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-teal-100"><span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>Ternilai</span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Perlu Nilai</span>
                                                                        )
                                                                    )}
                                                                </td>

                                                                <td className="py-4 px-6 text-center">
                                                                    <div className="flex items-center justify-center">
                                                                        {isAutoGraded ? (
                                                                            <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-black text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                                {isCorrect ? maxScore : 0}
                                                                            </span>
                                                                        ) : (
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
                                                                                    <button onClick={() => setInputScores({ ...inputScores, [ans.id]: ans.skor })} title="Edit Nilai" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer">
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                                    </button>
                                                                                ) : (
                                                                                    <button onClick={() => handleSaveScore(ans, maxScore)} title="Simpan Nilai" className="p-1.5 text-white hover:text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm cursor-pointer">
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr className="bg-slate-50/30">
                                                                    <td colSpan={5} className="p-5 border-t border-b border-slate-100">
                                                                        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Soal & Jawaban Lengkap</span>
                                                                                <span className="text-[10px] font-bold text-slate-400">Response ID: #{ans.id}</span>
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pertanyaan / Instruksi</h5>
                                                                                <p className="text-[14px] font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                                                    <MathText text={ans.questions?.isi_soal} />
                                                                                </p>
                                                                            </div>

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
                                                                                                        <div key={key} className={`p-3 rounded-xl border-2 flex items-start gap-3 transition-colors ${isSelected ? (isCorrectAnswer ? 'bg-emerald-50/70 border-emerald-350 text-slate-800 font-medium' : 'bg-rose-50/70 border-rose-355 text-slate-800 font-medium') : (isCorrectAnswer ? 'bg-blue-50/70 border-blue-200 text-slate-800 font-medium' : 'bg-slate-50/50 border-slate-200 text-slate-600')}`}>
                                                                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${isSelected ? (isCorrectAnswer ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800') : (isCorrectAnswer ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600')}`}>
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

                                                                            {isManualType && (
                                                                                <div className="space-y-4 pt-2">
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
                                                                                                <a href={`${backendFileBaseUrl}/${String(ans.file_path || '').replace(/^\/+/, '')}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer">
                                                                                                    Unduh File
                                                                                                </a>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                                                                {ans.jawaban_teks || <span className="text-slate-400 italic">Peserta tidak mengisi kolom teks jawaban.</span>}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

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
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ============================= TAB 2: REKAP & VERIFIKASI ============================= */}
            {activeTab === 'rekap' && (
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Rekap Semua Mahasiswa</h3>
                            <p className="text-[11px] font-medium text-slate-400 mt-1">Verifikasi &amp; publikasikan nilai langsung dari sini, tanpa perlu masuk ke detail jawaban.</p>
                        </div>
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
                                {!selectedExam ? (
                                    <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold text-sm">Pilih Sesi Ujian pada filter di atas untuk melihat rekap.</td></tr>
                                ) : loadingNilai ? (
                                    <tr><td colSpan="5" className="py-16 text-center text-slate-400 font-bold animate-pulse">Memuat data...</td></tr>
                                ) : studentList.length === 0 ? (
                                    <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold text-sm">Belum ada mahasiswa yang mengumpulkan ujian ini.</td></tr>
                                ) : (
                                    studentList.map((student, idx) => {
                                        const attempt = attemptsByUser[student.id];
                                        const isVerified = attempt?.status === 'SELESAI';
                                        const estimate = attempt ? estimateFinalScore(attempt) : null;
                                        const bobotSoalBelumPas = examInfo?.grading_type === 'PER_SOAL' && examInfo?.total_bobot_soal !== 100;
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
                                                    {!attempt ? (
                                                        <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">Belum ada attempt</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => openVerifyModal(student.id)}
                                                            disabled={bobotSoalBelumPas}
                                                            title={bobotSoalBelumPas ? `Total bobot soal belum 100 -- perbaiki di menu Kelola Soal dulu.` : undefined}
                                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isVerified ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                                                        >
                                                            {isVerified ? 'Edit Verifikasi' : 'Verifikasi'}
                                                        </button>
                                                    )}
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

            {/* ============================= TAB 3: PUSH KE SIAKAD ============================= */}
            {activeTab === 'siakad' && (
                <>
                    {selectedExamIds.map(id => {
                        const info = examInfoMap[id];
                        if (!info) return null;
                        return (
                            <div key={id}>
                                {info.grading_type === 'PER_SOAL' ? (
                                    <div className={`p-4 rounded-xl flex gap-4 text-sm font-medium items-center border ${info.total_bobot_soal === 100 ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        <span className="text-xl">⚖️</span>
                                        <p>
                                            <strong>{info.nama_ujian} — Mode Per Soal:</strong> Total bobot semua soal saat ini <b>{info.total_bobot_soal}</b>/100.
                                            {info.total_bobot_soal !== 100 && ' Verifikasi akan ditolak di tab Penilaian Per Mahasiswa sampai totalnya tepat 100 — perbaiki bobot tiap soal di menu Kelola Soal.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 text-sm font-medium text-blue-800 items-center">
                                        <span className="text-xl">⚖️</span>
                                        <p><strong>{info.nama_ujian} — Bobot Ujian:</strong> Pilihan Ganda ({info.bobot_pilgan}%) | Esai ({info.bobot_esai}%) | Upload ({info.bobot_upload}%)</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="flex justify-end gap-3">
                        <button onClick={handleExportExcel} disabled={scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/30'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                            Export ke Excel
                        </button>
                        <button onClick={pushAllToSiakad} disabled={selectedExamIds.length === 0 || pushingAll || scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${selectedExamIds.length === 0 || pushingAll || scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/30'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            {pushingAll ? 'Mengirim...' : `Push ${selectedExamIds.length > 1 ? `${selectedExamIds.length} Sesi` : 'Semua'} ke NL-SIAK`}
                        </button>
                    </div>

                    {selectedExamIds.length > 1 && (
                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex gap-3 text-sm font-medium text-amber-800">
                            <span className="text-xl">ℹ️</span>
                            <p>Pengaturan Target SIAKAD &amp; Safe Exam Browser cuma bisa diatur per satu sesi ujian. Pilih tepat 1 sesi ujian untuk mengatur keduanya.</p>
                        </div>
                    )}

                    {singleExamId && (
                        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100/50 bg-white/50">
                                <h3 className="text-[15px] font-black uppercase tracking-widest text-[#0f4c3a]">NL-SIAK</h3>
                                <p className="text-[12px] font-medium text-slate-400 mt-1">Sambungin ujian ini ke kelas &amp; komponen evaluasi resmi di NL-SIAK, supaya nilainya bisa dipush.</p>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kelas Kuliah</label>
                                    <SiakadSearchPicker
                                        label={null}
                                        searchValue={kelasKuliahSearch}
                                        onSearchChange={setKelasKuliahSearch}
                                        isOpen={kelasKuliahPickerOpen}
                                        onOpenChange={setKelasKuliahPickerOpen}
                                        items={filteredKelasKuliah}
                                        getKey={item => item.id}
                                        renderItem={item => (
                                            <>
                                                <p className="text-[12px] font-black text-slate-800">{item.nama} — {item.mataKuliah?.kode} {item.mataKuliah?.nama}</p>
                                                <p className="text-[10px] font-bold text-slate-400">Periode: {item.periodeAkademik?.nama} • {item.status_kelas}</p>
                                            </>
                                        )}
                                        onSelect={handlePickKelasKuliah}
                                        loading={loadingKelasKuliah}
                                        placeholder="Cari kelas kuliah (nama kelas, kode/nama MK, atau periode)..."
                                    />
                                    {selectedKelasLabel ? (
                                        <p className="text-[12px] font-bold text-emerald-700 mt-2.5 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">✓</span>
                                            {selectedKelasLabel}
                                        </p>
                                    ) : siakadTarget.kelas ? (
                                        <p className="text-[12px] font-bold text-amber-700 mt-2.5 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">!</span>
                                            Ada target tersimpan — cari &amp; pilih lagi di atas buat lihat namanya atau ganti.
                                        </p>
                                    ) : (
                                        <p className="text-[12px] text-slate-400 mt-2.5">Belum ada target tersimpan untuk ujian ini.</p>
                                    )}
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Komponen Evaluasi (UTS/UAS/dst)</label>
                                    <div className="flex flex-col md:flex-row gap-3 md:items-center">
                                        <div className="flex-1">
                                            {rencanaOptions.length > 0 ? (
                                                <select
                                                    value={siakadTarget.rencana}
                                                    onChange={(e) => e.target.value && setSiakadTarget(prev => ({ ...prev, rencana: e.target.value }))}
                                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 transition-all"
                                                >
                                                    <option value="" disabled>-- Pilih komponen --</option>
                                                    {rencanaOptions.map(re => (
                                                        <option key={re.id} value={re.id}>{re.metodeEvaluasi} ({re.bobotEvaluasi}%){re.jenisEvaluasi ? ` — ${re.jenisEvaluasi}` : ''}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-[12px] text-slate-400 py-3">Pilih Kelas Kuliah dulu di atas, komponennya otomatis dicari.</p>
                                            )}
                                        </div>
                                        <button onClick={() => cariKomponenSiakad()} disabled={loadingRencana || !siakadTarget.periode} className="shrink-0 px-5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40">
                                            {loadingRencana ? 'Mencari...' : 'Cari Ulang'}
                                        </button>
                                    </div>
                                    {selectedRencanaLabel ? (
                                        <p className="text-[12px] font-bold text-emerald-700 mt-2.5 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">✓</span>
                                            {selectedRencanaLabel}
                                        </p>
                                    ) : siakadTarget.rencana ? (
                                        <p className="text-[12px] font-bold text-amber-700 mt-2.5 flex items-center gap-1.5">
                                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px]">!</span>
                                            Ada komponen tersimpan — klik "Cari Ulang" buat lihat namanya.
                                        </p>
                                    ) : (
                                        <p className="text-[12px] text-slate-400 mt-2.5">Belum ada komponen dipilih.</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
                                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-lg">
                                        CPMK/Sub-CPMK dipetakan lewat menu "CPMK &amp; Sub-CPMK" (impor langsung dari SIAKAD, bukan sinkronisasi manual).
                                    </p>
                                    <button onClick={saveSiakadTarget} disabled={savingTarget} className="shrink-0 px-8 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-lg shadow-[#0f4c3a]/30 transition-all active:scale-95 disabled:opacity-50">
                                        {savingTarget ? 'Menyimpan...' : 'Simpan Target'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {singleExamId && (
                        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100/50 bg-white/50">
                                <h3 className="text-[15px] font-black uppercase tracking-widest text-[#0f4c3a]">Safe Exam Browser</h3>
                                <p className="text-[12px] font-medium text-slate-400 mt-1">Wajibkan ujian ini diakses lewat aplikasi Safe Exam Browser (SEB) resmi — tidak bisa buka tab lain, tidak bisa pindah aplikasi, tidak bisa keluar tanpa password.</p>
                            </div>

                            <div className="p-8 space-y-6">
                                <label className="flex items-center justify-between gap-4 cursor-pointer">
                                    <div>
                                        <p className="text-[13px] font-black text-slate-800">Wajib Safe Exam Browser</p>
                                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">Mahasiswa hanya bisa masuk lewat SEB — browser biasa akan ditolak saat memasukkan token.</p>
                                    </div>
                                    <input type="checkbox" checked={sebRequire} onChange={(e) => setSebRequire(e.target.checked)} className="w-6 h-6 rounded-lg border-2 border-slate-300 text-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 shrink-0" />
                                </label>

                                {sebRequire && (
                                    <div className="border-t border-slate-100 pt-6">
                                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Password Keluar SEB{!examInfoMap[singleExamId]?.seb_require ? ' (wajib)' : ' (kosongkan = pertahankan yang lama)'}</label>
                                        <input
                                            type="text"
                                            value={sebQuitPassword}
                                            onChange={(e) => setSebQuitPassword(e.target.value)}
                                            placeholder="Kosongkan = jangan ganti password yang sudah tersimpan"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 transition-all"
                                        />
                                        <p className="text-[11px] text-slate-400 mt-2">Diminta SEB kalau mahasiswa coba keluar sebelum ujian selesai. Isi ulang di sini kalau mau mengganti password yang sudah ada.</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
                                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-lg">
                                        Setelah disimpan, unduh file <span className="font-mono font-bold">.seb</span>-nya dan sebarkan ke mahasiswa (lewat LMS/grup kelas) bersama token ujian.
                                    </p>
                                    <div className="flex gap-3 shrink-0">
                                        <button onClick={downloadSebConfig} disabled={downloadingSeb || !examInfoMap[singleExamId]?.seb_require} title={!examInfoMap[singleExamId]?.seb_require ? 'Klik Simpan dulu sebelum bisa unduh .seb' : undefined} className="px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40">
                                            {downloadingSeb ? 'Mengunduh...' : 'Unduh .seb'}
                                        </button>
                                        <button onClick={saveSebSettings} disabled={savingSeb} className="px-8 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-lg shadow-[#0f4c3a]/30 transition-all active:scale-95 disabled:opacity-50">
                                            {savingSeb ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Detail Buku Nilai</h3>
                            <span className="bg-[#0f4c3a]/10 text-[#0f4c3a] text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-[#0f4c3a]/20">Peserta: {scores.length}</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-white">
                                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mahasiswa</th>
                                        {selectedExamIds.length > 1 && (
                                            <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi Ujian</th>
                                        )}
                                        <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pilgan<br/>(0-100)</th>
                                        <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Esai AI<br/>(0-100)</th>
                                        <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Upload<br/>(0-100)</th>
                                        <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sync SIAKAD</th>
                                        <th className="py-5 px-6 text-[10px] font-black text-[#0f4c3a] uppercase tracking-widest text-center bg-[#0f4c3a]/5">Total Akhir</th>
                                        <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingRekapSiakad ? (
                                        <tr><td colSpan={selectedExamIds.length > 1 ? 9 : 8} className="py-16 text-center text-slate-400 font-bold animate-pulse">Memuat data...</td></tr>
                                    ) : selectedExamIds.length === 0 ? (
                                        <tr><td colSpan={selectedExamIds.length > 1 ? 9 : 8} className="py-20 text-center text-slate-400 font-bold text-sm">Silakan pilih Sesi Ujian pada filter di atas untuk melihat rincian.</td></tr>
                                    ) : scores.length === 0 ? (
                                        <tr><td colSpan={selectedExamIds.length > 1 ? 9 : 8} className="py-20 text-center text-slate-400 font-bold text-sm">Belum ada mahasiswa yang mengumpulkan ujian ini.</td></tr>
                                    ) : (
                                        scores.map((score, index) => (
                                            <tr key={`${score.exam_id}-${score.attempt_id}-${index}`} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <p className="font-black text-slate-800 text-[13px]">{score.nama_mahasiswa}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{score.nim}</p>
                                                </td>
                                                {selectedExamIds.length > 1 && (
                                                    <td className="py-4 px-4 text-[12px] font-bold text-slate-600">{score.nama_ujian}</td>
                                                )}
                                                <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">{parseFloat(Number(score.skor_pilgan_100).toFixed(2))}</td>
                                                <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">{parseFloat(Number(score.skor_esai_100).toFixed(2))}</td>
                                                <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">{parseFloat(Number(score.skor_file_100).toFixed(2))}</td>
                                                <td className="py-4 px-4 text-center">
                                                    {score.status === 'SELESAI' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Final</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center" title={score.siakad_error || ''}>
                                                    {siakadBadge(score.siakad_sync_status)}
                                                </td>
                                                <td className="py-4 px-6 text-center bg-[#0f4c3a]/[0.02]">
                                                    {score.final_score !== null ? (
                                                        <span className="text-xl font-black tracking-tight text-[#0f4c3a]">{parseFloat(Number(score.final_score).toFixed(2))}</span>
                                                    ) : (() => {
                                                        const estimate = estimateFinalScoreSiakad(score);
                                                        const info = examInfoMap[score.exam_id];
                                                        const bobotSoalBelumPas = info?.grading_type === 'PER_SOAL' && info?.total_bobot_soal !== 100;
                                                        return estimate !== null ? (
                                                            <div>
                                                                <span className={`text-xl font-black tracking-tight italic ${bobotSoalBelumPas ? 'text-red-400' : 'text-slate-400'}`}>≈{parseFloat(Number(estimate).toFixed(2))}</span>
                                                                <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${bobotSoalBelumPas ? 'text-red-400' : 'text-slate-400'}`}>
                                                                    {bobotSoalBelumPas ? 'Bobot soal belum 100' : score.is_all_graded ? 'Estimasi' : 'Estimasi, belum semua dinilai'}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xl font-black tracking-tight text-slate-300">-</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <button
                                                        onClick={() => pushOneToSiakad(score)}
                                                        disabled={score.status !== 'SELESAI' || pushingRowId === score.attempt_id}
                                                        title={score.status !== 'SELESAI' ? 'Belum diverifikasi di tab Penilaian Per Mahasiswa / Rekap & Verifikasi -- belum bisa dipush.' : undefined}
                                                        className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${score.status !== 'SELESAI' ? 'bg-slate-100 text-slate-400 border border-slate-200' : score.siakad_sync_status === 'GAGAL' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`}
                                                    >
                                                        {pushingRowId === score.attempt_id ? 'Mengirim...' : score.siakad_sync_status === 'GAGAL' ? 'Retry' : 'Push'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL VERIFIKASI (shared Tab 1 + Tab 2) */}
            <AnimatePresence>
                {verifyModal.isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
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
                                                <input type="number" min="0" max="100" value={verifyModal.scores.pilgan} onChange={(e) => handleScoreChange('pilgan', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Esai AI ({examInfo?.bobot_esai}%)</label>
                                                <input type="number" min="0" max="100" value={verifyModal.scores.esai} onChange={(e) => handleScoreChange('esai', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Upload ({examInfo?.bobot_upload}%)</label>
                                                <input type="number" min="0" max="100" value={verifyModal.scores.file} onChange={(e) => handleScoreChange('file', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                                            </div>
                                        </div>

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
                                <button onClick={closeVerifyModal} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
                                <button onClick={submitVerification} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">Verifikasi &amp; Publish</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
