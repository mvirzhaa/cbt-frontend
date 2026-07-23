import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import cpmkService from '../services/cpmk.service';
import questionBankService from '../services/questionBank.service';
import { useAuth } from '../hooks/useAuth';
import { getUserIdFromToken } from '../utils/auth.utils';
import MathText from '../components/MathText';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

const TIPE_OPTIONS = [
    { id: 'pg', db: 'TIPE_1', label: 'Pilihan Ganda' },
    { id: 'pg_multiple', db: 'TIPE_2', label: 'Multi Pilihan' },
    { id: 'esai', db: 'TIPE_3', label: 'Esai Bebas' },
    { id: 'upload', db: 'TIPE_4', label: 'Upload File' }
];

const dbTipeToLocal = (dbTipe) => TIPE_OPTIONS.find(t => t.db === dbTipe)?.id || 'pg';
const localTipeToDb = (localTipe) => TIPE_OPTIONS.find(t => t.id === localTipe)?.db || 'TIPE_1';

const formatTipeLabel = (tipe) => {
    if (tipe === 'TIPE_1') return { label: 'Pilihan Ganda', css: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (tipe === 'TIPE_2') return { label: 'Multi Pilihan', css: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (tipe === 'TIPE_3') return { label: 'Esai Bebas', css: 'bg-purple-50 text-purple-700 border-purple-200' };
    return { label: 'Upload Berkas', css: 'bg-amber-50 text-amber-700 border-amber-200' };
};

export default function ManageQuestions() {
    const { token } = useAuth();
    const currentUserId = getUserIdFromToken(token);

    const [isLoading, setIsLoading] = useState(false);
    const [matkulList, setMatkulList] = useState([]);
    const [selectedKodeMk, setSelectedKodeMk] = useState('');
    const [cpmkList, setCpmkList] = useState([]);
    const [bankList, setBankList] = useState([]);

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

    // State Panel Generate AI
    const [aiTipeSoal, setAiTipeSoal] = useState('pg');
    const [aiSubCpmkId, setAiSubCpmkId] = useState('');
    const [aiJumlah, setAiJumlah] = useState(3);
    const [aiTingkatKesulitan, setAiTingkatKesulitan] = useState('sedang');
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchMatkul = async () => {
        try {
            const data = await matkulService.getMatkul();
            setMatkulList(data || []);
        } catch (error) {
            console.error("Gagal menarik data matkul", error);
        }
    };

    const fetchCpmk = async () => {
        try {
            const data = await cpmkService.getCpmk({ kode_mk: selectedKodeMk });
            setCpmkList(data?.data || []);
        } catch (error) {
            console.error("Gagal menarik data CPMK", error);
        }
    };

    const fetchBankSoal = async () => {
        try {
            const data = await questionBankService.getBankSoal({ kode_mk: selectedKodeMk });
            setBankList(data?.data || []);
        } catch (error) {
            console.error("Gagal menarik bank soal", error);
        }
    };

    useEffect(() => { fetchMatkul(); }, []);

    useEffect(() => {
        if (selectedKodeMk) {
            fetchCpmk();
            fetchBankSoal();
        } else {
            setCpmkList([]);
            setBankList([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKodeMk]);

    const handleSimpanSoal = async (e) => {
        e.preventDefault();

        if (!selectedKodeMk) return Swal.fire({
            icon: 'warning',
            title: 'Pilih Mata Kuliah Terlebih Dahulu!',
            text: 'Bank soal harus terhubung ke mata kuliah.',
            confirmButtonColor: '#0f4c3a'
        });

        setIsLoading(true);
        try {
            const dbTipeSoal = localTipeToDb(tipeSoal);

            let dbKunciJawaban = null;
            if (tipeSoal === 'pg') {
                dbKunciJawaban = OPTION_LABELS[kunciJawabanPG];
            } else if (tipeSoal === 'pg_multiple') {
                dbKunciJawaban = kunciJawabanMultiple?.map(idx => OPTION_LABELS[idx]).join(',');
            } else if (tipeSoal === 'esai' || tipeSoal === 'upload') {
                dbKunciJawaban = kunciEsai;
            }

            const payload = {
                kode_mk: selectedKodeMk,
                tipe_soal: dbTipeSoal,
                isi_soal: pertanyaan,
                opsi_jawaban: (tipeSoal === 'pg' || tipeSoal === 'pg_multiple')
                    ? [opsi[0], opsi[1], opsi[2], opsi[3], opsi[4]]
                    : null,
                kunci_jawaban: dbKunciJawaban,
                sub_cpmk_id: subCpmkId ? parseInt(subCpmkId) : null,
                bobot_nilai: parseFloat(bobotNilai) || 0
            };

            if (editId) {
                await questionBankService.updateBankSoal(editId, payload);
            } else {
                await questionBankService.createBankSoal(payload);
            }

            Swal.fire({ icon: 'success', title: 'Soal Tersimpan!', text: 'Soal masuk ke Bank Soal dan siap dipakai ulang.', confirmButtonColor: '#0f4c3a', timer: 2000, showConfirmButton: false });
            batalEdit();
            fetchBankSoal();
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Gagal Menyimpan!', text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan soal.', confirmButtonColor: '#0f4c3a' });
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
                await questionBankService.deleteBankSoal(id);
                fetchBankSoal();
                Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Soal berhasil dihapus dari Bank Soal.', confirmButtonColor: '#0f4c3a', timer: 1500, showConfirmButton: false });
            } catch (error) {
                Swal.fire('Gagal!', error.response?.data?.message || 'Terjadi kesalahan saat menghapus soal.', 'error');
            }
        }
    };

    const handleMulaiEdit = (b) => {
        setEditId(b.id);
        setTipeSoal(dbTipeToLocal(b.tipe_soal));
        setPertanyaan(b.isi_soal);
        setSubCpmkId(b.sub_cpmk_id ? String(b.sub_cpmk_id) : '');
        setBobotNilai(b.bobot_nilai ?? 10);

        if (b.tipe_soal === 'TIPE_1' || b.tipe_soal === 'TIPE_2') {
            const newOpsi = ['', '', '', '', ''];
            (b.options || []).forEach(opt => {
                const idx = OPTION_LABELS.indexOf(opt.label_pilihan);
                if (idx >= 0) newOpsi[idx] = opt.teks_pilihan;
            });
            setOpsi(newOpsi);

            if (b.tipe_soal === 'TIPE_1') {
                const idx = OPTION_LABELS.indexOf(b.kunci_jawaban);
                setKunciJawabanPG(idx >= 0 ? idx : 0);
                setKunciJawabanMultiple([]);
            } else {
                const kunciArray = (b.kunci_jawaban || '').split(',').map(k => k.trim());
                setKunciJawabanMultiple(kunciArray.map(k => OPTION_LABELS.indexOf(k)).filter(idx => idx >= 0));
                setKunciJawabanPG(0);
            }
        } else {
            setKunciEsai(b.kunci_jawaban || '');
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
        setKunciJawabanMultiple(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort());
    };

    const handleOpsiChange = (index, value) => {
        const newOpsi = [...opsi];
        newOpsi[index] = value;
        setOpsi(newOpsi);
    };

    const handleGenerateAI = async () => {
        if (!selectedKodeMk) return Swal.fire('Pilih Mata Kuliah', 'Pilih mata kuliah dulu sebelum generate soal AI.', 'warning');
        if (!aiJumlah || aiJumlah < 1 || aiJumlah > 10) return Swal.fire('Jumlah Tidak Valid', 'Jumlah soal harus antara 1-10.', 'warning');

        setIsGenerating(true);
        try {
            const payload = {
                kode_mk: selectedKodeMk,
                tipe_soal: localTipeToDb(aiTipeSoal),
                jumlah: parseInt(aiJumlah),
                tingkat_kesulitan: aiTingkatKesulitan
            };
            if (aiSubCpmkId) payload.sub_cpmk_id = parseInt(aiSubCpmkId);

            const result = await questionBankService.generateAI(payload);
            Swal.fire({ icon: 'success', title: 'Soal AI Digenerate!', text: result.message || 'Silakan review sebelum digunakan.', confirmButtonColor: '#0f4c3a' });
            fetchBankSoal();
        } catch (error) {
            Swal.fire('Gagal Generate', error.response?.data?.message || 'AI gagal menghasilkan soal. Coba lagi.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // flatten cpmk -> sub_cpmk untuk dropdown
    const subCpmkOptions = cpmkList.flatMap(c => (c.sub_cpmk || []).map(sc => ({ ...sc, cpmkLabel: c.kode_cpmk })));

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-12">

            {/* Header */}
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Kelola Bank Soal</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">Buat & simpan soal per mata kuliah, siap diimpor berkali-kali ke sesi ujian manapun. Pilih mata kuliah untuk mulai.</p>
            </div>

            {/* PEMILIH MATA KULIAH */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-100 p-6 md:p-8">
                <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Mata Kuliah Aktif</label>
                <select value={selectedKodeMk} onChange={e => { setSelectedKodeMk(e.target.value); batalEdit(); }} className="w-full md:w-1/2 px-5 py-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px] transition-all cursor-pointer appearance-none shadow-sm">
                    <option value="">-- Pilih Mata Kuliah --</option>
                    {matkulList?.data?.map((mk) => (
                        <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                    ))}
                </select>
            </div>

            {selectedKodeMk && (
                <>
                    {/* PANEL GENERATE DENGAN AI */}
                    <div className="bg-gradient-to-br from-violet-50 to-white rounded-3xl border-2 border-violet-100 p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-violet-100 text-violet-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-[13px] font-black text-violet-800 uppercase tracking-widest">Generate Soal dengan AI</h4>
                                <p className="text-[11px] font-medium text-slate-500 mt-1">Berpatokan pada CPMK/Sub-CPMK yang dipilih. Hasil AI wajib direview sebelum dipakai.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Sub-CPMK Acuan</label>
                                <select value={aiSubCpmkId} onChange={e => setAiSubCpmkId(e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-violet-500 outline-none font-semibold text-slate-800 text-[13px]">
                                    <option value="">-- Umum (tanpa Sub-CPMK) --</option>
                                    {subCpmkOptions.map(sc => (
                                        <option key={sc.id} value={sc.id}>{sc.cpmkLabel} • {sc.kode_sub_cpmk}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Tipe Soal</label>
                                <select value={aiTipeSoal} onChange={e => setAiTipeSoal(e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-violet-500 outline-none font-semibold text-slate-800 text-[13px]">
                                    {TIPE_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Jumlah (1-10)</label>
                                <input type="number" min="1" max="10" value={aiJumlah} onChange={e => setAiJumlah(e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-violet-500 outline-none font-semibold text-slate-800 text-[13px]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Tingkat Kesulitan</label>
                                <select value={aiTingkatKesulitan} onChange={e => setAiTingkatKesulitan(e.target.value)} className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:border-violet-500 outline-none font-semibold text-slate-800 text-[13px]">
                                    <option value="mudah">Mudah</option>
                                    <option value="sedang">Sedang</option>
                                    <option value="sulit">Sulit</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={handleGenerateAI} disabled={isGenerating} className="px-8 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30 transition-all active:scale-95 disabled:opacity-50">
                                {isGenerating ? 'Menggenerate... (bisa beberapa detik)' : '✨ Generate Soal'}
                            </button>
                        </div>
                    </div>

                    {/* FORM INPUT SOAL MANUAL */}
                    <div className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border relative overflow-hidden transition-colors duration-500 ${editId ? 'border-amber-300' : 'border-slate-100'}`}>
                        {editId && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}

                        <div className="px-8 md:px-10 py-6 border-b border-slate-100/50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                            <h3 className={`text-[15px] font-black uppercase tracking-widest ${editId ? 'text-amber-800' : 'text-[#0f4c3a]'}`}>
                                {editId ? 'Ubah Soal Bank' : 'Tulis Soal Manual Baru'}
                            </h3>
                            {editId && (
                                <button type="button" onClick={batalEdit} className="text-[11px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-lg">Batal Edit</button>
                            )}
                        </div>

                        <form onSubmit={handleSimpanSoal} className="p-8 md:p-10 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">A. Sub-CPMK (opsional)</label>
                                    <select value={subCpmkId} onChange={e => setSubCpmkId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]">
                                        <option value="">-- Tanpa Sub-CPMK --</option>
                                        {subCpmkOptions.map(sc => (
                                            <option key={sc.id} value={sc.id}>{sc.cpmkLabel} • {sc.kode_sub_cpmk}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">B. Jenis Pertanyaan</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {TIPE_OPTIONS.map(t => (
                                            <button key={t.id} type="button" onClick={() => setTipeSoal(t.id)} className={`py-3.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border-2 text-center transition-all ${tipeSoal === t.id ? 'bg-[#0f4c3a] border-[#0f4c3a] text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">C. Teks Pertanyaan</label>
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
                                <p className="text-[10px] text-slate-400 mt-1.5">Ikut disalin saat soal ini diimpor ke ujian. Kalau ujian tujuan bermode Per Soal, total bobot semua soal di ujian itu harus 100.</p>
                            </div>

                            {(tipeSoal === 'pg' || tipeSoal === 'pg_multiple') && (
                                <div className="p-6 md:p-8 rounded-2xl border-2 border-slate-100 bg-slate-50/30 space-y-5">
                                    <h4 className="text-[12px] font-black text-slate-600 uppercase tracking-widest">D. Opsi & Kunci Jawaban</h4>
                                    <div className="space-y-4">
                                        {OPTION_LABELS.map((label, idx) => (
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
                                        D. {tipeSoal === 'esai' ? 'Rubrik Kunci Jawaban Esai (Acuan Koreksi AI)' : 'Model / Kunci Jawaban Upload (Referensi Penilaian Dosen)'}
                                    </label>
                                    <textarea value={kunciEsai} onChange={e => setKunciEsai(e.target.value)} rows="3" placeholder={tipeSoal === 'esai' ? 'Tulis poin-poin penting atau jawaban ideal yang diharapkan dari esai ini...' : 'Tulis model jawaban atau rubrik penilaian yang menjadi acuan dosen saat menilai file yang diupload...'} className="w-full px-5 py-4 bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-slate-800 text-[13px] resize-none" />
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button type="submit" disabled={isLoading} className={`px-10 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg transition-all w-full md:w-auto ${editId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-[#0f4c3a]/30'}`}>
                                    {isLoading ? 'Menyimpan...' : editId ? 'Simpan Edit Soal' : 'Masukkan ke Bank Soal'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* DAFTAR BANK SOAL */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Arsip Bank Soal — {selectedKodeMk}</h3>
                            <span className="bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm">Total: {bankList.length} Butir</span>
                        </div>

                        <div className="p-8 space-y-6">
                            {bankList.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 font-bold text-[14px]">Belum ada soal terdaftar untuk mata kuliah ini.</div>
                            ) : (
                                bankList.map((b, idx) => {
                                    const tipeInfo = formatTipeLabel(b.tipe_soal);
                                    const isOwner = currentUserId && b.dibuat_oleh === currentUserId;

                                    return (
                                        <div key={b.id} className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 hover:shadow-md transition-all relative group flex flex-col md:flex-row gap-6 justify-between items-start">
                                            <div className="space-y-4 flex-1">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <span className="text-xs font-mono font-black text-slate-400">#{(idx + 1).toString().padStart(3, '0')}</span>
                                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${tipeInfo.css}`}>
                                                        {tipeInfo.label}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${b.sumber === 'AI_GENERATED' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        {b.sumber === 'AI_GENERATED' ? '✨ AI Generated' : 'Manual'}
                                                    </span>
                                                    <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border bg-slate-100 text-slate-600 border-slate-200">
                                                        Bobot: {b.bobot_nilai ?? 10}
                                                    </span>
                                                    {b.sub_cpmk && (
                                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                            {b.cpmk?.kode_cpmk} • {b.sub_cpmk.kode_sub_cpmk}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="font-bold text-slate-800 text-[15px] leading-relaxed"><MathText text={b.isi_soal} /></p>

                                                {(b.tipe_soal === 'TIPE_1' || b.tipe_soal === 'TIPE_2') && b.options?.length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                                                        {b.options.map((opt) => {
                                                            const isKunci = b.kunci_jawaban === opt.label_pilihan || (b.kunci_jawaban && b.kunci_jawaban.split(',').includes(opt.label_pilihan));
                                                            return (
                                                                <div key={opt.id} className={`flex items-center gap-2.5 text-xs font-semibold py-1 px-3 rounded-lg ${isKunci ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'text-slate-500 bg-white border border-slate-100'}`}>
                                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isKunci ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{opt.label_pilihan}</span>
                                                                    <span className="truncate"><MathText text={opt.teks_pilihan} /></span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {(b.tipe_soal === 'TIPE_3' || b.tipe_soal === 'TIPE_4') && b.kunci_jawaban && (
                                                    <div className={`pl-4 border-l-2 text-xs italic font-medium ${b.tipe_soal === 'TIPE_3' ? 'border-purple-300 text-purple-700' : 'border-amber-300 text-amber-700'}`}>
                                                        {b.tipe_soal === 'TIPE_3' ? 'Rubrik Kunci' : 'Model Jawaban'}: {b.kunci_jawaban}
                                                    </div>
                                                )}
                                            </div>

                                            {isOwner && (
                                                <div className="flex gap-2 shrink-0 self-end md:self-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button onClick={() => handleMulaiEdit(b)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors shadow-sm" title="Edit Soal">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleHapusSoal(b.id)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm" title="Hapus Soal">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </>
            )}

        </motion.div>
    );
}
