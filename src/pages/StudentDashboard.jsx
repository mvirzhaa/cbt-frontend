import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const nama = localStorage.getItem('nama') || 'Mahasiswa';
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/student/history');
                setHistory(res.data.data || []);
            } catch (error) { console.error("Gagal memuat riwayat"); }
        };
        fetchHistory();
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto mt-8 space-y-8">
            
            {/* KARTU SAMBUTAN */}
            <div className="bg-gradient-to-br from-[#0f4c3a] to-[#092e23] rounded-3xl p-10 text-white shadow-xl relative overflow-hidden border border-[#16654e]">
                <div className="relative z-10 md:w-2/3">
                    <span className="bg-[#d4af37]/20 text-[#d4af37] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Portal Akademik Mahasiswa</span>
                    <h2 className="text-3xl font-black mb-3">Ahlan wa Sahlan, {nama.split(' ')[0]}!</h2>
                    <p className="text-[#a7f3d0] font-medium mb-8 text-[13px] leading-relaxed">Persiapkan diri Anda dengan baik, pastikan koneksi internet stabil, dan junjung tinggi integritas kejujuran saat ujian.</p>
                    
                    <button onClick={() => navigate('/take-exam')} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f4c3a] font-black px-8 py-4 rounded-xl shadow-md transition-all uppercase tracking-widest text-sm flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        Masuk Ruang Ujian
                    </button>
                </div>
            </div>

            {/* TABEL HASIL / TRANSKRIP NILAI */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <svg className="w-6 h-6 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest">Riwayat & Hasil Ujian Anda</h3>
                </div>
                
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white border-b border-slate-100">
                            <th className="py-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Ujian & Matkul</th>
                            <th className="py-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status Koreksi</th>
                            <th className="py-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Nilai Akhir (Akumulasi)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {history.length === 0 ? (
                            <tr><td colSpan="3" className="py-10 text-center font-bold text-slate-400 text-sm">Belum ada riwayat ujian yang diselesaikan.</td></tr>
                        ) : (
                            history.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="py-5 px-6">
                                        <p className="font-bold text-[14px] text-slate-800">{item.exam_nama}</p>
                                        <p className="text-[11px] font-bold text-[#0f4c3a] uppercase">{item.matkul}</p>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Selesai Dinilai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <span className={`text-[24px] font-black ${item.status === 'Selesai Dinilai' ? 'text-[#0f4c3a]' : 'text-slate-300'}`}>
                                            {item.status === 'Selesai Dinilai' ? Math.round(item.total_skor) : '??'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </motion.div>
    );
}