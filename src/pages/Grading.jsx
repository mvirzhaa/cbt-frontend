import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function Grading() {
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [answers, setAnswers] = useState([]);
    
    // Modal Koreksi
    const [activeAnswer, setActiveAnswer] = useState(null);
    const [skorManual, setSkorManual] = useState('');

    useEffect(() => { fetchExams(); }, []);

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/exams', { headers: { Authorization: `Bearer ${token}` } });
            setExams(res.data.data || []);
        } catch (error) { console.error("Gagal memuat daftar ujian"); }
    };

    const fetchAnswers = async (examId) => {
        if (!examId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:3000/api/grading/exams/${examId}/answers`, { headers: { Authorization: `Bearer ${token}` } });
            setAnswers(res.data.data || []);
        } catch (error) { console.error("Gagal memuat jawaban mahasiswa"); }
    };

    const handleSahkanNilai = async () => {
        if (!activeAnswer || !skorManual) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3000/api/grading/responses/${activeAnswer.id}/score`, { skor: skorManual }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Nilai berhasil disahkan!");
            setActiveAnswer(null); setSkorManual('');
            fetchAnswers(selectedExamId); // Refresh tabel
        } catch (error) { alert("Gagal menyimpan nilai!"); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 relative">
            
            <div className="mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Meja Penilaian & Koreksi</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Evaluasi jawaban esai dan berkas unggahan mahasiswa secara komprehensif.</p>
            </div>

            {/* FILTER UJIAN */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="flex-1">
                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Pilih Sesi Ujian Untuk Dikoreksi</label>
                    <select value={selectedExamId} onChange={(e) => { setSelectedExamId(e.target.value); fetchAnswers(e.target.value); }} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 outline-none font-bold text-slate-800 text-[13px] transition-all">
                        <option value="">-- Pilih Ujian --</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.nama_ujian}</option>)}
                    </select>
                </div>
                <button onClick={() => fetchAnswers(selectedExamId)} className="mt-6 px-6 py-3.5 rounded-xl text-[13px] font-black text-[#0f4c3a] bg-[#fbbf24] hover:bg-[#f59e0b] shadow-sm transition-all uppercase tracking-widest">Muat Data</button>
            </div>

            {/* TABEL JAWABAN (HANYA MUNCUL JIKA ADA UJIAN YANG DIPILIH) */}
            {selectedExamId && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Antrean Koreksi (Tipe Esai & Upload)</h3>
                        <span className="bg-amber-100 text-amber-700 text-[10px] px-3 py-1 rounded-md font-black uppercase tracking-widest">{answers.length} Menunggu Diperiksa</span>
                    </div>
                    
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Identitas Mahasiswa</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Pertanyaan / Soal</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Tipe</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {answers.length === 0 ? (
                                <tr><td colSpan="4" className="py-10 text-center text-slate-400 font-bold text-sm">Hore! Tidak ada tumpukan jawaban yang menunggu dikoreksi.</td></tr>
                            ) : (
                                answers.map((ans) => (
                                    <tr key={ans.id} className="hover:bg-slate-50">
                                        <td className="py-4 px-8 font-bold text-[14px] text-[#0f4c3a]">{ans.users?.nama || 'Anonim'}</td>
                                        <td className="py-4 px-8 text-[13px] font-medium text-slate-700 line-clamp-1">{ans.questions?.isi_soal}</td>
                                        <td className="py-4 px-8 text-center">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${ans.questions?.tipe_soal === 'TIPE_3' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                                {ans.questions?.tipe_soal === 'TIPE_3' ? 'Esai' : 'Upload'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-8 text-right">
                                            <button onClick={() => setActiveAnswer(ans)} className="px-5 py-2 text-[11px] font-black text-white bg-[#0f4c3a] hover:bg-[#092e23] rounded-lg shadow-sm uppercase tracking-wider">Periksa</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL / OVERLAY KOREKSI MANUAL */}
            {activeAnswer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="bg-[#0f4c3a] px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-black tracking-wide text-[15px]">Lembar Koreksi Jawaban</h3>
                            <button onClick={() => setActiveAnswer(null)} className="text-white/50 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Pertanyaan:</p>
                                <p className="text-[14px] font-bold text-slate-800 leading-relaxed">{activeAnswer.questions?.isi_soal}</p>
                            </div>

                            <div>
                                <p className="text-[11px] font-black text-[#0f4c3a] uppercase tracking-widest mb-2">Jawaban Mahasiswa ({activeAnswer.users?.nama}):</p>
                                {activeAnswer.questions?.tipe_soal === 'TIPE_4' ? (
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
                                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <a href={`http://localhost:3000/${activeAnswer.file_path}`} target="_blank" rel="noreferrer" className="inline-block bg-blue-50 text-blue-600 font-bold text-[13px] px-6 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">Unduh / Lihat Berkas Mahasiswa</a>
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-xl p-5 bg-white text-[14px] font-medium text-slate-700 min-h-[100px]">
                                        {activeAnswer.jawaban_teks || <span className="text-slate-400 italic">Mahasiswa tidak mengisi teks jawaban.</span>}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-100 pt-6 flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-[11px] font-black text-amber-600 mb-2 uppercase tracking-widest">Beri Nilai (Skala 0 - 100)</label>
                                    <input type="number" min="0" max="100" value={skorManual} onChange={(e) => setSkorManual(e.target.value)} className="w-full px-5 py-4 bg-amber-50 rounded-xl border-2 border-amber-200 focus:bg-white focus:border-amber-400 outline-none font-black text-slate-800 text-[18px]" placeholder="Misal: 85" />
                                </div>
                                <button onClick={handleSahkanNilai} className="px-8 py-4 bg-[#0f4c3a] hover:bg-[#092e23] text-white rounded-xl text-[14px] font-black uppercase tracking-widest shadow-md transition-all h-[64px]">Sahkan Nilai</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}