import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DashboardOverview() {
    const navigate = useNavigate();
    
    // 🌟 STATE UNTUK DATA REAL DARI DATABASE
    const [stats, setStats] = useState({ activeExams: 0, pendingGrading: 0, totalQuestions: 0 });
    const [recentExams, setRecentExams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Tarik Data Ujian milik Dosen ini
            const resExams = await axios.get('http://localhost:3000/api/exams', { headers });
            const examsData = resExams.data.data || [];

            // 2. Tarik Data Total Soal di Bank Soal
            const resQuestions = await axios.get('http://localhost:3000/api/questions', { headers });
            const questionsData = resQuestions.data.data || [];

            // 3. Hitung Total Berkas Esai yang Menunggu Penilaian
            // (Melakukan looping pintar ke semua ujian untuk mengecek antrean koreksi)
            const gradingPromises = examsData.map(exam => 
                axios.get(`http://localhost:3000/api/grading/exams/${exam.id}/answers`, { headers })
                     .then(res => res.data.data.length)
                     .catch(() => 0)
            );
            const gradingResults = await Promise.all(gradingPromises);
            const pendingCount = gradingResults.reduce((total, num) => total + num, 0);

            // Simpan semua perhitungan ke State
            setStats({
                activeExams: examsData.length,
                pendingGrading: pendingCount,
                totalQuestions: questionsData.length
            });

            // Ambil 5 ujian paling baru untuk ditampilkan di tabel
            setRecentExams(examsData.slice(0, 5));

        } catch (error) {
            console.error("Gagal menarik data dashboard:", error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Memuat Data',
                text: 'Koneksi ke server terputus.',
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 🌟 FUNGSI PENENTU STATUS UJIAN (Otomatis berdasarkan Jam Real-Time)
    const getStatusUjian = (waktuMulai, waktuSelesai) => {
        const now = new Date();
        const start = new Date(waktuMulai);
        const end = new Date(waktuSelesai);

        if (now < start) {
            return { label: 'Belum Mulai', color: 'bg-slate-100 text-slate-600 border-slate-200', pulse: false };
        } else if (now > end) {
            return { label: 'Telah Selesai', color: 'bg-red-50 text-red-600 border-red-200', pulse: false };
        } else {
            return { label: 'Berlangsung', color: 'bg-[#e6f4ea] text-[#0f4c3a] border-[#ceead6]', pulse: true };
        }
    };

    const formatJam = (dateString) => {
        return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64 font-bold text-slate-400">Memuat Ikhtisar Sistem...</div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
            
            {/* Header Seksi */}
            <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Ikhtisar Aktivitas</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1 leading-relaxed max-w-2xl">Ringkasan data akademik dan status ujian yang memerlukan perhatian Anda hari ini.</p>
            </div>

            {/* KARTU STATISTIK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* KARTU 1: HERO CARD (Ujian Aktif) */}
                <div className="bg-gradient-to-br from-[#0f4c3a] to-[#16654e] rounded-xl p-5 text-white shadow-md relative overflow-hidden group border border-[#1f7a63]">
                    <svg className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-1.05.174v-4.102l1.69.723a1 1 0 000 1.838l-7 3a1 1 0 00-.788 0l-7-3a1 1 0 000-1.838l1.69-.723z"/></svg>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[#6ee7b7] font-bold uppercase tracking-widest text-[10px] mb-2">Total Sesi Ujian</p>
                                <h4 className="text-3xl font-black tracking-tight">{stats.activeExams} <span className="text-lg font-bold text-[#a7f3d0] ml-1">Sesi</span></h4>
                            </div>
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 shadow-inner">
                                <svg className="w-5 h-5 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button onClick={() => navigate('/create-exam')} className="w-full py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f4c3a] font-black rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                Buat Jadwal Baru
                            </button>
                        </div>
                    </div>
                </div>

                {/* KARTU 2: (Antrean Koreksi) */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-400/50 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Menunggu Penilaian</p>
                            <h4 className="text-3xl font-black text-slate-800 tracking-tight">{stats.pendingGrading} <span className="text-lg font-bold text-slate-400 ml-1">Berkas</span></h4>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 group-hover:bg-amber-100 transition-colors">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <div className="mt-5 border-t border-slate-100 pt-3">
                        <button onClick={() => navigate('/grading')} className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1.5 transition-all uppercase tracking-wider">
                            Buka Ruang Koreksi <span className="text-sm">&rarr;</span>
                        </button>
                    </div>
                </div>

                {/* KARTU 3: (Bank Soal) */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-400/50 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Total Bank Soal</p>
                            <h4 className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalQuestions} <span className="text-lg font-bold text-slate-400 ml-1">Butir</span></h4>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 group-hover:bg-blue-100 transition-colors">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                    </div>
                    <div className="mt-5 border-t border-slate-100 pt-3">
                         <button onClick={() => navigate('/manage-questions')} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-all uppercase tracking-wider">
                            Kelola Bank Soal <span className="text-sm">&rarr;</span>
                        </button>
                    </div>
                </div>

            </div>

            {/* TABEL JADWAL UJIAN TERBARU */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-[15px] font-black text-slate-800 tracking-tight">Sesi Ujian Terbaru</h3>
                    </div>
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white">
                                <th className="py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Kuliah & Kode</th>
                                <th className="py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Token Akses</th>
                                <th className="py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Waktu Akhir</th>
                                <th className="py-3 px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status Sesi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentExams.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-slate-400 text-sm font-bold italic">
                                        Anda belum menerbitkan jadwal ujian apa pun.
                                    </td>
                                </tr>
                            ) : (
                                recentExams.map((exam) => {
                                    const status = getStatusUjian(exam.waktu_mulai, exam.waktu_selesai);
                                    
                                    return (
                                        <tr key={exam.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors group">
                                            <td className="py-3 px-5">
                                                <div className="font-bold text-slate-800 text-[13px] group-hover:text-blue-700 transition-colors">
                                                    {exam.mata_kuliah?.nama_mk || 'Mata Kuliah Dihapus'}
                                                </div>
                                                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                                    Kode: {exam.kode_mk} • SKS: {exam.mata_kuliah?.sks || '-'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-5 text-center">
                                                <span className="font-mono text-[13px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md tracking-wider">
                                                    {exam.token_ujian}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-center">
                                                <div className="font-bold text-slate-700 text-[13px]">Hingga {formatJam(exam.waktu_selesai)}</div>
                                                <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Durasi: {exam.durasi || 90} Menit</div>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <span className={`inline-flex items-center gap-1.5 border font-bold px-3 py-1 rounded-md text-[10px] uppercase tracking-wider ${status.color}`}>
                                                    {status.pulse && (
                                                        <svg className="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                                                    )}
                                                    {status.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </motion.div>
    );
}