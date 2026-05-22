import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';

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
    const [opsi, setOpsi] = useState(['', '', '', '']);
    const [kunciJawabanPG, setKunciJawabanPG] = useState(0); // Index untuk PG Single (0,1,2,3)
    const [kunciJawabanMultiple, setKunciJawabanMultiple] = useState([]); // Array index untuk Multiple Choice
    const [kunciEsai, setKunciEsai] = useState(''); // Teks untuk Rubrik Esai

    useEffect(() => { 
        fetchExams(); // Panggil data ujian saat pertama kali load
        fetchQuestions(); 
    }, []);

    // 🌟 FUNGSI BARU: MENARIK DAFTAR UJIAN
    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/exams', { headers: { Authorization: `Bearer ${token}` } });
            setExamList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data ujian.", error); }
    };

    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/questions', { headers: { Authorization: `Bearer ${token}` } });
            setQuestionList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data.", error); }
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
                dbKunciJawaban = ['A', 'B', 'C', 'D'][kunciJawabanPG];
            } else if (tipeSoal === 'pg_multiple') {
                // Multiple choice: simpan sebagai string "A,C" (sesuai format backend TIPE_2)
                const selectedKeys = kunciJawabanMultiple.map(idx => ['A', 'B', 'C', 'D'][idx]);
                dbKunciJawaban = selectedKeys.join(',');
            } else if (tipeSoal === 'esai') {
                dbKunciJawaban = kunciEsai;
            }
            // Jika upload, biarkan null

            const payload = {
                exam_id: parseInt(selectedExamId),
                tipe_soal: dbTipeSoal,
                isi_soal: pertanyaan,
                // ✅ FIX: Kirim sebagai array biasa, BUKAN JSON.stringify (Axios sudah handle serialization)
                // JSON.stringify di dalam payload menyebabkan double-encoding → SyntaxError di server
                opsi_jawaban: (tipeSoal === 'pg' || tipeSoal === 'pg_multiple')
                    ? [opsi[0], opsi[1], opsi[2], opsi[3]]
                    : null,
                kunci_jawaban: dbKunciJawaban
            };

            const token = localStorage.getItem('token');
            
            if (editId) {
                await axios.put(`/api/questions/${editId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                // Setelah axios.post berhasil...
            Swal.fire({
                icon: 'success',
                title: 'Soal Tersimpan!',
                text: 'Perubahan soal telah disimpan.',
                confirmButtonColor: '#0f4c3a',
                timer: 2000,
                showConfirmButton: false
            });
            } else {
                await axios.post('/api/questions', payload, { headers: { Authorization: `Bearer ${token}` } });
                // Setelah axios.post berhasil...
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
        } finally { setIsLoading(false); }
    };

    const handleHapusSoal = async (id) => {
        // 🌟 DIALOG KONFIRMASI HAPUS (Warna Merah)
        const result = await Swal.fire({
            title: 'Hapus Soal Ini?',
            text: "Data soal yang dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', // Merah bahaya
            cancelButtonColor: '#64748b', // Abu-abu
            confirmButtonText: 'Ya, Hapus Permanen!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`/api/questions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
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
                const parsedOpsi = JSON.parse(q.opsi_jawaban);
                // Convert object {A: "text", B: "text"} to array ["text", "text"]
                const opsiArray = [
                    parsedOpsi.A || parsedOpsi[0] || '',
                    parsedOpsi.B || parsedOpsi[1] || '',
                    parsedOpsi.C || parsedOpsi[2] || '',
                    parsedOpsi.D || parsedOpsi[3] || ''
                ];
                setOpsi(opsiArray);

                if (formTipe === 'pg') {
                    // Single choice
                    const keys = ['A', 'B', 'C', 'D'];
                    const kunciIdx = keys.indexOf(q.kunci_jawaban);
                    setKunciJawabanPG(kunciIdx >= 0 ? kunciIdx : 0);
                    setKunciJawabanMultiple([]);
                } else if (formTipe === 'pg_multiple') {
                    // Multiple choice
                    const kunciArray = JSON.parse(q.kunci_jawaban || '[]');
                    const keys = ['A', 'B', 'C', 'D'];
                    const indices = kunciArray.map(k => keys.indexOf(k)).filter(idx => idx >= 0);
                    setKunciJawabanMultiple(indices);
                    setKunciJawabanPG(0);
                }
            } catch (error) {
                console.error('Error parsing opsi_jawaban:', error);
                setOpsi(['', '', '', '']);
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
        setOpsi(['', '', '', '']);
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

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
            
            <div className="mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Bank Soal</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Susun dan kelola instrumen pertanyaan untuk evaluasi akademik mahasiswa.</p>
            </div>

            <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 rounded-2xl overflow-hidden">
                <div className={`border-b border-slate-100 p-5 flex justify-between items-center ${editId ? 'bg-amber-50/50' : 'bg-slate-50/50'}`}>
                    <div className="flex gap-3 flex-wrap">
                        <button onClick={() => setTipeSoal('pg')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'pg' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>
                            PG Single Choice
                        </button>
                        <button onClick={() => setTipeSoal('pg_multiple')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'pg_multiple' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>
                            PG Multiple Choice
                        </button>
                        <button onClick={() => setTipeSoal('esai')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'esai' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>
                            Soal Esai
                        </button>
                        <button onClick={() => setTipeSoal('upload')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'upload' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>
                            Upload Berkas
                        </button>
                    </div>
                    {editId && <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest bg-amber-100 border border-amber-200 px-4 py-1.5 rounded-md shadow-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Mode Edit Aktif</span>}
                </div>

                <form onSubmit={handleSimpanSoal} className="p-8 space-y-6">
                    
                    {/* ========================================================= */}
                    {/* 🌟 FORM BARU: DROPDOWN TARGET SESI UJIAN */}
                    {/* ========================================================= */}
                    <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 mb-6">
                        <label className="block text-[11px] font-black text-[#0f4c3a] mb-2 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Target Sesi Ujian (Wajib Pilih)
                        </label>
                        <select required value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} disabled={editId} className="w-full px-5 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20 outline-none font-bold text-slate-800 text-[13px] shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                            <option value="" disabled>-- Klik untuk memilih Ujian --</option>
                            {examList.map(ex => (
                                <option key={ex.id} value={ex.id}>{ex.nama_ujian} | Token: {ex.token_ujian}</option>
                            ))}
                        </select>
                    </div>
                    {/* ========================================================= */}

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Teks Pertanyaan / Instruksi
                        </label>
                        <textarea required rows="3" value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-[#0f4c3a]/10 focus:border-[#0f4c3a] outline-none font-semibold text-slate-800 text-[14px] transition-all shadow-inner placeholder-slate-300" placeholder="Ketikkan instruksi soal secara detail..."></textarea>
                    </div>

                    {/* KONDISI JIKA PILIHAN GANDA SINGLE CHOICE */}
                    {tipeSoal === 'pg' && (
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Opsi & Kunci Jawaban (Pilih 1 Jawaban Benar)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {opsi.map((op, idx) => (
                                    <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all shadow-sm ${kunciJawabanPG === idx ? 'border-[#0f4c3a] bg-[#ecfdf5]' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <button type="button" onClick={() => setKunciJawabanPG(idx)} className={`w-9 h-9 rounded-lg flex-shrink-0 text-[12px] font-black transition-all ${kunciJawabanPG === idx ? 'bg-[#0f4c3a] text-[#d4af37] shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="Jadikan Kunci Jawaban">{['A', 'B', 'C', 'D'][idx]}</button>
                                        <input type="text" required value={op} onChange={(e) => handleOpsiChange(idx, e.target.value)} className="flex-1 w-full bg-transparent outline-none font-bold text-slate-800 text-[13px] placeholder-slate-300" placeholder={`Masukkan teks opsi ${['A', 'B', 'C', 'D'][idx]}...`} />
                                        {kunciJawabanPG === idx && <svg className="w-5 h-5 text-[#0f4c3a] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* KONDISI JIKA PILIHAN GANDA MULTIPLE CHOICE */}
                    {tipeSoal === 'pg_multiple' && (
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Opsi & Kunci Jawaban (Bisa Pilih Lebih dari 1 Jawaban Benar)</label>
                            <p className="text-[11px] text-blue-600 font-medium mb-3 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                💡 Klik tombol A/B/C/D untuk menandai jawaban yang benar. Anda bisa memilih lebih dari satu jawaban.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {opsi.map((op, idx) => {
                                    const isSelected = kunciJawabanMultiple.includes(idx);
                                    return (
                                        <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all shadow-sm ${isSelected ? 'border-[#0f4c3a] bg-[#ecfdf5]' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                            <button type="button" onClick={() => toggleMultipleChoice(idx)} className={`w-9 h-9 rounded-lg flex-shrink-0 text-[12px] font-black transition-all ${isSelected ? 'bg-[#0f4c3a] text-[#d4af37] shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="Toggle Kunci Jawaban">{['A', 'B', 'C', 'D'][idx]}</button>
                                            <input type="text" required value={op} onChange={(e) => handleOpsiChange(idx, e.target.value)} className="flex-1 w-full bg-transparent outline-none font-bold text-slate-800 text-[13px] placeholder-slate-300" placeholder={`Masukkan teks opsi ${['A', 'B', 'C', 'D'][idx]}...`} />
                                            {isSelected && <svg className="w-5 h-5 text-[#0f4c3a] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                    );
                                })}
                            </div>
                            {kunciJawabanMultiple.length > 0 && (
                                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
                                        Jawaban Benar: {kunciJawabanMultiple.map(idx => ['A', 'B', 'C', 'D'][idx]).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🌟 KONDISI JIKA SOAL ESAI (Kotak Rubrik Penilaian) */}
                    {tipeSoal === 'esai' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                            <label className="block text-[11px] font-black text-[#d4af37] mb-2 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Rubrik / Kunci Jawaban Esai
                            </label>
                            <textarea required rows="2" value={kunciEsai} onChange={(e) => setKunciEsai(e.target.value)} className="w-full px-5 py-4 bg-[#f8fafc] rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-[#d4af37]/20 focus:border-[#d4af37] outline-none font-semibold text-slate-800 text-[14px] transition-all shadow-inner placeholder-slate-400" placeholder="Masukkan poin-poin utama yang harus ada di jawaban mahasiswa (sebagai acuan koreksi)..."></textarea>
                        </motion.div>
                    )}

                    <div className="pt-4 flex gap-4">
                        <button type="submit" disabled={isLoading} className="flex-1 py-4 rounded-xl text-[13px] font-black text-[#0f4c3a] bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] shadow-[0_4px_15px_rgba(251,191,36,0.3)] hover:shadow-[0_8px_25px_rgba(251,191,36,0.5)] transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                            {isLoading ? 'Menyimpan...' : (editId ? 'Sahkan Perubahan' : '+ Tambah ke Bank Soal')}
                        </button>
                        {editId && (
                            <button type="button" onClick={batalEdit} className="px-8 py-4 rounded-xl text-[13px] font-black text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all uppercase tracking-widest">Batal Edit</button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden mt-10 relative">
                <div className="px-8 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#0f4c3a]/10 rounded-lg">
                            <svg className="w-5 h-5 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h3 className="text-[16px] font-black text-slate-800 tracking-tight">Etalase Instrumen Tersimpan</h3>
                    </div>
                    <span className="flex items-center gap-2 bg-[#0f4c3a] text-[#d4af37] text-[11px] px-4 py-2 rounded-lg font-black uppercase tracking-widest shadow-md border border-[#16654e]">
                        Total Data: <span className="bg-white/20 px-2 py-0.5 rounded text-white">{questionList.length}</span>
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80">
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest w-16">No</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest w-36">Tipe Format</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Redaksi Pertanyaan</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right w-48">Manajemen Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {questionList.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-16 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4 border-4 border-white shadow-sm">
                                            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                        </div>
                                        <p className="text-slate-400 text-sm font-bold">Bank soal masih kosong.</p>
                                    </td>
                                </tr>
                            ) : (
                                questionList.map((q, idx) => (
                                    <tr key={q.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="py-5 px-8 text-[14px] font-black text-slate-400">{idx + 1}</td>
                                        <td className="py-5 px-8">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                                q.tipe_soal === 'TIPE_1' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                q.tipe_soal === 'TIPE_2' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                q.tipe_soal === 'TIPE_4' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    q.tipe_soal === 'TIPE_1' ? 'bg-blue-500' :
                                                    q.tipe_soal === 'TIPE_2' ? 'bg-purple-500' :
                                                    q.tipe_soal === 'TIPE_4' ? 'bg-amber-500' :
                                                    'bg-[#10b981]'
                                                }`}></span>
                                                {q.tipe_soal === 'TIPE_1' ? 'PG Single' :
                                                 q.tipe_soal === 'TIPE_2' ? 'PG Multiple' :
                                                 q.tipe_soal === 'TIPE_4' ? 'Upload' :
                                                 'Esai'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8">
                                            <p className="text-[14px] font-semibold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-[#0f4c3a] transition-colors">{q.isi_soal}</p>
                                        </td>
                                        <td className="py-5 px-8 text-right space-x-2">
                                            <button onClick={() => handleMulaiEdit(q)} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-blue-600 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-lg shadow-sm transition-all uppercase tracking-wider">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                Edit
                                            </button>
                                            <button onClick={() => handleHapusSoal(q.id)} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg shadow-sm transition-all uppercase tracking-wider">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Hapus
                                            </button>
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