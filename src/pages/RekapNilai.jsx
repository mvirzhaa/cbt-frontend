import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import examService from '../services/exam.service';
import gradingService from '../services/grading.service';
import siakadService from '../services/siakad.service';
import sebService from '../services/seb.service';
import SiakadSearchPicker from '../components/SiakadSearchPicker';
import MatkulSelect from '../components/MatkulSelect';
import { extractBlobErrorMessage } from '../utils/format.utils';

// Dropdown "pilih banyak sesi ujian sekaligus" -- menu ini sekarang lebih
// dipakai buat export/push nilai ke NL-SIAK secara massal (lihat CLAUDE.md),
// jadi beda sama MatkulSelect/SiakadSearchPicker yang cuma pilih 1 item.
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

export default function RekapNilai() {
    const navigate = useNavigate();

    // State Master Data
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);

    // State Filter (2 Tingkat) -- Sesi Ujian sekarang multi-select (lihat
    // CLAUDE.md: menu ini jadi lebih fokus buat export & push massal ke
    // NL-SIAK, verifikasi nilainya sendiri pindah ke menu Penilaian & Evaluasi).
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]);
    const [selectedExamIds, setSelectedExamIds] = useState([]);
    const singleExamId = selectedExamIds.length === 1 ? selectedExamIds[0] : null;

    // State Data Tabel & Ujian -- scores gabungan dari semua sesi ujian yang
    // dipilih (tiap baris ditandai exam_id/nama_ujian), examInfoMap per sesi.
    const [scores, setScores] = useState([]);
    const [examInfoMap, setExamInfoMap] = useState({});
    const [loading, setLoading] = useState(false);

    // State Target & Sync SIAKAD
    const [siakadTarget, setSiakadTarget] = useState({ kelas: '', periode: '', rencana: '' });
    const [savingTarget, setSavingTarget] = useState(false);
    const [pushingAll, setPushingAll] = useState(false);
    const [pushingRowId, setPushingRowId] = useState(null);
    const [rencanaOptions, setRencanaOptions] = useState([]);
    const [loadingRencana, setLoadingRencana] = useState(false);

    // FIX 2026-08-20: picker Kelas Kuliah live dari SIAKAD -- ganti kotak teks
    // kosong yang minta dosen ketik manual UUID kelas & periode (titik paling
    // rawan salah, gak ada cara nemuin ID-nya dari dalam CBT sama sekali).
    // 1 kelas hasil pencarian sudah bawa periodeAkademik-nya sendiri, jadi 1
    // pilihan otomatis ngisi kelas+periode sekaligus, lalu auto cari komponen.
    const [kelasKuliahOptions, setKelasKuliahOptions] = useState([]);
    const [kelasKuliahSearch, setKelasKuliahSearch] = useState('');
    const [kelasKuliahPickerOpen, setKelasKuliahPickerOpen] = useState(false);
    const [loadingKelasKuliah, setLoadingKelasKuliah] = useState(false);
    const [selectedKelasLabel, setSelectedKelasLabel] = useState('');

    // State Lockdown Safe Exam Browser (SEB) -- lihat CLAUDE.md bagian
    // "Safe Exam Browser (SEB) Lockdown". Password quit kosong = tetap boleh
    // aktifkan SEB tapi tanpa password (dosen yang pilih risikonya sendiri).
    const [sebRequire, setSebRequire] = useState(false);
    const [sebQuitPassword, setSebQuitPassword] = useState('');
    const [savingSeb, setSavingSeb] = useState(false);
    const [downloadingSeb, setDownloadingSeb] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Deep-link dari tombol "Koreksi Nilai" di LMS (fe-ucl, via SSO ?target=rekap-nilai&
    // exam_id=...) — begitu daftar ujian termuat, auto-pilih matkul+sesi ujian yang dituju
    // supaya dosen tak perlu cari manual dari dua dropdown. `exam_id` dibaca sekali lalu
    // dibuang dari address bar (self-guarding: tidak akan trigger ulang meski allExams
    // berubah lagi nanti).
    useEffect(() => {
        const list = allExams?.data;
        if (!Array.isArray(list) || list.length === 0) return;

        const params = new URLSearchParams(window.location.search);
        const examIdParam = params.get('exam_id');
        if (!examIdParam) return;
        window.history.replaceState({}, '', window.location.pathname);

        const ex = list.find(e => e.id.toString() === examIdParam);
        if (!ex) return;

        setSelectedMatkul(ex.kode_mk);
        setFilteredExams(list.filter(e => e.kode_mk === ex.kode_mk));
        setSelectedExamIds([examIdParam]);
        fetchAttemptsData([examIdParam]);
    }, [allExams]);

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

    const handleMatkulChange = (mkId) => {
        setSelectedMatkul(mkId);

        const examsForThisMatkul = allExams?.data?.filter(ex => ex.kode_mk === mkId) || [];
        setFilteredExams(examsForThisMatkul);

        setSelectedExamIds([]);
        setScores([]);
        setExamInfoMap({});
    };

    const handleExamSelectionChange = (newIds) => {
        setSelectedExamIds(newIds);
        fetchAttemptsData(newIds);
    };

    const resetSiakadSebSections = () => {
        setSiakadTarget({ kelas: '', periode: '', rencana: '' });
        setSebRequire(false);
        setSebQuitPassword('');
        setRencanaOptions([]);
        setSelectedKelasLabel('');
        setKelasKuliahOptions([]);
    };

    const fetchAttemptsData = async (examIds) => {
        if (!examIds || examIds.length === 0) {
            setScores([]);
            setExamInfoMap({});
            resetSiakadSebSections();
            return;
        }

        setLoading(true);
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

            // Target SIAKAD & Wajib-SEB adalah pengaturan per-ujian -- cuma masuk akal
            // kalau persis 1 sesi ujian yang dipilih.
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
            setLoading(false);
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

    // FIX 2026-08-21: label ramah-baca buat komponen evaluasi yang lagi
    // dipilih -- sebelumnya UUID rencanaEvaluasiId mentah selalu keliatan di
    // kotak teks, sekarang cuma keliatan kalau memang lagi diisi manual
    // (fallback). Cocokin siakadTarget.rencana ke rencanaOptions hasil
    // pencarian buat nampilin nama komponennya (mis. "UTS (25%)").
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
        // Langsung cari komponen (UTS/UAS/dst) begitu kelas+periode kepilih,
        // dosen gak perlu klik "Cari Komponen" manual lagi.
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

    // Estimasi nilai akhir SEBELUM diverifikasi/dipublikasikan -- pakai examInfo
    // milik sesi ujian baris ini masing-masing (bisa beda bobot antar sesi).
    const estimateFinalScore = (score) => {
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

    const goToVerifikasi = (score) => {
        navigate(`/grading?exam_id=${score.exam_id}&student_id=${score.user_id}`);
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
        const examInfo = examInfoMap[singleExamId];
        // Password keluar wajib diisi saat PERTAMA kali mengaktifkan -- tanpa itu SEB
        // tidak bisa dikeluarkan sama sekali (bukan "boleh keluar tanpa password").
        // Backend tetap jadi otoritas sebenarnya; ini cuma cegah bolak-balik ke server.
        if (sebRequire && !sebQuitPassword.trim() && !examInfo?.seb_require) {
            return Swal.fire('Password Keluar Wajib Diisi', 'Isi password keluar SEB dulu sebelum mengaktifkan Wajib-SEB untuk pertama kali.', 'warning');
        }
        setSavingSeb(true);
        try {
            await sebService.setExamSettings(singleExamId, {
                seb_require: sebRequire,
                quit_password: sebQuitPassword.trim() || undefined
            });
            setSebQuitPassword('');
            // Update lokal supaya tombol "Unduh .seb" (yang digerbang status TERSIMPAN,
            // bukan cuma checkbox) langsung aktif tanpa perlu re-fetch dari server.
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

    // Jalur D setup: cari daftar komponen (rencanaEvaluasiId) dari SIAKAD untuk
    // MK+periode ujian ini, supaya dosen tidak perlu tempel UUID manual.
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

    const handleResetAttempt = async (attempt, force = false, reason = '') => {
        if (!force) {
            const result = await Swal.fire({
                title: 'Reset Attempt Ujian?',
                html: `Jawaban dan nilai <strong>${attempt.nama_mahasiswa}</strong> (${attempt.nim}) untuk ujian ini akan <strong>dihapus permanen</strong>, supaya dia bisa mengerjakan lagi dari awal. Tindakan ini tidak bisa dibatalkan.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Ya, Reset',
                cancelButtonText: 'Batal'
            });
            if (!result.isConfirmed) return;
        }

        setPushingRowId(attempt.attempt_id);
        try {
            const res = await gradingService.resetAttempt(attempt.attempt_id, force, reason);
            Swal.fire({ icon: 'success', title: 'Attempt Direset', text: res.message, timer: 2000, showConfirmButton: false });
            fetchAttemptsData(selectedExamIds);
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
                    return handleResetAttempt(attempt, true, forceResult.value.trim());
                }
            } else {
                Swal.fire('Error', errData?.message || 'Gagal mereset attempt ujian.', 'error');
            }
        } finally {
            setPushingRowId(null);
        }
    };

    const pushOneToSiakad = async (attempt) => {
        setPushingRowId(attempt.attempt_id);
        try {
            await siakadService.pushAttempt(attempt.attempt_id);
            Swal.fire({ icon: 'success', title: 'Masuk Antrian SIAKAD', timer: 1200, showConfirmButton: false });
            fetchAttemptsData(selectedExamIds);
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
            fetchAttemptsData(selectedExamIds);
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

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 pb-10">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rekap Rincian Nilai &amp; Push NL-SIAK</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Pilih satu atau beberapa sesi ujian untuk melihat rekap, unduh laporan, dan push nilai ke SIAKAD. Untuk menilai &amp; memverifikasi nilai, gunakan menu <strong>Penilaian &amp; Evaluasi</strong> — nilai yang belum diverifikasi di sana tidak bisa dipush.</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={handleExportExcel} disabled={scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/30'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        Export ke Excel
                    </button>
                    <button onClick={pushAllToSiakad} disabled={selectedExamIds.length === 0 || pushingAll || scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${selectedExamIds.length === 0 || pushingAll || scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/30'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        {pushingAll ? 'Mengirim...' : `Push ${selectedExamIds.length > 1 ? `${selectedExamIds.length} Sesi` : 'Semua'} ke NL-SIAK`}
                    </button>
                </div>
            </div>

            {/* FILTER 2 TINGKAT */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative">
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none -z-10">
                    <div className="absolute right-0 top-0 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
                </div>

                <div className="flex-1 md:flex-[1.4] relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Saring Mata Kuliah
                    </label>
                    <MatkulSelect matkulList={matkulList} value={selectedMatkul} onChange={handleMatkulChange} placeholder="-- Pilih Mata Kuliah Terlebih Dahulu --" />
                </div>

                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Pilih Sesi Ujian (bisa lebih dari satu)
                    </label>
                    <ExamMultiSelect
                        exams={filteredExams}
                        selectedIds={selectedExamIds}
                        onChange={handleExamSelectionChange}
                        disabled={!selectedMatkul || filteredExams.length === 0}
                        placeholder={!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : (filteredExams.length === 0 ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --")}
                    />
                </div>
            </div>

            {/* INFORMASI BOBOT */}
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
                                    {info.total_bobot_soal !== 100 && ' Verifikasi akan ditolak di menu Penilaian & Evaluasi sampai totalnya tepat 100 — perbaiki bobot tiap soal di menu Kelola Soal.'}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 text-sm font-medium text-blue-800 items-center">
                                <span className="text-xl">⚖️</span>
                                <p>
                                    <strong>{info.nama_ujian} — Bobot Ujian:</strong> Pilihan Ganda ({info.bobot_pilgan}%) | Esai ({info.bobot_esai}%) | Upload ({info.bobot_upload}%)
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* NL-SIAK -- pengaturan per-ujian, cuma masuk akal kalau 1 sesi dipilih */}
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

            {/* SAFE EXAM BROWSER (SEB) LOCKDOWN -- pengaturan per-ujian, 1 sesi dipilih */}
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
                            <input
                                type="checkbox"
                                checked={sebRequire}
                                onChange={(e) => setSebRequire(e.target.checked)}
                                className="w-6 h-6 rounded-lg border-2 border-slate-300 text-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 shrink-0"
                            />
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

            {/* TABEL RINCIAN NILAI */}
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
                            {loading ? (
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
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {parseFloat(Number(score.skor_pilgan_100).toFixed(2))}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {parseFloat(Number(score.skor_esai_100).toFixed(2))}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {parseFloat(Number(score.skor_file_100).toFixed(2))}
                                        </td>
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
                                                <span className="text-xl font-black tracking-tight text-[#0f4c3a]">
                                                    {parseFloat(Number(score.final_score).toFixed(2))}
                                                </span>
                                            ) : (() => {
                                                const estimate = estimateFinalScore(score);
                                                const info = examInfoMap[score.exam_id];
                                                const bobotSoalBelumPas = info?.grading_type === 'PER_SOAL' && info?.total_bobot_soal !== 100;
                                                return estimate !== null ? (
                                                    <div>
                                                        <span className={`text-xl font-black tracking-tight italic ${bobotSoalBelumPas ? 'text-red-400' : 'text-slate-400'}`}>
                                                            ≈{parseFloat(Number(estimate).toFixed(2))}
                                                        </span>
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => goToVerifikasi(score)}
                                                    title="Nilai & verifikasi di menu Penilaian & Evaluasi"
                                                    className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                                >
                                                    {score.status === 'SELESAI' ? 'Lihat Nilai' : 'Nilai & Verifikasi'}
                                                </button>
                                                {score.status === 'SELESAI' && (
                                                    <button
                                                        onClick={() => pushOneToSiakad(score)}
                                                        disabled={pushingRowId === score.attempt_id}
                                                        className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${score.siakad_sync_status === 'GAGAL' ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`}
                                                    >
                                                        {pushingRowId === score.attempt_id ? 'Mengirim...' : score.siakad_sync_status === 'GAGAL' ? 'Retry' : 'Push'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleResetAttempt(score)}
                                                    disabled={pushingRowId === score.attempt_id}
                                                    title={score.siakad_sync_status === 'TERKIRIM' ? 'Sudah terkirim ke SIAKAD, batalkan dulu di sana' : 'Hapus attempt supaya mahasiswa bisa ujian ulang'}
                                                    className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </motion.div>
    );
}
