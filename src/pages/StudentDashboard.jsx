import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalUjian: 0, rataRata: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const userName = localStorage.getItem('nama') || 'Mahasiswa';

    useEffect(() => {
        const fetchRiwayat = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/student/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const dataRiwayat = res.data.data || [];
                setHistory(dataRiwayat);

                // 🧠 Kalkulasi Cerdas untuk Statistik
                const total = dataRiwayat.length;
                // Hanya hitung rata-rata dari ujian yang sudah "Selesai Dinilai"
                const ujianSelesai = dataRiwayat.filter(h => h.status === 'Selesai Dinilai');
                const sumNilai = ujianSelesai.reduce((acc, curr) => acc + parseFloat(curr.total_skor), 0);
                const rataRata = ujianSelesai.length > 0 ? (sumNilai / ujianSelesai.length).toFixed(1) : 0;

                setStats({ totalUjian: total, rataRata: rataRata });
            } catch (error) {
                console.error("Gagal menarik riwayat:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRiwayat();
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
            
            {/* 🌟 HEADER & SAMBUTAN */}
            <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Beranda Akademik</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-1">Pantau perkembangan akademik dan kelola jadwal ujian Anda di sini.</p>
            </div>

            {/* 🌟 KARTU UTAMA (HERO & STATISTIK) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Kartu Hero (Akses Cepat Ujian) */}
                <div className="lg:col-span-2 bg-gradient-to-br from-[#0f4c3a] to-[#16654e] rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden flex flex-col justify-center border border-[#1f7a63]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <svg className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5 pointer-events-none transform -rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                    
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-black uppercase tracking-widest rounded-lg mb-4 backdrop-blur-sm">
                            Sesi Akademik Berjalan
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
                            Selamat Datang,<br/> <span className="text-[#d4af37]">{userName}</span>
                        </h2>
                        <p className="text-emerald-100/80 text-[14px] font-medium max-w-md leading-relaxed mb-8">
                            Siapkan Token Ujian Anda. Pastikan koneksi internet stabil sebelum memasuki Ruang Ujian Terpadu CBT.
                        </p>
                        
                        <button onClick={() => navigate('/take-exam')} className="bg-[#d4af37] hover:bg-[#b5952f] text-[#0f4c3a] px-8 py-3.5 rounded-xl font-black text-[13px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 flex items-center gap-2 w-full sm:w-auto justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                            Masuk Ruang Ujian
                        </button>
                    </div>
                </div>

                {/* Kartu Statistik */}
                <div className="space-y-6 flex flex-col">
                    <div className="flex-1 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-blue-300 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ujian Diikuti</p>
                            <h4 className="text-4xl font-black text-slate-800 tracking-tight">{stats.totalUjian} <span className="text-sm font-bold text-slate-400 ml-1">Sesi</span></h4>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-emerald-300 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-inner"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Indeks Rata-rata Nilai</p>
                            <h4 className="text-4xl font-black text-slate-800 tracking-tight">{stats.rataRata} <span className="text-sm font-bold text-slate-400 ml-1">/ 100</span></h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🌟 TABEL RIWAYAT TRANSKRIP NILAI */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Riwayat & Transkrip Ujian</h3>
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm">Data Resmi</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Mata Kuliah & Sesi Ujian</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status Evaluasi</th>
                                <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Skor Akhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan="3" className="py-16 text-center text-slate-400 font-bold">Memuat riwayat transkrip...</td></tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="py-16 text-center">
                                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
                                        <p className="text-slate-500 font-bold text-[14px]">Belum ada riwayat ujian.</p>
                                        <p className="text-slate-400 text-[12px] mt-1">Ujian yang telah diselesaikan akan muncul di sini.</p>
                                    </td>
                                </tr>
                            ) : (
                                history.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="font-black text-slate-800 text-[14px] group-hover:text-[#0f4c3a] transition-colors">{item.matkul}</div>
                                            <div className="text-[12px] font-semibold text-slate-500 mt-1">{item.exam_nama}</div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            {item.status === 'Selesai Dinilai' ? (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    {item.status}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {item.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            {item.status === 'Selesai Dinilai' ? (
                                                <span className="text-2xl font-black text-[#0f4c3a] tracking-tight">
                                                    {Math.round(item.total_skor)}
                                                </span>
                                            ) : (
                                                <span className="text-sm font-black text-slate-300 italic">...</span>
                                            )}
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