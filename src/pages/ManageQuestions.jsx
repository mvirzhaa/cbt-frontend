import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import examService from '../services/exam.service';
import questionService from '../services/question.service';

export default function ManageQuestions() {
    const [isLoading, setIsLoading] = useState(false);
    const [questionList, setQuestionList] = useState([]);
    
    // 🌟 STATE BARU UNTUK DROPDOWN UJIAN
    const [examList, setExamList] = useState([]); 
    const [selectedExamId, setSelectedExamId] = useState(''); 
    
    // State Form
    const [editId, setEditId] = useState(null);
    const [tipeSoal, setTipeSoal] = useState('pg');
    const [pertanyaan, setPertanyaan] = useState('');

    // State Khusus Kunci Jawaban
    const [opsi, setOpsi] = useState(['', '', '', '', '']);
    const [kunciJawabanPG, setKunciJawabanPG] = useState(0); // Index untuk PG Single (0,1,2,3,4)
    const [kunciJawabanMultiple, setKunciJawabanMultiple] = useState([]); // Array index untuk Multiple Choice
    const [kunciEsai, setKunciEsai] = useState(''); // Teks untuk Rubrik Esai

    useEffect(() => { 
        fetchExams(); // Panggil data ujian saat pertama kali load
        fetchQuestions(); 
    }, []);

    // 🌟 FUNGSI BARU: MENARIK DAFTAR UJIAN
    const fetchExams = async () => {
        try {
            const data = await examService.getExams();
            setExamList(data || []);
        } catch (error) { 
            console.error("Gagal menarik data ujian.", error); 
        }
    };

    const fetchQuestions = async () => {
        try {
            const data = await questionService.getQuestions();
            setQuestionList(data || []);
        } catch (error) { 
            console.error("Gagal menarik data.", error); 
        }
    };

    const handleSimpanSoal = async (e) => {
        e.preventDefault(); 
        
        // 🌟 VALIDASI: Wajib pilih ujian sebelum simpan
        if (!selectedExamId) return Swal.fire({
            icon: 'warning',
            title: 'Pilih Ujian Terlebih Dahulu!',
            text: 'Soal harus ditautkan ke sesi ujian yang sudah dibuat.',
            confirmButtonColor: '#0f4c3a'
        });

        setIsLoading(true);
        try {
            // 🌟 1. LOGIKA TRANSLATOR (Menerjemahkan bahasa React ke bahasa Database)
            let dbTipeSoal = 'TIPE_1';
            if (tipeSoal === 'pg_multiple') dbTipeSoal = 'TIPE_2';
            if (tipeSoal === 'esai') dbTipeSoal = 'TIPE_3';
            if (tipeSoal === 'upload') dbTipeSoal = 'TIPE_4';

            // 🌟 2. LOGIKA KUNCI JAWABAN DINAMIS
            let dbKunciJawaban = null;
            if (tipeSoal === 'pg') {
                // Single choice: simpan huruf kunci, misal "Teks jawaban A"
                dbKunciJawaban = ['A', 'B', 'C', 'D', 'E'][kunciJawabanPG];
            } else if (tipeSoal === 'pg_multiple') {
                // Multiple choice: simpan sebagai string "A,C" (sesuai format backend TIPE_2)
                const selectedKeys = kunciJawabanMultiple?.map(idx => ['A', 'B', 'C', 'D', 'E'][idx]);
                dbKunciJawaban = selectedKeys.join(',');
            } else if (tipeSoal === 'esai') {
                dbKunciJawaban = kunciEsai;
            }

            const payload = {
                exam_id: parseInt(selectedExamId),
                tipe_soal: dbTipeSoal,
                isi_soal: pertanyaan,
                opsi_jawaban: (tipeSoal === 'pg' || tipeSoal === 'pg_multiple')
                    ? [opsi[0], opsi[1], opsi[2], opsi[3], opsi[4]]
                    : null,
                kunci_jawaban: dbKunciJawaban
            };

            if (editId) {
                await questionService.updateQuestion(editId, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Soal Tersimpan!',
                    text: 'Perubahan soal telah disimpan.',
                    confirmButtonColor: '#0f4c3a',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                await questionService.createQuestion(payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Soal Tersimpan!',
                    text: 'Soal baru telah masuk ke dalam Bank Soal.',
                    confirmButtonColor: '#0f4c3a',
                    timer: 2000,
                    showConfirmButton: false
                });
            }

            batalEdit();
            fetchQuestions(); 
        } catch (error) { 
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan!',
                text: 'Terjadi kesalahan saat menyimpan soal. Pastikan Backend sudah diperbarui!',
                confirmButtonColor: '#0f4c3a'
            }); 
        } finally { 
            setIsLoading(false); 
        }
    };

    const handleHapusSoal = async (id) => {
        // 🌟 DIALOG KONFIRMASI HAPUS (Warna Merah)
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
                
                // 🌟 NOTIFIKASI TERHAPUS
                Swal.fire({
                    icon: 'success',
                    title: 'Terhapus!',
                    text: 'Soal berhasil dihapus dari Bank Soal.',
                    confirmButtonColor: '#0f4c3a',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire('Gagal!', 'Terjadi kesalahan saat menghapus soal.', 'error');
            }
        }
    };

    const handleMulaiEdit = (q) => {
        setEditId(q.id);

        // 🌟 Set ulang dropdown ujian sesuai dengan soal yang diedit
        setSelectedExamId(q.exam_id ? q.exam_id.toString() : '');

        // Terjemahkan balik dari Database ke React
        let formTipe = 'pg';
        if (q.tipe_soal === 'TIPE_1') formTipe = 'pg';
        else if (q.tipe_soal === 'TIPE_2') formTipe = 'pg_multiple';
        else if (q.tipe_soal === 'TIPE_3') formTipe = 'esai';
        else if (q.tipe_soal === 'TIPE_4') formTipe = 'upload';

        setTipeSoal(formTipe);
        setPertanyaan(q.isi_soal);

        // Set Kunci Jawaban berdasarkan tipe
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
                    // Single choice
                    const keys = ['A', 'B', 'C', 'D', 'E'];
                    const kunciIdx = keys.indexOf(q.kunci_jawaban);
                    setKunciJawabanPG(kunciIdx >= 0 ? kunciIdx : 0);
                    setKunciJawabanMultiple([]);
                } else if (formTipe === 'pg_multiple') {
                    // Multiple choice
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
        } else if (formTipe === 'esai') {
            setKunciEsai(q.kunci_jawaban || '');
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const batalEdit = () => {
        setEditId(null);
        setSelectedExamId(''); // Reset Dropdown
        setPertanyaan('');
        setOpsi(['', '', '', '', '']);
        setKunciJawabanPG(0);
        setKunciJawabanMultiple([]);
        setKunciEsai('');
    };

    // Handler untuk toggle multiple choice
    const toggleMultipleChoice = (index) => {
        setKunciJawabanMultiple(prev => {
            if (prev.includes(index)) {
                // Remove if already selected
                return prev.filter(i => i !== index);
            } else {
                // Add if not selected
                return [...prev, index].sort();
            }
        });
    };

    const handleOpsiChange = (index, value) => {
        const newOpsi = [...opsi];
        newOpsi[index] = value;
        setOpsi(newOpsi);
    };

    // helper labels
    const formatTipeLabel = (tipe) => {
        if (tipe === 'TIPE_1') return { label: 'Pilihan Ganda', css: 'bg-blue-50 text-blue-700 border-blue-200' };
        if (tipe === 'TIPE_2') return { label: 'Multi Pilihan', css: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        if (tipe === 'TIPE_3') return { label: 'Esai Bebas', css: 'bg-purple-50 text-purple-700 border-purple-200' };
        return { label: 'Upload Berkas', css: 'bg-amber-50 text-amber-700 border-amber-200' };
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-12">
            
            {/* Header */}
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Kelola Bank Soal</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">Buat, modifikasi, dan tautkan butir-butir pertanyaan ke dalam sesi ujian yang sesuai.</p>
            </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">A. Tautkan Ke Ujian</label>
                            <select required value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]">
                                <option value="" disabled>-- Pilih Sesi Ujian --</option>
                                {examList?.data?.map((exam) => (
                                    <option key={exam.id} value={exam.id}>{exam.nama_ujian} ({exam.kode_mk})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">B. Jenis Pertanyaan</label>
                            <div className="grid grid-cols-4 gap-2">
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
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">C. Teks Pertanyaan</label>
                        <textarea required value={pertanyaan} onChange={e => setPertanyaan(e.target.value)} rows="4" placeholder="Tuliskan isi pertanyaan soal di sini..." className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium text-slate-800 text-[14px] resize-none" />
                    </div>

                    {/* INTERFACE OPSI UNTUK PILIHAN GANDA */}
                    {(tipeSoal === 'pg' || tipeSoal === 'pg_multiple') && (
                        <div className="p-6 md:p-8 rounded-2xl border-2 border-slate-100 bg-slate-50/30 space-y-5">
                            <h4 className="text-[12px] font-black text-slate-600 uppercase tracking-widest">D. Opsi & Kunci Jawaban</h4>
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

                    {/* INTERFACE KUNCI UNTUK ESAI */}
                    {tipeSoal === 'esai' && (
                        <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50/30">
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">D. Rubrik Kunci Jawaban Esai (Acuan Koreksi AI)</label>
                            <textarea value={kunciEsai} onChange={e => setKunciEsai(e.target.value)} rows="3" placeholder="Tulis poin-poin penting atau jawaban ideal yang diharapkan dari esai ini..." className="w-full px-5 py-4 bg-white rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-slate-800 text-[13px] resize-none" />
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={isLoading} className={`px-10 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg transition-all w-full md:w-auto ${editId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-[#0f4c3a]/30'}`}>
                            {isLoading ? 'Menyimpan...' : editId ? 'Simpan Edit Soal' : 'Masukkan ke Bank Soal'}
                        </button>
                    </div>
                </form>
            </div>

            {/* DAFTAR BANK SOAL YANG ADA */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Arsip Bank Soal</h3>
                    <span className="bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm">Total: {questionList.length} Butir</span>
                </div>
                
                <div className="p-8 space-y-6">
                    {questionList.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 font-bold text-[14px]">Belum ada soal terdaftar.</div>
                    ) : (
                        questionList?.map((q, idx) => {
                            const tipeInfo = formatTipeLabel(q.tipe_soal);
                            let formattedOpsi = null;
                            if (q.opsi_jawaban) {
                                try {
                                    formattedOpsi = typeof q.opsi_jawaban === 'string' ? JSON.parse(q.opsi_jawaban) : q.opsi_jawaban;
                                } catch(e) {
                                    // ignore JSON parse error
                                }
                            }

                            return (
                                <div key={q.id} className="p-6 border border-slate-100 rounded-2xl bg-slate-50/50 hover:shadow-md transition-all relative group flex flex-col md:flex-row gap-6 justify-between items-start">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="text-xs font-mono font-black text-slate-400">#{(idx+1).toString().padStart(3, '0')}</span>
                                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${tipeInfo.css}`}>
                                                {tipeInfo.label}
                                            </span>
                                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                Ujian ID: {q.exam_id} • {q.exams?.nama_ujian || 'Ujian'}
                                            </span>
                                        </div>
                                        
                                        <p className="font-bold text-slate-800 text-[15px] leading-relaxed">{q.isi_soal}</p>
                                        
                                        {/* Tampilan Detail Opsi jika PG */}
                                        {formattedOpsi && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                                                {Object.keys(formattedOpsi)?.map((key) => {
                                                    const isKunci = q.kunci_jawaban === key || (q.kunci_jawaban && q.kunci_jawaban.split(',').includes(key));
                                                    return (
                                                        <div key={key} className={`flex items-center gap-2.5 text-xs font-semibold py-1 px-3 rounded-lg ${isKunci ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'text-slate-500 bg-white border border-slate-100'}`}>
                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${isKunci ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{key}</span>
                                                            <span className="truncate">{formattedOpsi[key]}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Tampilan Kunci untuk esai */}
                                        {q.tipe_soal === 'TIPE_3' && q.kunci_jawaban && (
                                            <div className="pl-4 border-l-2 border-purple-300 text-xs text-purple-700 italic font-medium">
                                                Rubrik Kunci: {q.kunci_jawaban}
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

        </motion.div>
    );
}