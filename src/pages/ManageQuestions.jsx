import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function ManageQuestions() {
    const [isLoading, setIsLoading] = useState(false);
    const [questionList, setQuestionList] = useState([]);
    
    // State Form
    const [editId, setEditId] = useState(null); 
    const [tipeSoal, setTipeSoal] = useState('pg');
    const [pertanyaan, setPertanyaan] = useState('');
    
    // State Khusus Kunci Jawaban
    const [opsi, setOpsi] = useState(['', '', '', '']);
    const [kunciJawabanPG, setKunciJawabanPG] = useState(0); // Index untuk PG (0,1,2,3)
    const [kunciEsai, setKunciEsai] = useState(''); // Teks untuk Rubrik Esai

    useEffect(() => { fetchQuestions(); }, []);

    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/questions', { headers: { Authorization: `Bearer ${token}` } });
            setQuestionList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data.", error); }
    };

    const handleSimpanSoal = async (e) => {
        e.preventDefault(); setIsLoading(true);
        try {
            // 🌟 1. LOGIKA TRANSLATOR (Menerjemahkan bahasa React ke bahasa Database)
            let dbTipeSoal = 'TIPE_1';
            if (tipeSoal === 'esai') dbTipeSoal = 'TIPE_3';
            if (tipeSoal === 'upload') dbTipeSoal = 'TIPE_4';

            // 🌟 2. LOGIKA KUNCI JAWABAN DINAMIS
            let dbKunciJawaban = null;
            if (tipeSoal === 'pg') dbKunciJawaban = opsi[kunciJawabanPG];
            if (tipeSoal === 'esai') dbKunciJawaban = kunciEsai;
            // Jika upload, biarkan null

            const payload = {
                exam_id: 5, 
                tipe_soal: dbTipeSoal, // Menggunakan TIPE_1 / TIPE_3 / TIPE_4 agar MySQL tidak marah
                isi_soal: pertanyaan,
                opsi_jawaban: tipeSoal === 'pg' ? JSON.stringify(opsi) : null,
                kunci_jawaban: dbKunciJawaban
            };

            const token = localStorage.getItem('token');
            
            if (editId) {
                await axios.put(`http://localhost:3000/api/questions/${editId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                alert("Perubahan soal berhasil disahkan!");
            } else {
                await axios.post('http://localhost:3000/api/questions', payload, { headers: { Authorization: `Bearer ${token}` } });
                alert("Soal baru berhasil ditambahkan!");
            }

            batalEdit();
            fetchQuestions(); 
        } catch (error) { 
            console.error(error);
            alert("Gagal menyimpan! Periksa koneksi atau console."); 
        } finally { setIsLoading(false); }
    };

    const handleHapusSoal = async (id) => {
        if (!window.confirm("Yakin ingin menghapus butir soal ini permanen?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:3000/api/questions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchQuestions();
        } catch (error) { alert("Gagal menghapus soal."); }
    };

    const handleMulaiEdit = (q) => {
        setEditId(q.id);
        
        // Terjemahkan balik dari Database ke React
        const formTipe = q.tipe_soal === 'TIPE_1' ? 'pg' : q.tipe_soal === 'TIPE_4' ? 'upload' : 'esai';
        setTipeSoal(formTipe);
        setPertanyaan(q.isi_soal);
        
        // Set Kunci Jawaban berdasarkan tipe
        if (formTipe === 'pg' && q.opsi_jawaban) {
            const parsedOpsi = JSON.parse(q.opsi_jawaban);
            setOpsi(parsedOpsi);
            setKunciJawabanPG(parsedOpsi.indexOf(q.kunci_jawaban));
        } else if (formTipe === 'esai') {
            setKunciEsai(q.kunci_jawaban || '');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    const batalEdit = () => {
        setEditId(null);
        setPertanyaan(''); setOpsi(['', '', '', '']); setKunciJawabanPG(0); setKunciEsai('');
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
                    <div className="flex gap-3">
                        <button onClick={() => setTipeSoal('pg')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'pg' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>Pilihan Ganda</button>
                        <button onClick={() => setTipeSoal('esai')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'esai' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>Soal Esai</button>
                        <button onClick={() => setTipeSoal('upload')} disabled={editId} className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${tipeSoal === 'upload' ? 'bg-[#0f4c3a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>Upload Berkas</button>
                    </div>
                    {editId && <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest bg-amber-100 border border-amber-200 px-4 py-1.5 rounded-md shadow-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Mode Edit Aktif</span>}
                </div>

                <form onSubmit={handleSimpanSoal} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Teks Pertanyaan / Instruksi
                        </label>
                        <textarea required rows="3" value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-4 focus:ring-[#0f4c3a]/10 focus:border-[#0f4c3a] outline-none font-semibold text-slate-800 text-[14px] transition-all shadow-inner placeholder-slate-300" placeholder="Ketikkan instruksi soal secara detail..."></textarea>
                    </div>

                    {/* KONDISI JIKA PILIHAN GANDA */}
                    {tipeSoal === 'pg' && (
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Opsi & Kunci Jawaban</label>
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
                                                q.tipe_soal === 'TIPE_4' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                                'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${q.tipe_soal === 'TIPE_1' ? 'bg-blue-500' : q.tipe_soal === 'TIPE_4' ? 'bg-amber-500' : 'bg-[#10b981]'}`}></span>
                                                {q.tipe_soal === 'TIPE_1' ? 'Pilgan' : q.tipe_soal === 'TIPE_4' ? 'Upload' : 'Esai'}
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