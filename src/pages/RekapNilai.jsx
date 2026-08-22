import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import examService from '../services/exam.service';
import gradingService from '../services/grading.service';
import siakadService from '../services/siakad.service';
import SiakadSearchPicker from '../components/SiakadSearchPicker';
import MatkulSelect from '../components/MatkulSelect';

export default function RekapNilai() {
    // State Master Data
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);
    
    // State Filter (2 Tingkat)
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    
    // State Data Tabel & Ujian
    const [scores, setScores] = useState([]);
    const [examInfo, setExamInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    // State Modal Verifikasi
    const [verifyModal, setVerifyModal] = useState({
        isOpen: false,
        attempt: null,
        scores: { pilgan: 0, esai: 0, file: 0 }
    });

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
        setSelectedExam(examIdParam);
        fetchAttemptsData(examIdParam);
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
        
        setSelectedExam('');
        setScores([]);
        setExamInfo(null);
    };

    const handleExamChange = async (e) => {
        const examId = e.target.value;
        setSelectedExam(examId);
        if (!examId) return;
        fetchAttemptsData(examId);
    };

    const fetchAttemptsData = async (examId) => {
        setLoading(true);
        try {
            const responseData = await gradingService.getAttempts(examId);
            setScores(responseData.data || responseData || []);
            setExamInfo(responseData.exam_info || null);
            setSiakadTarget({
                kelas: responseData.exam_info?.siakad_kelas_kuliah_id || '',
                periode: responseData.exam_info?.siakad_periode_akademik_id || '',
                rencana: responseData.exam_info?.siakad_rencana_evaluasi_id || ''
            });
            setRencanaOptions([]);
            setSelectedKelasLabel('');
            setKelasKuliahOptions([]);
            if (responseData.exam_info?.kode_mk) fetchKelasKuliahSiakad(responseData.exam_info.kode_mk);
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
        const examName = allExams?.data?.find(e => e.id.toString() === selectedExam)?.nama_ujian || 'Ujian';
        XLSX.writeFile(workbook, `Rekap_${mkName}_${examName}.xlsx`);
    };

    // Estimasi nilai akhir SEBELUM diverifikasi/dipublikasikan, biar dosen tidak perlu buka
    // modal verifikasi dulu baru bisa lihat angkanya.
    const estimateFinalScore = (score) => {
        if (examInfo?.grading_type === 'PER_SOAL') {
            return score.preview_final_score !== null && score.preview_final_score !== undefined
                ? score.preview_final_score
                : null;
        }
        return (
            (score.skor_pilgan_100 * ((examInfo?.bobot_pilgan || 0) / 100)) +
            (score.skor_esai_100 * ((examInfo?.bobot_esai || 0) / 100)) +
            (score.skor_file_100 * ((examInfo?.bobot_upload || 0) / 100))
        );
    };

    const openVerifyModal = (attempt) => {
        setVerifyModal({
            isOpen: true,
            attempt: attempt,
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
                text: 'Nilai telah dipublikasikan ke mahasiswa.',
                timer: 1500,
                showConfirmButton: false
            });

            closeVerifyModal();
            fetchAttemptsData(selectedExam);
        } catch (error) {
            console.error("Gagal verifikasi:", error);
            Swal.fire('Gagal Verifikasi', error.response?.data?.message || 'Terjadi kesalahan saat memverifikasi nilai.', 'error');
        }
    };

    const saveSiakadTarget = async () => {
        if (!siakadTarget.kelas.trim() || !siakadTarget.periode.trim()) {
            return Swal.fire('Data Kurang', 'ID Kelas dan Periode Akademik SIAKAD wajib diisi.', 'warning');
        }
        setSavingTarget(true);
        try {
            await siakadService.setExamTarget(selectedExam, {
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

    // Jalur D setup: cari daftar komponen (rencanaEvaluasiId) dari SIAKAD untuk
    // MK+periode ujian ini, supaya dosen tidak perlu tempel UUID manual.
    const cariKomponenSiakad = async (periodeOverride) => {
        const periodeId = (periodeOverride || siakadTarget.periode).trim();
        if (!periodeId) {
            return Swal.fire('Data Kurang', 'Pilih Kelas Kuliah dulu (otomatis ngisi periode), baru cari komponennya.', 'warning');
        }
        setLoadingRencana(true);
        try {
            const result = await siakadService.getRencanaEvaluasi(examInfo?.kode_mk, periodeId);
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
            fetchAttemptsData(selectedExam);
        } catch (error) {
            console.error("Gagal push ke SIAKAD:", error);
            Swal.fire('Error', error.response?.data?.message || 'Gagal push nilai ke SIAKAD.', 'error');
        } finally {
            setPushingRowId(null);
        }
    };

    const pushAllToSiakad = async () => {
        setPushingAll(true);
        try {
            const result = await siakadService.pushExam(selectedExam);
            Swal.fire({ icon: 'success', title: 'Push ke SIAKAD Dimulai', text: result.message, timer: 2000, showConfirmButton: false });
            fetchAttemptsData(selectedExam);
        } catch (error) {
            console.error("Gagal push semua ke SIAKAD:", error);
            Swal.fire('Error', error.response?.data?.message || 'Gagal push nilai ujian ke SIAKAD.', 'error');
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
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rekap Rincian Nilai & Verifikasi</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Verifikasi hasil ujian mahasiswa, override skor AI jika diperlukan, dan unduh laporan.</p>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={handleExportExcel} disabled={scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/30'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                        Export ke Excel
                    </button>
                    <button onClick={pushAllToSiakad} disabled={!selectedExam || pushingAll || scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${!selectedExam || pushingAll || scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-500/30'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        {pushingAll ? 'Mengirim...' : 'Push Semua ke NL-SIAK'}
                    </button>
                </div>
            </div>

            {/* FILTER 2 TINGKAT */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Saring Mata Kuliah
                    </label>
                    <MatkulSelect matkulList={matkulList} value={selectedMatkul} onChange={handleMatkulChange} placeholder="-- Pilih Mata Kuliah Terlebih Dahulu --" />
                </div>

                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Pilih Sesi Ujian
                    </label>
                    <select value={selectedExam} onChange={handleExamChange} disabled={!selectedMatkul || (filteredExams.length === 0)} className={`w-full px-5 py-4 border rounded-xl text-[13px] font-bold outline-none transition-all appearance-none ${!selectedMatkul ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer'}`}>
                        <option value="" disabled>
                            {!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : (filteredExams.length === 0) ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --"}
                        </option>
                        {filteredExams.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.nama_ujian} (Durasi: {ex.durasi} Menit)</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* INFORMASI BOBOT */}
            {examInfo && (examInfo.grading_type === 'PER_SOAL' ? (
                <div className={`p-4 rounded-xl flex gap-4 text-sm font-medium items-center border ${examInfo.total_bobot_soal === 100 ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <span className="text-xl">⚖️</span>
                    <p>
                        <strong>Mode Per Soal:</strong> Total bobot semua soal saat ini <b>{examInfo.total_bobot_soal}</b>/100.
                        {examInfo.total_bobot_soal !== 100 && ' Verifikasi akan ditolak sampai totalnya tepat 100 — perbaiki bobot tiap soal di menu Kelola Soal.'}
                    </p>
                </div>
            ) : (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 text-sm font-medium text-blue-800 items-center">
                    <span className="text-xl">⚖️</span>
                    <p>
                        <strong>Bobot Ujian:</strong> Pilihan Ganda ({examInfo.bobot_pilgan}%) | Esai ({examInfo.bobot_esai}%) | Upload ({examInfo.bobot_upload}%)
                    </p>
                </div>
            ))}

            {/* NL-SIAK */}
            {selectedExam && (
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
                                <button onClick={cariKomponenSiakad} disabled={loadingRencana || !siakadTarget.periode} className="shrink-0 px-5 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40">
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
                                <tr><td colSpan="8" className="py-16 text-center text-slate-400 font-bold animate-pulse">Memuat data...</td></tr>
                            ) : !selectedExam ? (
                                <tr><td colSpan="8" className="py-20 text-center text-slate-400 font-bold text-sm">Silakan pilih Sesi Ujian pada filter di atas untuk melihat rincian.</td></tr>
                            ) : scores.length === 0 ? (
                                <tr><td colSpan="8" className="py-20 text-center text-slate-400 font-bold text-sm">Belum ada mahasiswa yang mengumpulkan ujian ini.</td></tr>
                            ) : (
                                scores.map((score, index) => (
                                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6">
                                            <p className="font-black text-slate-800 text-[13px]">{score.nama_mahasiswa}</p>
                                            <p className="text-xs text-slate-500 font-medium">{score.nim}</p>
                                        </td>
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
                                                const bobotSoalBelumPas = examInfo?.grading_type === 'PER_SOAL' && examInfo?.total_bobot_soal !== 100;
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
                                                    onClick={() => openVerifyModal(score)}
                                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${score.status === 'SELESAI' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
                                                >
                                                    {score.status === 'SELESAI' ? 'Edit Nilai' : 'Verifikasi'}
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL VERIFIKASI */}
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
                                            Ujian ini bermode <b>Per Soal</b> — nilai akhir dihitung otomatis dari bobot tiap soal (bukan persentase kategori), langsung dari jawaban yang sudah dinilai. Tidak ada skor kategori untuk disesuaikan manual di sini; koreksi skor per soal dilakukan di halaman Penilaian & Evaluasi.
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