import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function Register() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ nama: '', email: '', password: '' });

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post('/api/register', formData);
            
            // 🌟 ALERT SUKSES REGISTER
            await Swal.fire({
                icon: 'success',
                title: 'Registrasi Berhasil!',
                text: 'Silakan tunggu Admin mengaktifkan akun Anda sebelum Login.',
                confirmButtonColor: '#0f4c3a'
            });
            
            navigate('/'); // Kembali ke halaman Login setelah user klik OK
        } catch (error) {
            // 🌟 ALERT GAGAL REGISTER
            Swal.fire({
                icon: 'error',
                title: 'Registrasi Gagal',
                text: error.response?.data?.message || "Email mungkin sudah dipakai.",
                confirmButtonColor: '#d33'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#0f4c3a] text-[#d4af37] rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-lg">CBT</div>
                    <h2 className="text-2xl font-black text-slate-800">Daftar Akun Baru</h2>
                    <p className="text-sm font-medium text-slate-500 mt-2">Buat akun untuk mengakses Portal Akademik.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Lengkap</label>
                        <input type="text" required value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#0f4c3a] outline-none font-semibold text-[14px]" placeholder="Masukkan nama Anda" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Alamat Email</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#0f4c3a] outline-none font-semibold text-[14px]" placeholder="email@kampus.ac.id" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kata Sandi</label>
                        <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#0f4c3a] outline-none font-semibold text-[14px]" placeholder="••••••••" />
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 rounded-xl text-[13px] font-black text-white bg-[#0f4c3a] shadow-lg shadow-[#0f4c3a]/20 uppercase tracking-widest">
                        {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
                    </button>
                </form>

                <p className="text-center mt-6 text-[13px] font-semibold text-slate-500">
                    Sudah punya akun? <Link to="/" className="text-[#0f4c3a] font-black hover:underline">Masuk di sini</Link>
                </p>
            </motion.div>
        </div>
    );
}
