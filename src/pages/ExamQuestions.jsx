import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import examService from '../services/exam.service';
import questionService from '../services/question.service';
import questionBankService from '../services/questionBank.service';
import cpmkService from '../services/cpmk.service';
import siakadService from '../services/siakad.service';
import MathText from '../components/MathText';
import SiakadSearchPicker from '../components/SiakadSearchPicker';

export default function ExamQuestions() {
    const { examId } = useParams();
    const numericExamId = Number(examId);

    const [exam, setExam] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [questionList, setQuestionList] = useState([]);
    const [cpmkList, setCpmkList] = useState([]);
    const totalBobotSoal = questionList.reduce((sum, q) => sum + (parseFloat(q.bobot_nilai) || 0), 0);

    // State Form
    const [editId, setEditId] = useState(null);
    const [tipeSoal, setTipeSoal] = useState('pg');
    const [pertanyaan, setPertanyaan] = useState('');
    const [subCpmkId, setSubCpmkId] = useState('');
    const [opsi, setOpsi] = useState(['', '', '', '', '']);
    const [kunciJawabanPG, setKunciJawabanPG] = useState(0);
    const [kunciJawabanMultiple, setKunciJawabanMultiple] = useState([]);
    const [kunciEsai, setKunciEsai] = useState('');
    const [bobotNilai, setBobotNilai] = useState(10);

    // State picker Sub-CPMK live dari SIAKAD (auto-provision cpmk/sub_cpmk
    // lokal di belakang layar begitu dosen pilih — lihat resolveCpmkFromSiakad)
    const [siakadCpmkData, setSiakadCpmkData] = useState({ cpmkData: [] });
    const [siakadCpmkSearch, setSiakadCpmkSearch] = useState('');
    const [siakadCpmkPickerOpen, setSiakadCpmkPickerOpen] = useState(false);
    const [siakadCpmkLoading, setSiakadCpmkLoading] = useState(false);
    const [resolvingCpmk, setResolvingCpmk] = useState(false);

    // State referensi semua komponen evaluasi (UTS/UAS/Tugas/dst) periode ini
    const [semuaKomponen, setSemuaKomponen] = useState([]);
    const [loadingSemuaKomponen, setLoadingSemuaKomponen] = useState(false);
    const [komponenTerbuka, setKomponenTerbuka] = useState(null);

    // State Modal Impor Bank Soal
    const [showImportModal, setShowImportModal] = useState(false);
    const [bankList, setBankList] = useState([]);
    const [selectedBankIds, setSelectedBankIds] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    const fetchExam = async () => {
        try {
            const data = await examService.getExams();
            const found = data?.data?.find(ex => ex.id === numericExamId);
            setExam(found || null);
        } catch (error) {
            console.error("Gagal menarik data ujian.", error);
        }
    };

    const fetchQuestions = async () => {
        try {
            const data = await questionService.getQuestions();
            const filtered = (data?.data || []).filter(q => q.exam_id === numericExamId);
            setQuestionList(filtered);
        } catch (error) {
            console.error("Gagal menarik data soal.", error);
        }
    };

    const fetchCpmk = async (kodeMk) => {
        try {
            const data = await cpmkService.getCpmk({ kode_mk: kodeMk });
            setCpmkList(data?.data || []);
        } catch (error) {
            console.error("Gagal menarik data CPMK.", error);
        }
    };

    const fetchSiakadCpmk = async (kodeMk) => {
        setSiakadCpmkLoading(true);
        try {
            const result = await siakadService.getPemetaanCpmk(kodeMk);
            setSiakadCpmkData(result?.data || { cpmkData: [] });
        } catch (error) {
            console.error("Gagal menarik Pemetaan CPMK dari SIAKAD.", error);
        } finally {
            setSiakadCpmkLoading(false);
        }
    };

    // FIX 2026-08-21: referensi SEMUA komponen evaluasi (UTS/UAS/Tugas/dst)
    // periode ini, masing² bawa Sub-CPMK+bobot resminya sendiri -- sebelumnya
    // dosen cuma lihat komponen yang lagi ditarget exam ini doang, jadi gak
    // ada gambaran "Sub-CPMK X itu jatah komponen mana" sebelum coba-coba.
    const fetchSemuaKomponen = async (kodeMk, periodeId) => {
        setLoadingSemuaKomponen(true);
        try {
            const result = await siakadService.getRencanaEvaluasi(kodeMk, periodeId);
            setSemuaKomponen(result?.data?.rencanaEvaluasi || []);
        } catch (error) {
            console.error("Gagal menarik referensi semua komponen evaluasi.", error);
        } finally {
            setLoadingSemuaKomponen(false);
        }
    };

    useEffect(() => {
        fetchExam();
        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId]);

    useEffect(() => {
        if (exam?.kode_mk) fetchCpmk(exam.kode_mk);
        if (exam?.mata_kuliah?.siakad_id) fetchSiakadCpmk(exam.kode_mk);
        if (exam?.kode_mk && exam?.siakad_periode_akademik_id) fetchSemuaKomponen(exam.kode_mk, exam.siakad_periode_akademik_id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam?.kode_mk, exam?.mata_kuliah?.siakad_id, exam?.siakad_periode_akademik_id]);

    // FIX 2026-08-20: dulu SEMUA Sub-CPMK satu MK ditampilin di sini, gak
    // peduli exam ini "UTS"/"UAS"/dst -- gampang salah pilih Sub-CPMK yang
    // bobot resminya sebenarnya jatah komponen LAIN (sudah kejadian nyata:
    // soal turunan ke-assign ke Sub-CPMK yg jatahnya UAS padahal exam-nya
    // UTS). Begitu target SIAKAD exam ini sudah di-set (exam.siakad_bobot_cpmk
    // ke-isi, lihat setExamSiakadTarget di BE), Sub-CPMK yang gak punya bobot
    // resmi di komponen itu disembunyikan dari kedua picker di bawah.
    const examBobotMap = exam?.siakad_bobot_cpmk || null;
    const punyaBobotResmi = (externalId) => !examBobotMap || (externalId && externalId in examBobotMap);

    const subCpmkOptionsSemua = cpmkList.flatMap(c => (c.sub_cpmk || []).map(sc => ({ ...sc, cpmkLabel: c.kode_cpmk })));
    const subCpmkOptions = subCpmkOptionsSemua.filter(sc => punyaBobotResmi(sc.external_id));
    const jumlahSubCpmkTersembunyi = subCpmkOptionsSemua.length - subCpmkOptions.length;

    // FIX 2026-08-21: checklist cakupan Sub-CPMK resmi komponen ini -- sebelumnya
    // gak ada cara dosen tau kalau 1 Sub-CPMK kelewat sama sekali gak dikasih
    // soal (baru ketauan pas udah dipush & CPMK-nya nongol 0% di SIAKAD). Data
    // Sub-CPMK resminya sendiri udah ada di exam.siakad_bobot_cpmk (dicache pas
    // Set Target), tinggal dicocokin ke soal yang beneran ada di exam ini.
    const cakupanSubCpmk = examBobotMap
        ? Object.keys(examBobotMap)
            .map(externalId => {
                const localSub = subCpmkOptionsSemua.find(sc => sc.external_id === externalId);
                if (!localSub) return null; // entri di level CPMK induk, bukan Sub-CPMK -- skip
                const jumlahSoal = questionList.filter(q => q.sub_cpmk_id === localSub.id).length;
                return { externalId, kode: localSub.kode_sub_cpmk, cpmkLabel: localSub.cpmkLabel, jumlahSoal };
            })
            .filter(Boolean)
            .sort((a, b) => a.kode.localeCompare(b.kode))
        : [];
    const jumlahBelumKeCover = cakupanSubCpmk.filter(c => c.jumlahSoal === 0).length;

    // Leaf Sub-CPMK dari SIAKAD (cuma yang benar2 punya subCpmk — CPMK tanpa
    // Sub-CPMK di SIAKAD tidak dimunculkan, sama seperti dropdown lokal di
    // bawah yang juga cuma bisa pilih Sub-CPMK, bukan CPMK level induk).
    const siakadSubCpmkItemsSemua = (siakadCpmkData?.cpmkData || []).flatMap(c =>
        (c.subCpmk || c.sub_cpmk || []).map(sub => ({
            cpmkKode: c.kode, cpmkDeskripsi: c.deskripsi, cpmkExternalId: c.id,
            subKode: sub.kode, subDeskripsi: sub.deskripsi, subExternalId: sub.id
        }))
    );
    const siakadSubCpmkItems = siakadSubCpmkItemsSemua.filter(i => punyaBobotResmi(i.subExternalId));
    const filteredSiakadSubCpmk = siakadCpmkSearch.trim()
        ? siakadSubCpmkItems.filter(i =>
            i.subKode?.toLowerCase().includes(siakadCpmkSearch.toLowerCase()) ||
            i.subDeskripsi?.toLowerCase().includes(siakadCpmkSearch.toLowerCase()) ||
            i.cpmkKode?.toLowerCase().includes(siakadCpmkSearch.toLowerCase())
          )
        : siakadSubCpmkItems;

    const handlePickSiakadSubCpmk = async (item) => {
        setResolvingCpmk(true);
        try {
            const result = await siakadService.resolveCpmk(exam.kode_mk, {
                cpmk: { kode: item.cpmkKode, deskripsi: item.cpmkDeskripsi, external_id: item.cpmkExternalId },
                sub_cpmk: { kode: item.subKode, deskripsi: item.subDeskripsi, external_id: item.subExternalId }
            });
            setSubCpmkId(String(result.data.sub_cpmk_id));
            await fetchCpmk(exam.kode_mk); // biar row yg baru dibuat/dipakai ulang langsung muncul di dropdown di bawah
            setSiakadCpmkPickerOpen(false);
            setSiakadCpmkSearch('');
        } catch (error) {
            console.error("Gagal menyiapkan CPMK/Sub-CPMK dari SIAKAD.", error);
            Swal.fire('Gagal', error.response?.data?.message || 'Gagal menyiapkan Sub-CPMK dari SIAKAD.', 'error');
        } finally {
            setResolvingCpmk(false);
        }
    };

    const handleSimpanSoal = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let dbTipeSoal = 'TIPE_1';
            if (tipeSoal === 'pg_multiple') dbTipeSoal = 'TIPE_2';
            if (tipeSoal === 'esai') dbTipeSoal = 'TIPE_3';
            if (tipeSoal === 'upload') dbTipeSoal = 'TIPE_4';

            let dbKunciJawaban = null;
            if (tipeSoal === 'pg') {
                dbKunciJawaban = ['A', 'B', 'C', 'D', 'E'][kunciJawabanPG];
            } else if (tipeSoal === 'pg_multiple') {
                const selectedKeys = kunciJawabanMultiple?.map(idx => ['A', 'B', 'C', 'D', 'E'][idx]);
                dbKunciJawaban = selectedKeys.join(',');
            } else if (tipeSoal === 'esai' || tipeSoal === 'upload') {
                dbKunciJawaban = kunciEsai;
            }

            const payload = {
                exam_id: numericExamId,
                tipe_soal: dbTipeSoal,
                isi_soal: pertanyaan,
                opsi_jawaban: (tipeSoal === 'pg' || tipeSoal === 'pg_multiple')
                    ? [opsi[0], opsi[1], opsi[2], opsi[3], opsi[4]]
                    : null,
                kunci_jawaban: dbKunciJawaban,
                bobot_nilai: parseFloat(bobotNilai) || 0,
                sub_cpmk_id: subCpmkId ? parseInt(subCpmkId) : null
            };

            if (editId) {
                await questionService.updateQuestion(editId, payload);
            } else {
                await questionService.createQuestion(payload);
            }

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Soal tersimpan!', showConfirmButton: false, timer: 2000 });
            batalEdit();
            fetchQuestions();
        } catch (error) {
            console.error(error);
            Swal.fire('Gagal Menyimpan!', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan soal.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleHapusSoal = async (id) => {
        const result = await Swal.fire({
            title: 'Hapus Soal Ini?',
            text: "Data soal yang dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus Permanen!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                await questionService.deleteQuestion(id);
                fetchQuestions();
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Soal terhapus.', showConfirmButton: false, timer: 1500 });
            } catch (error) {
                Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus soal.', 'error');
            }
        }
    };

    const handleMulaiEdit = (q) => {
        setEditId(q.id);

        let formTipe = 'pg';
        if (q.tipe_soal === 'TIPE_1') formTipe = 'pg';
        else if (q.tipe_soal === 'TIPE_2') formTipe = 'pg_multiple';
        else if (q.tipe_soal === 'TIPE_3') formTipe = 'esai';
        else if (q.tipe_soal === 'TIPE_4') formTipe = 'upload';

        setTipeSoal(formTipe);
        setPertanyaan(q.isi_soal);
        setBobotNilai(q.bobot_nilai ?? 10);
        setSubCpmkId(q.sub_cpmk_id ? String(q.sub_cpmk_id) : '');

        if ((formTipe === 'pg' || formTipe === 'pg_multiple') && q.opsi_jawaban) {
            try {
                const parsedOpsi = typeof q.opsi_jawaban === 'string' ? JSON.parse(q.opsi_jawaban) : q.opsi_jawaban;
                const opsiArray = Array.isArray(parsedOpsi)
                    ? [parsedOpsi[0] || '', parsedOpsi[1] || '', parsedOpsi[2] || '', parsedOpsi[3] || '', parsedOpsi[4] || '']
                    : [
                        parsedOpsi.A || parsedOpsi[0] || '',
                        parsedOpsi.B || parsedOpsi[1] || '',
                        parsedOpsi.C || parsedOpsi[2] || '',
                        parsedOpsi.D || parsedOpsi[3] || '',
                        parsedOpsi.E || parsedOpsi[4] || ''
                    ];
                setOpsi(opsiArray);

                if (formTipe === 'pg') {
                    const keys = ['A', 'B', 'C', 'D', 'E'];
                    const kunciIdx = keys.indexOf(q.kunci_jawaban);
                    setKunciJawabanPG(kunciIdx >= 0 ? kunciIdx : 0);
                    setKunciJawabanMultiple([]);
                } else if (formTipe === 'pg_multiple') {
                    const kunciArray = typeof q.kunci_jawaban === 'string'
                        ? (q.kunci_jawaban.includes(',') ? q.kunci_jawaban.split(',') : JSON.parse(q.kunci_jawaban || '[]'))
                        : (q.kunci_jawaban || []);
                    const keys = ['A', 'B', 'C', 'D', 'E'];
                    const indices = kunciArray?.map(k => keys.indexOf(k)).filter(idx => idx >= 0);
                    setKunciJawabanMultiple(indices);
                    setKunciJawabanPG(0);
                }
            } catch (error) {
                console.error('Error parsing opsi_jawaban:', error);
                setOpsi(['', '', '', '', '']);
                setKunciJawabanPG(0);
                setKunciJawabanMultiple([]);
            }
        } else if (formTipe === 'esai' || formTipe === 'upload') {
            setKunciEsai(q.kunci_jawaban || '');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const batalEdit = () => {
        setEditId(null);
        setTipeSoal('pg');
        setPertanyaan('');
        setSubCpmkId('');
        setOpsi(['', '', '', '', '']);
        setKunciJawabanPG(0);
        setKunciJawabanMultiple([]);
        setKunciEsai('');
        setBobotNilai(10);
    };

    const toggleMultipleChoice = (index) => {
        setKunciJawabanMultiple(prev => {
            if (prev.includes(index)) return prev.filter(i => i !== index);
            return [...prev, index].sort();
        });
    };

    const handleOpsiChange = (index, value) => {
        const newOpsi = [...opsi];
        newOpsi[index] = value;
        setOpsi(newOpsi);
    };

    const formatTipeLabel = (tipe) => {
        if (tipe === 'TIPE_1') return { label: 'Pilihan Ganda', css: 'bg-blue-50 text-blue-700 border-blue-200' };
        if (tipe === 'TIPE_2') return { label: 'Multi Pilihan', css: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        if (tipe === 'TIPE_3') return { label: 'Esai Bebas', css: 'bg-purple-50 text-purple-700 border-purple-200' };
        return { label: 'Upload Berkas', css: 'bg-amber-50 text-amber-700 border-amber-200' };
    };

    // ===== Impor dari Bank Soal =====
    const openImportModal = async () => {
        if (!exam?.kode_mk) return;
        setShowImportModal(true);
        setSelectedBankIds([]);
        try {
            const data = await questionBankService.getBankSoal({ kode_mk: exam.kode_mk });
            setBankList(data?.data || []);
        } catch (error) {
            console.error("Gagal menarik bank soal.", error);
            Swal.fire('Gagal', 'Tidak bisa menarik data Bank Soal.', 'error');
        }
    };

    const toggleBankSelection = (id) => {
        setSelectedBankIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleImportSelected = async () => {
        if (selectedBankIds.length === 0) return;
        setIsImporting(true);
        try {
            await questionBankService.importToExam({ exam_id: numericExamId, bank_ids: selectedBankIds });
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${selectedBankIds.length} soal diimpor!`, showConfirmButton: false, timer: 2000 });
            setShowImportModal(false);
            fetchQuestions();
        } catch (error) {
            Swal.fire('Gagal Impor', error.response?.data?.message || 'Terjadi kesalahan saat mengimpor soal.', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-12">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Link to="/create-exam" className="text-[11px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest mb-2 inline-flex items-center gap-1">
                        &larr; Kembali ke Penerbitan Ujian
                    </Link>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Kelola Soal Ujian</h3>
                    <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">
                        {exam ? `${exam.nama_ujian} • ${exam.kode_mk} - ${exam.mata_kuliah?.nama_mk || ''}` : 'Memuat data ujian...'}
                    </p>
                </div>
                <button onClick={openImportModal} disabled={!exam} className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-lg shadow-[#0f4c3a]/30 transition-all active:scale-95 disabled:opacity-50">
                    + Impor dari Bank Soal
                </button>
            </div>

            {/* REFERENSI RENCANA EVALUASI — semua komponen (UTS/UAS/Tugas/dst) periode
                ini, masing² dengan Sub-CPMK+bobot resminya, biar dosen lihat gambaran
                utuh sebelum assign Sub-CPMK ke soal (bukan coba-coba). Komponen yang
                lagi ditarget exam ini ditandai & default kebuka. */}
            {semuaKomponen.length > 0 && (
                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100/50 bg-white/50 flex items-center justify-between">
                        <div>
                            <h4 className="text-[13px] font-black uppercase tracking-widest text-[#0f4c3a]">Referensi Rencana Evaluasi</h4>
                            <p className="text-[11px] font-medium text-slate-400 mt-1">Semua komponen periode ini beserta Sub-CPMK resminya — biar gak salah pilih pas assign soal.</p>
                        </div>
                        {jumlahBelumKeCover > 0 && (
                            <span className="shrink-0 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg uppercase tracking-widest">
                                {jumlahBelumKeCover} Sub-CPMK "{exam?.nama_ujian}" belum ada soal
                            </span>
                        )}
                    </div>

                    <div className="divide-y divide-slate-100">
                        {semuaKomponen.map(komp => {
                            const isTarget = komp.id === exam?.siakad_rencana_evaluasi_id;
                            const isOpen = komponenTerbuka === null ? isTarget : komponenTerbuka === komp.id;
                            const subCpmkList = Object.entries(komp.mappingBobotCpmk || {})
                                .map(([externalId, bobot]) => {
                                    const localSub = subCpmkOptionsSemua.find(sc => sc.external_id === externalId);
                                    if (!localSub) return null;
                                    return { externalId, kode: localSub.kode_sub_cpmk, bobot, jumlahSoal: questionList.filter(q => q.sub_cpmk_id === localSub.id).length };
                                })
                                .filter(Boolean)
                                .sort((a, b) => a.kode.localeCompare(b.kode));

                            return (
                                <div key={komp.id}>
                                    <button
                                        onClick={() => setKomponenTerbuka(isOpen ? '__closed__' : komp.id)}
                                        className={`w-full flex items-center justify-between gap-4 px-8 py-4 text-left transition-colors ${isTarget ? 'bg-[#0f4c3a]/[0.03]' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                                            <span className="text-[13px] font-black text-slate-800">{komp.metodeEvaluasi}</span>
                                            {komp.jenisEvaluasi && <span className="text-[11px] font-medium text-slate-400">{komp.jenisEvaluasi}</span>}
                                            {isTarget && (
                                                <span className="text-[9px] font-black text-[#0f4c3a] bg-[#d4af37]/20 border border-[#0f4c3a]/20 px-2 py-0.5 rounded-md uppercase tracking-widest">Target Ujian Ini</span>
                                            )}
                                        </div>
                                        <span className="text-[12px] font-mono font-bold text-slate-500 shrink-0">{komp.bobotEvaluasi}%</span>
                                    </button>
                                    {isOpen && (
                                        <div className="px-8 pb-5 grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {subCpmkList.length === 0 ? (
                                                <p className="col-span-full text-[12px] text-slate-400 italic">Belum ada Sub-CPMK dipetakan buat komponen ini di SIAKAD.</p>
                                            ) : subCpmkList.map(c => (
                                                <div key={c.externalId} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold border ${
                                                    !isTarget ? 'bg-slate-50 border-slate-200 text-slate-600'
                                                    : c.jumlahSoal > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-300 text-amber-700'
                                                }`}>
                                                    {isTarget && <span>{c.jumlahSoal > 0 ? '✓' : '⚠'}</span>}
                                                    <span className="flex-1">{c.kode}</span>
                                                    <span className="text-[10px] font-mono opacity-70">{isTarget ? (c.jumlahSoal > 0 ? `${c.jumlahSoal} soal` : 'kosong') : `${c.bobot}pt`}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FORM INPUT SOAL */}
            <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border relative overflow-hidden transition-colors duration-500 ${editId ? 'border-amber-300' : 'border-slate-100'}`}>
                {editId && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}

                <div className="px-8 md:px-10 py-6 border-b border-slate-100/50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                    <h3 className={`text-[15px] font-black uppercase tracking-widest ${editId ? 'text-amber-800' : 'text-[#0f4c3a]'}`}>
                        {editId ? 'Ubah Pertanyaan' : 'Tulis Pertanyaan Baru'}
                    </h3>
                    {editId && (
                        <button type="button" onClick={batalEdit} className="text-[11px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-lg">Batal Edit</button>
                    )}
                </div>

                <form onSubmit={handleSimpanSoal} className="p-8 md:p-10 space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">A. Jenis Pertanyaan</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                { id: 'pg', label: 'Pilihan Ganda' },
                                { id: 'pg_multiple', label: 'Multi Pilihan' },
                                { id: 'esai', label: 'Esai Bebas' },
                                { id: 'upload', label: 'Upload File' }
                            ].map(t => (
                                <button key={t.id} type="button" onClick={() => setTipeSoal(t.id)} className={`py-3.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border-2 text-center transition-all ${tipeSoal === t.id ? 'bg-[#0f4c3a] border-[#0f4c3a] text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">B. Teks Pertanyaan</label>
                        <textarea required value={pertanyaan} onChange={e => setPertanyaan(e.target.value)} rows="4" placeholder="Tuliskan isi pertanyaan soal di sini... (rumus matematika: $x^2 + y^2 = z^2$)" className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium text-slate-800 text-[14px] resize-none" />
                        <p className="text-[10px] text-slate-400 mt-1">Gunakan <code>$...$</code> untuk rumus inline atau <code>$$...$$</code> untuk rumus blok, contoh: <code>$\int_1^9 x\,dx$</code></p>
                        {pertanyaan && (
                            <div className="mt-2 px-4 py-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Preview</p>
                                <p className="text-slate-800 text-[14px]"><MathText text={pertanyaan} /></p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Bobot Nilai Soal Ini</label>
                        <div className="relative max-w-[200px]">
                            <input type="number" min="0" max="100" step="0.01" required value={bobotNilai} onChange={e => setBobotNilai(e.target.value)} className="w-full px-5 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]" />
                        </div>
                        {exam?.grading_type === 'PER_SOAL' && (
                            <p className="text-[10px] text-slate-400 mt-1.5">
                                Total bobot semua soal di ujian ini saat ini <b>{totalBobotSoal}</b>{editId ? '' : ` + soal ini = ${(totalBobotSoal + (parseFloat(bobotNilai) || 0)).toFixed(2)}`}. Harus tepat 100 sebelum nilai bisa diverifikasi (mode Per Soal).
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Sub-CPMK (opsional)</label>

                        {exam?.mata_kuliah?.siakad_id && !examBobotMap && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 font-semibold">
                                ⚠ Target SIAKAD (kelas/periode/komponen) belum di-set untuk ujian ini — SEMUA Sub-CPMK mata kuliah ditampilkan tanpa filter, termasuk yang jatah komponen lain (mis. UAS). Set Target SIAKAD dulu di menu "Penerbitan Ujian" biar picker ini otomatis kefilter sesuai komponen "{exam?.nama_ujian}".
                            </p>
                        )}

                        {exam?.mata_kuliah?.siakad_id && (
                            <div className="max-w-md">
                                <SiakadSearchPicker
                                    label={null}
                                    searchValue={siakadCpmkSearch}
                                    onSearchChange={setSiakadCpmkSearch}
                                    isOpen={siakadCpmkPickerOpen}
                                    onOpenChange={setSiakadCpmkPickerOpen}
                                    items={filteredSiakadSubCpmk}
                                    getKey={item => `${item.cpmkKode}-${item.subKode}`}
                                    renderItem={item => (
                                        <>
                                            <p className="text-[12px] font-black text-slate-800">{item.subKode} — {item.subDeskripsi}</p>
                                            <p className="text-[10px] font-bold text-slate-400">Induk CPMK: {item.cpmkKode}</p>
                                        </>
                                    )}
                                    onSelect={handlePickSiakadSubCpmk}
                                    loading={siakadCpmkLoading || resolvingCpmk}
                                    placeholder="Cari Sub-CPMK langsung dari SIAKAD..."
                                />
                                <p className="text-[10px] text-slate-400 -mt-4 mb-4">Pilih dari SIAKAD di atas, atau dari yang sudah pernah dipakai di dropdown bawah ini.</p>
                            </div>
                        )}

                        <select value={subCpmkId} onChange={e => setSubCpmkId(e.target.value)} className="w-full max-w-md px-5 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]">
                            <option value="">-- Tanpa Sub-CPMK --</option>
                            {subCpmkOptions.map(sc => (
                                <option key={sc.id} value={sc.id}>{sc.cpmkLabel} • {sc.kode_sub_cpmk}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            Dipakai buat hitung capaian CPMK &amp; push breakdown nilai ke NL-SIAK — soal tanpa Sub-CPMK yang punya ID NL-SIAK (lihat menu CPMK &amp; Sub-CPMK) tidak akan ikut ter-push.
                        </p>
                        {examBobotMap && jumlahSubCpmkTersembunyi > 0 && (
                            <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                {jumlahSubCpmkTersembunyi} Sub-CPMK disembunyikan — bobotnya bukan bagian dari komponen "{exam?.nama_ujian}" yang di-set buat ujian ini (mis. jatah UAS, bukan UTS).
                            </p>
                        )}
                    </div>

                    {(tipeSoal === 'pg' || tipeSoal === 'pg_multiple') && (
                        <div className="p-6 md:p-8 rounded-2xl border-2 border-slate-100 bg-slate-50/30 space-y-5">
                            <h4 className="text-[12px] font-black text-slate-600 uppercase tracking-widest">C. Opsi & Kunci Jawaban</h4>
                            <div className="space-y-4">
                                {['A', 'B', 'C', 'D', 'E'].map((label, idx) => (
                                    <div key={label} className="flex gap-4 items-center">
                                        {tipeSoal === 'pg' ? (
                                            <button type="button" onClick={() => setKunciJawabanPG(idx)} className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all ${kunciJawabanPG === idx ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'}`}>
                                                {label}
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => toggleMultipleChoice(idx)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border-2 transition-all ${kunciJawabanMultiple.includes(idx) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'}`}>
                                                {label}
                                            </button>
                                        )}
                                        <input type="text" required value={opsi[idx]} onChange={e => handleOpsiChange(idx, e.target.value)} placeholder={`Isi jawaban pilihan ${label}...`} className="flex-1 px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-[13px] shadow-sm" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                                * Klik tombol lingkaran/kotak huruf di sebelah kiri input untuk menjadikannya sebagai Kunci Jawaban.
                            </p>
                        </div>
                    )}

                    {(tipeSoal === 'esai' || tipeSoal === 'upload') && (
                        <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50/30">
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">
                                C. {tipeSoal === 'esai' ? 'Rubrik Kunci Jawaban Esai (Acuan Koreksi AI)' : 'Model / Kunci Jawaban Upload (Referensi Penilaian Dosen)'}
                            </label>
                            <textarea value={kunciEsai} onChange={e => setKunciEsai(e.target.value)} rows="3" placeholder={tipeSoal === 'esai' ? 'Tulis poin-poin penting atau jawaban ideal yang diharapkan dari esai ini...' : 'Tulis model jawaban atau rubrik penilaian yang menjadi acuan dosen saat menilai file yang diupload...'} className="w-full px-5 py-4 bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-slate-800 text-[13px] resize-none" />
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={isLoading} className={`px-10 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg transition-all w-full md:w-auto ${editId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-[#0f4c3a]/30'}`}>
                            {isLoading ? 'Menyimpan...' : editId ? 'Simpan Edit Soal' : 'Tambah Soal ke Ujian'}
                        </button>
                    </div>
                </form>
            </div>

            {/* DAFTAR SOAL UJIAN INI */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Soal Ujian Ini</h3>
                    <div className="flex items-center gap-2">
                        {exam?.grading_type === 'PER_SOAL' && (
                            <span className={`text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm ${totalBobotSoal === 100 ? 'bg-emerald-600 text-white' : 'bg-red-100 text-red-700 border border-red-300 animate-pulse'}`}>
                                Bobot: {totalBobotSoal}/100
                            </span>
                        )}
                        <span className="bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm">Total: {questionList.length} Butir</span>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {questionList.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 font-bold text-[14px]">Belum ada soal di ujian ini. Tulis manual di atas atau impor dari Bank Soal.</div>
                    ) : (
                        questionList.map((q, idx) => {
                            const tipeInfo = formatTipeLabel(q.tipe_soal);
                            let formattedOpsi = null;
                            if (q.opsi_jawaban) {
                                try {
                                    formattedOpsi = typeof q.opsi_jawaban === 'string' ? JSON.parse(q.opsi_jawaban) : q.opsi_jawaban;
                                } catch (e) {
                                    // ignore JSON parse error
                                }
                            }

                            return (
                                <div key={q.id} className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 hover:shadow-md transition-all relative group flex flex-col md:flex-row gap-6 justify-between items-start">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="text-xs font-mono font-black text-slate-400">#{(idx + 1).toString().padStart(3, '0')}</span>
                                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${tipeInfo.css}`}>
                                                {tipeInfo.label}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border bg-slate-100 text-slate-600 border-slate-200">
                                                Bobot: {q.bobot_nilai ?? 10}
                                            </span>
                                            {q.sub_cpmk_id ? (
                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${q.siakad_ready ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`} title={q.siakad_ready ? 'Siap di-push ke NL-SIAK' : 'Sub-CPMK belum tersambung ke ID NL-SIAK — sync dulu di menu CPMK & Sub-CPMK'}>
                                                    {q.siakad_ready ? '✓ Siap NL-SIAK' : '⚠ Sub-CPMK belum sync NL-SIAK'}
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border bg-slate-50 text-slate-400 border-slate-200" title="Tanpa Sub-CPMK, tidak ikut push breakdown ke NL-SIAK">
                                                    Tanpa Sub-CPMK
                                                </span>
                                            )}
                                        </div>

                                        <p className="font-bold text-slate-800 text-[15px] leading-relaxed"><MathText text={q.isi_soal} /></p>

                                        {formattedOpsi && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                                                {Object.keys(formattedOpsi)?.map((key) => {
                                                    const isKunci = q.kunci_jawaban === key || (q.kunci_jawaban && q.kunci_jawaban.split(',').includes(key));
                                                    return (
                                                        <div key={key} className={`flex items-center gap-2.5 text-xs font-semibold py-1 px-3 rounded-lg ${isKunci ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'text-slate-500 bg-white border border-slate-100'}`}>
                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isKunci ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{key}</span>
                                                            <span className="truncate"><MathText text={formattedOpsi[key]} /></span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {(q.tipe_soal === 'TIPE_3' || q.tipe_soal === 'TIPE_4') && q.kunci_jawaban && (
                                            <div className={`pl-4 border-l-2 text-xs italic font-medium ${q.tipe_soal === 'TIPE_3' ? 'border-purple-300 text-purple-700' : 'border-amber-300 text-amber-700'}`}>
                                                {q.tipe_soal === 'TIPE_3' ? 'Rubrik Kunci' : 'Model Jawaban'}: {q.kunci_jawaban}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 shrink-0 self-end md:self-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button onClick={() => handleMulaiEdit(q)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors shadow-sm" title="Edit Soal">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleHapusSoal(q.id)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm" title="Hapus Soal">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* MODAL IMPOR DARI BANK SOAL */}
            <AnimatePresence>
                {showImportModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Impor dari Bank Soal</h3>
                                    <p className="text-[12px] font-medium text-slate-500 mt-1">Mata Kuliah: {exam?.kode_mk} - {exam?.mata_kuliah?.nama_mk}</p>
                                </div>
                                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {bankList.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 font-bold text-[13px]">Belum ada bank soal untuk mata kuliah ini. Buat dulu lewat menu "Manajemen Bank Soal".</div>
                                ) : (
                                    bankList.map(b => {
                                        const tipeInfo = formatTipeLabel(b.tipe_soal);
                                        const isChecked = selectedBankIds.includes(b.id);
                                        // FIX 2026-08-20: soal di Bank Soal itu wajar gak terikat exam manapun
                                        // (bisa dipakai ulang lintas UTS/UAS/Tugas) -- tapi begitu mau DI-IMPOR
                                        // ke exam INI, tetap perlu ditandai kalau Sub-CPMK-nya bukan bagian dari
                                        // komponen exam ini (sama kayak filter di form "Tulis Soal Manual" di
                                        // atas), soalnya kalau diimpor tetap gak akan ke-push breakdown-nya.
                                        const cocokKomponen = punyaBobotResmi(b.sub_cpmk?.external_id);
                                        return (
                                            <label key={b.id} className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isChecked ? 'border-[#0f4c3a] bg-[#0f4c3a]/5' : 'border-slate-100 hover:border-slate-200'}`}>
                                                <input type="checkbox" checked={isChecked} onChange={() => toggleBankSelection(b.id)} className="mt-1 w-4 h-4" />
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${tipeInfo.css}`}>{tipeInfo.label}</span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${b.sumber === 'AI_GENERATED' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                            {b.sumber === 'AI_GENERATED' ? 'AI Generated' : 'Manual'}
                                                        </span>
                                                        {b.sub_cpmk && (
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${cocokKomponen ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`} title={cocokKomponen ? undefined : `Sub-CPMK ini bukan bagian dari komponen "${exam?.nama_ujian}" -- kalau diimpor, nilainya TIDAK akan ikut ter-push ke SIAKAD`}>
                                                                {b.sub_cpmk.kode_sub_cpmk}{!cocokKomponen && ' ⚠'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[13px] font-semibold text-slate-800"><MathText text={b.isi_soal} /></p>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>

                            <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                                <span className="text-[12px] font-bold text-slate-500">{selectedBankIds.length} soal terpilih</span>
                                <button onClick={handleImportSelected} disabled={selectedBankIds.length === 0 || isImporting} className="px-8 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-lg shadow-[#0f4c3a]/30 transition-all active:scale-95 disabled:opacity-40">
                                    {isImporting ? 'Mengimpor...' : 'Impor Terpilih'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
