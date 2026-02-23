import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// import axios from 'axios'; // Nanti kita aktifkan jika API validasi sudah siap

export default function JoinExam() {
    const navigate = useNavigate();
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleJoin = async (e) => {
        e.preventDefault();
        
        // Validasi form agar tepat 6 karakter (opsional, sesuaikan dengan panjang tokenmu)
        if (token.length < 5) {
            setError('Token harus terdiri dari kombinasi huruf dan angka.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // NANTI KITA SAMBUNGKAN KE BACKEND DI SINI
            // const userToken = localStorage.getItem('token');
            // await axios.post('/api/exams/verify', { token_ujian: token }, ...);
            
            // Untuk sekarang, kita buat efek loading sukses palsu (simulasi)
           // Untuk sekarang, kita buat efek loading sukses palsu (simulasi)
setTimeout(() => {
    setIsLoading(false);
    navigate('/take-exam'); // <--- Arahkan ke Lembar Ujian!
}, 1500);

        } catch (err) {
            setError(err.response?.data?.message || 'Token tidak valid atau sesi ujian belum dimulai.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ornamen Background Premium */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-md w-full mx-auto relative z-10"
            >
                <div className="text-center mb-8">
                    <button onClick={() => navigate('/dashboard')} className="mb-6 inline-flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                        <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Kembali ke Dashboard
                    </button>
                    <div className="mx-auto h-20 w-20 bg-gradient-to-br from-[#0f172a] to-blue-800 rounded-[2rem] shadow-xl shadow-blue-900/20 flex items-center justify-center mb-6 border-4 border-white">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Akses Lembar Ujian</h2>
                    <p className="mt-2 text-slate-500 font-medium text-sm">Masukkan Token Akses Resmi yang diberikan oleh dosen pengawas Anda.</p>
                </div>

                <div className="bg-white py-10 px-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 rounded-[2rem]">
                    <form onSubmit={handleJoin} className="space-y-6">
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold text-center border border-red-100">
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-slate-400 mb-3 text-center uppercase tracking-widest">KODE TOKEN UJIAN</label>
                            <input 
                                type="text" 
                                required 
                                maxLength={8}
                                value={token} 
                                onChange={(e) => setToken(e.target.value)}
                                className="block w-full px-4 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-4xl font-black text-[#0f172a] tracking-[0.3em] uppercase placeholder-slate-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all uppercase-input"
                                placeholder="XXXXXX" 
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || !token}
                            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-600/20 text-base font-black text-white bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    MEMVERIFIKASI...
                                </span>
                            ) : 'MULAI UJIAN SEKARANG ➔'}
                        </button>
                    </form>
                </div>
                
                <p className="text-center mt-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Sistem Keamanan CBT Terenkripsi
                </p>
            </motion.div>
        </div>
    );
}