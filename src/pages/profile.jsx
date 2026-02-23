import { useState } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Profile() {
    const [userData] = useState(() => {
        const nama = localStorage.getItem('nama') || 'Pengguna Sistem';
        const role = localStorage.getItem('role') || 'user';
        const email = localStorage.getItem('email') || 'pengguna@uika.ac.id';

        return {
            nama,
            role: role.replace('_', ' ').toUpperCase(),
            inisial: nama.charAt(0).toUpperCase(),
            email,
            tanggalDaftar: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
        };
    });
    const [passwords, setPasswords] = useState({ lama: '', baru: '', konfirmasi: '' });

    const handleUbahPassword = (e) => {
        e.preventDefault();
        if (passwords.baru !== passwords.konfirmasi) {
            return Swal.fire({ icon: 'error', title: 'Gagal!', text: 'Konfirmasi kata sandi baru tidak cocok!', confirmButtonColor: '#d33' });
        }
        Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Kata sandi Anda telah diperbarui.', confirmButtonColor: '#0f4c3a' });
        setPasswords({ lama: '', baru: '', konfirmasi: '' });
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto pb-12 space-y-6">
            
            {/* 🌟 KARTU HEADER PROFIL (Premium Design) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-32 sm:h-40 bg-gradient-to-r from-[#0f4c3a] to-[#092e23] relative">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute top-5 right-5 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                        <span className="text-white text-[10px] font-bold tracking-widest uppercase">Portal Akademik UIKA</span>
                    </div>
                </div>
                
                <div className="px-8 pb-8 flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-16 relative z-10">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-[#d4af37] to-[#b5952f] flex items-center justify-center text-5xl font-black text-white relative">
                        {userData.inisial}
                        <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                    <div className="text-center sm:text-left flex-1 mb-2">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{userData.nama}</h2>
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-[#0f4c3a] px-3 py-1 rounded-md mt-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <p className="font-bold text-[11px] uppercase tracking-widest">{userData.role}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🌟 GRID 2 KOLOM (Kiri: Info Identitas, Kanan: Form Password) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* KOLOM KIRI: Informasi Akun */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <h3 className="text-[13px] font-black text-slate-800 tracking-widest uppercase">Detail Identitas</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat Email</p>
                                <p className="text-[14px] font-bold text-slate-800 break-words">{userData.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Hak Akses Sistem</p>
                                <p className="text-[14px] font-bold text-slate-800">{userData.role}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Terdaftar Sejak</p>
                                <p className="text-[14px] font-bold text-slate-800">{userData.tanggalDaftar}</p>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status Akun</p>
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-3 py-1 rounded-md text-[11px] uppercase tracking-wider">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Aktif & Terverifikasi
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN: Pengaturan Kata Sandi */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-[13px] font-black text-slate-800 tracking-widest uppercase">Keamanan Akun</h3>
                            </div>
                        </div>

                        <form onSubmit={handleUbahPassword} className="p-6 md:p-8 space-y-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kata Sandi Saat Ini</label>
                                    <input type="password" required value={passwords.lama} onChange={e => setPasswords({...passwords, lama: e.target.value})} className="w-full md:w-2/3 px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20 outline-none text-[13px] font-bold text-slate-800 transition-all placeholder:text-slate-300" placeholder="Masukkan sandi lama" />
                                </div>
                                
                                <div className="h-px bg-slate-100 w-full my-6"></div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kata Sandi Baru</label>
                                        <input type="password" required value={passwords.baru} onChange={e => setPasswords({...passwords, baru: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20 outline-none text-[13px] font-bold text-slate-800 transition-all placeholder:text-slate-300" placeholder="Minimal 8 karakter" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Konfirmasi Sandi Baru</label>
                                        <input type="password" required value={passwords.konfirmasi} onChange={e => setPasswords({...passwords, konfirmasi: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20 outline-none text-[13px] font-bold text-slate-800 transition-all placeholder:text-slate-300" placeholder="Ketik ulang sandi baru" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-6 flex justify-end">
                                <button type="submit" className="px-8 py-3.5 bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] text-[12px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#0f4c3a]/20 flex items-center gap-2 active:scale-95">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
