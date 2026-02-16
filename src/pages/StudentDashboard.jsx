import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function StudentDashboard() {
    const navigate = useNavigate();
    const nama = localStorage.getItem('nama') || 'Mahasiswa';

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto mt-8">
            <div className="bg-gradient-to-br from-[#0f4c3a] to-[#092e23] rounded-2xl p-10 text-white shadow-xl relative overflow-hidden border border-[#16654e]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
                <div className="relative z-10 md:w-2/3">
                    <span className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-sm">Portal Akademik Mahasiswa</span>
                    <h2 className="text-3xl font-black leading-tight mb-3">Ahlan wa Sahlan, {nama.split(' ')[0]}!</h2>
                    <p className="text-[#a7f3d0] font-medium mb-8 text-[13px] leading-relaxed">Selamat datang di Sistem CBT Universitas Ibn Khaldun. Persiapkan diri Anda dengan baik, pastikan koneksi internet stabil, dan junjung tinggi integritas kejujuran.</p>
                    
                    <button onClick={() => navigate('/take-exam')} className="bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f4c3a] font-black px-8 py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-3 text-sm tracking-wider uppercase">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        Masuk Ruang Ujian
                    </button>
                </div>
            </div>
        </motion.div>
    );
}