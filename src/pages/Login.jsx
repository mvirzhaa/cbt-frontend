import { useState } from 'react';
import axios from 'axios';
// 🌟 TAMBAHAN: Import Link untuk navigasi ke halaman Register
import { useNavigate, Link } from 'react-router-dom'; 
import { motion } from 'framer-motion';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 🌟 LANGSUNG TEMBAK KE BACKEND (Tidak ada lagi Cheat Code)
            const response = await axios.post('/api/login', { email, password });
            
            const dataUtama = response.data.data || response.data;
            const dataUser = dataUtama.user || dataUtama; 

            // 🌟 DAPATKAN TOKEN JWT ASLI DARI BACKEND
            const token = dataUtama.token;
            const role = dataUser.role; 
            const nama = dataUser.nama || dataUser.name || 'Pengguna Sistem';
            const emailUser = dataUser.email || email;

            if (!role) throw new Error("Backend tidak mengirimkan role.");

            // Simpan KTP Asli ke memori browser
            localStorage.setItem('token', token);
            localStorage.setItem('role', role); 
            localStorage.setItem('nama', nama);
            localStorage.setItem('email', emailUser);

            const roleCek = role.toLowerCase();
            
            if (roleCek.includes('admin') || roleCek.includes('super')) {
                navigate('/admin'); 
            } else if (roleCek.includes('mahasiswa') || roleCek.includes('student')) {
                navigate('/student-dashboard'); 
            } else {
                navigate('/dashboard'); 
            }
        } catch (err) {
            console.error("Login gagal:", err);
            setError(err.response?.data?.message || 'Kredensial tidak valid.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-sans overflow-hidden">
            
            {/* PANEL KIRI - BRANDING INSTITUSI (Warna UIKA) */}
            <div className="hidden lg:flex lg:w-[45%] bg-[#0f4c3a] relative items-center justify-center">
                {/* Efek Tekstur & Gradien Halus */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f4c3a] via-[#0f4c3a] to-[#092e23] mix-blend-multiply"></div>
                
                {/* Aksen Emas di pojok */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#d4af37]/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#d4af37]/10 to-transparent rounded-tr-[100px]"></div>

                <div className="relative z-10 text-center px-16">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="mx-auto h-24 w-24 bg-white rounded-xl shadow-2xl flex items-center justify-center mb-10 border-b-4 border-[#d4af37]">
                        <svg className="w-12 h-12 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                    </motion.div>
                    
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-4xl font-black text-white tracking-tight mb-4 leading-tight">
                        Sistem Ujian <br />Berbasis Komputer
                    </motion.h1>
                    
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="w-16 h-1 bg-[#d4af37] mx-auto mb-6"></motion.div>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-[#a7f3d0] text-[15px] font-medium max-w-sm mx-auto leading-relaxed">
                        Portal evaluasi akademik terintegrasi untuk Dosen dan Mahasiswa Universitas Ibn Khaldun Bogor.
                    </motion.p>
                </div>
            </div>

            {/* PANEL KANAN - FORM LOGIN */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-[#f8fafc] relative">
                <div className="w-full max-w-[420px]">
                    
                    {/* Header Form Mobile (Hanya muncul jika di HP) */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="mx-auto h-16 w-16 bg-[#0f4c3a] rounded-lg shadow-md flex items-center justify-center mb-4">
                             <svg className="w-8 h-8 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Portal CBT UIKA</h2>
                    </div>

                    <div className="mb-10 lg:text-left text-center">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Otorisasi Akses</h2>
                        <p className="mt-2 text-[14px] text-slate-500 font-medium">Silakan masukkan kredensial akun akademik Anda.</p>
                    </div>

                    {error && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-8 bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-[13px] text-red-700 font-bold leading-relaxed">{error}</p>
                        </motion.div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Institusi</label>
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] text-[14px] font-bold text-slate-800 transition-all"
                                placeholder="nama@uika-bogor.ac.id" 
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">Kata Sandi</label>
                                <a href="#" className="text-[11px] font-bold text-[#0f4c3a] hover:text-[#092e23] transition-colors">Lupa sandi?</a>
                            </div>
                            <input 
                                type="password" 
                                required 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] text-[14px] font-bold text-slate-800 transition-all"
                                placeholder="••••••••" 
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-[14px] font-black uppercase tracking-wider text-white bg-[#0f4c3a] hover:bg-[#092e23] focus:outline-none focus:ring-4 focus:ring-[#0f4c3a]/20 transition-all shadow-lg shadow-[#0f4c3a]/20 disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Memverifikasi...
                                    </>
                                ) : (
                                    <>
                                        Masuk ke Sistem
                                        <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* 🌟 TAMBAHAN: Teks Ajakan Registrasi */}
                    <div className="mt-8 text-center">
                        <p className="text-[13px] font-semibold text-slate-500">
                            Belum memiliki akun akademik?{' '}
                            <Link to="/register" className="text-[#0f4c3a] font-black hover:text-[#092e23] hover:underline transition-colors">
                                Daftar Sekarang
                            </Link>
                        </p>
                    </div>

                    {/* Footer / Copyright info */}
                    <div className="mt-12 text-center">
                        <p className="text-[11px] font-bold text-slate-400">
                            &copy; 2026 Universitas Ibn Khaldun Bogor.<br/>Departemen Teknologi Informasi.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
