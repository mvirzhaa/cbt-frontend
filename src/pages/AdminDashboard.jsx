import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// 🌟 MENERIMA PARAMETER DARI APP.JSX
export default function AdminDashboard({ activeMenu = 'overview' }) {
    const navigate = useNavigate();
    
    const [pendingUsers, setPendingUsers] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]); 
    const [matkulList, setMatkulList] = useState([]);
    const [formMatkul, setFormMatkul] = useState({ kode_mk: '', nama_mk: '', dosen_id: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // 🌟 State Edit
    // =========================================================================
    // 📡 API CALLS
    // =========================================================================
    const getAuthHeaders = useCallback(
        () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        []
    );

    const fetchPendingUsers = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/users/pending', getAuthHeaders());
            setPendingUsers(res.data.data || []);
        } catch (error) { console.error("Gagal menarik antrean:", error); }
    }, [getAuthHeaders]);

    const fetchActiveUsers = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/users/active', getAuthHeaders());
            const myEmail = localStorage.getItem('email') || '';
            const filteredUsers = (res.data.data || []).filter(u => u.email !== myEmail && u.role !== 'super_admin');
            setActiveUsers(filteredUsers);
        } catch (error) { console.error("Gagal menarik pengguna aktif:", error); }
    }, [getAuthHeaders]);

    const fetchMatkul = useCallback(async () => {
        try {
            const res = await axios.get('/api/matakuliah', getAuthHeaders());
            setMatkulList(res.data.data || []);
        } catch (error) { console.error("Gagal matkul:", error); }
    }, [getAuthHeaders]);
    // Otomatis menarik data
    useEffect(() => {
        if (activeMenu === 'overview') {
            fetchPendingUsers(); fetchActiveUsers(); fetchMatkul();
        } else if (activeMenu === 'verifikasi') {
            fetchPendingUsers();
        } else if (activeMenu === 'pengguna') {
            fetchActiveUsers();
        } else if (activeMenu === 'matkul') {
            fetchMatkul(); 
            fetchActiveUsers(); // Untuk Dropdown Dosen
        }
    }, [activeMenu, fetchActiveUsers, fetchMatkul, fetchPendingUsers]);

    // =========================================================================
    // ⚔️ FUNGSI AKSI ADMIN
    // =========================================================================
    const handleAktivasi = async (id, nama, role) => {
        const result = await Swal.fire({
            title: 'Otorisasi Akses?', text: `Yakin ingin menyetujui akun ${nama} sebagai ${role.toUpperCase()}?`,
            icon: 'question', showCancelButton: true, confirmButtonColor: '#0f4c3a', confirmButtonText: 'Ya, Setujui!'
        });
        if (!result.isConfirmed) return;
        setIsLoading(true);
        try {
            await axios.put(`/api/admin/users/${id}/approve`, { role }, getAuthHeaders());
            Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Akun ${nama} aktif sebagai ${role}.`, timer: 2000, showConfirmButton: false });
            fetchPendingUsers();
        } catch (error) { Swal.fire('Gagal', 'Tidak dapat memberikan otorisasi.', 'error'); } 
        finally { setIsLoading(false); }
    };

    const handleHapusPengguna = async (id, nama, role) => {
        const result = await Swal.fire({
            title: 'Hapus Permanen?', text: `Anda akan menghapus akun ${role.toUpperCase()} atas nama ${nama}. Semua data terkait akun ini akan hilang!`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Eksekusi!', reverseButtons: true
        });
        if (!result.isConfirmed) return;
        try {
            await axios.delete(`/api/admin/users/${id}`, getAuthHeaders());
            Swal.fire({ icon: 'success', title: 'Terhapus!', text: `Akun ${nama} telah dibumihanguskan dari sistem.`, timer: 2000, showConfirmButton: false });
            fetchActiveUsers(); 
        } catch (error) { Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus akun.', 'error'); }
    };

    // =========================================================================
    // 📚 FUNGSI CRUD MASTER MATKUL
    // =========================================================================
    const handleSimpanMatkul = async (e) => {
        e.preventDefault();
        if (!formMatkul.kode_mk || !formMatkul.nama_mk) return Swal.fire('Peringatan', 'Kode dan Nama MK wajib diisi!', 'warning');
        
        setIsLoading(true);
        try {
            if (isEditing) {
                await axios.put(`/api/matakuliah/${formMatkul.kode_mk}`, formMatkul, getAuthHeaders());
                Swal.fire({ icon: 'success', title: 'Diperbarui!', text: 'Mata Kuliah berhasil diedit.', timer: 2000, showConfirmButton: false });
            } else {
                await axios.post('/api/matakuliah', formMatkul, getAuthHeaders());
                Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'Mata Kuliah ditambahkan.', timer: 2000, showConfirmButton: false });
            }
            
            setFormMatkul({ kode_mk: '', nama_mk: '', dosen_id: '' });
            setIsEditing(false);
            fetchMatkul(); 
        } catch (error) { Swal.fire('Gagal', 'Terjadi kesalahan pada database.', 'error'); } 
        finally { setIsLoading(false); }
    };

    const handleKlikEdit = (mk) => {
        setFormMatkul({ kode_mk: mk.kode_mk, nama_mk: mk.nama_mk, dosen_id: mk.users ? mk.users.id : '' });
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBatalEdit = () => {
        setFormMatkul({ kode_mk: '', nama_mk: '', dosen_id: '' });
        setIsEditing(false);
    };

    const handleHapusMatkul = async (kode_mk, nama_mk) => {
        const result = await Swal.fire({
            title: 'Hapus Mata Kuliah?', text: `Anda akan menghapus ${nama_mk} (${kode_mk}). Tindakan ini permanen!`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus!', reverseButtons: true
        });

        if (!result.isConfirmed) return;
        try {
            await axios.delete(`/api/matakuliah/${kode_mk}`, getAuthHeaders());
            Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Mata kuliah dilenyapkan.', timer: 1500, showConfirmButton: false });
            fetchMatkul();
        } catch (error) { Swal.fire('Gagal', 'Tidak dapat dihapus. Pastikan tidak ada soal/ujian yang terkait.', 'error'); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
            
            {/* 🌟 HEADER HALAMAN */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-full blur-3xl opacity-50 -z-10 -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10">
                    <span className="bg-[#0f4c3a]/10 text-[#0f4c3a] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-sm">Administrator Level</span>
                    {activeMenu === 'overview' && <><h3 className="text-3xl font-black text-slate-900 tracking-tight">Ikhtisar Sistem</h3><p className="text-[14px] font-medium text-slate-500 mt-2 max-w-lg">Pemantauan metrik utama dan status operasional Portal Akademik CBT.</p></>}
                    {activeMenu === 'verifikasi' && <><h3 className="text-3xl font-black text-slate-900 tracking-tight">Verifikasi Pendaftar</h3><p className="text-[14px] font-medium text-slate-500 mt-2 max-w-lg">Tinjau dan berikan otorisasi akses kepada pendaftar baru.</p></>}
                    {activeMenu === 'pengguna' && <><h3 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Pengguna</h3><p className="text-[14px] font-medium text-slate-500 mt-2 max-w-lg">Kelola daftar seluruh Dosen dan Mahasiswa yang beroperasi di sistem.</p></>}
                    {activeMenu === 'matkul' && <><h3 className="text-3xl font-black text-slate-900 tracking-tight">Master Mata Kuliah</h3><p className="text-[14px] font-medium text-slate-500 mt-2 max-w-lg">Kelola data induk (Master Data) mata kuliah sebagai dasar penerbitan ujian.</p></>}
                </div>
            </div>

            {/* HALAMAN 1: DASHBOARD */}
            {activeMenu === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-[#0f4c3a] to-[#16654e] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                        <svg className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                        <div className="relative z-10"><p className="text-[#6ee7b7] font-bold uppercase tracking-widest text-[11px] mb-2">Total Pengguna Aktif</p><h4 className="text-4xl font-black tracking-tight">{activeUsers.length} <span className="text-sm font-bold text-[#a7f3d0] ml-1">Akun</span></h4><button onClick={() => navigate('/admin/pengguna')} className="mt-5 text-[11px] font-bold text-white/80 hover:text-white flex items-center gap-1.5 uppercase tracking-wider">Lihat Detail &rarr;</button></div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <div className="relative z-10"><p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-2">Menunggu Verifikasi</p><h4 className="text-4xl font-black tracking-tight text-slate-800">{pendingUsers.length} <span className="text-sm font-bold text-slate-400 ml-1">Antrean</span></h4><button onClick={() => navigate('/admin/verifikasi')} className="mt-5 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 uppercase tracking-wider">Proses Sekarang &rarr;</button></div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-fuchsia-600"></div>
                        <div className="relative z-10"><p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-2">Master Mata Kuliah</p><h4 className="text-4xl font-black tracking-tight text-slate-800">{matkulList.length} <span className="text-sm font-bold text-slate-400 ml-1">Matkul</span></h4><button onClick={() => navigate('/admin/matkul')} className="mt-5 text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1.5 uppercase tracking-wider">Kelola Master &rarr;</button></div>
                    </div>
                </motion.div>
            )}

            {/* HALAMAN 2 & 3: Verifikasi & Pengguna (Tetap dibiarkan sama seperti sebelumnya) */}
            {activeMenu === 'verifikasi' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="border-b border-slate-200 bg-slate-50/50"><th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Identitas Pendaftar</th><th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Waktu Pendaftaran</th><th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Otorisasi</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {pendingUsers.length === 0 ? (<tr><td colSpan="3" className="py-20 text-center"><p className="text-slate-400 font-bold">Tidak ada pendaftar baru yang menunggu verifikasi.</p></td></tr>) : (pendingUsers.map((user) => (<tr key={user.id} className="hover:bg-slate-50/80 transition-colors"><td className="py-5 px-8"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[15px] border border-slate-200 uppercase">{user.nama.charAt(0)}</div><div><div className="font-black text-slate-800 text-[15px]">{user.nama}</div><div className="text-[13px] text-slate-500 font-medium">{user.email}</div></div></div></td><td className="py-5 px-8 text-center text-slate-600 text-[13px] font-bold"><span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{new Date(user.created_at || Date.now()).toLocaleDateString('id-ID')}</span></td><td className="py-5 px-8 text-right space-x-3"><button onClick={() => handleAktivasi(user.id, user.nama, 'dosen')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl uppercase tracking-wider">+ Dosen</button><button onClick={() => handleAktivasi(user.id, user.nama, 'mahasiswa')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl uppercase tracking-wider">+ Mhs</button></td></tr>)))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {activeMenu === 'pengguna' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="border-b border-slate-200 bg-slate-50/50"><th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Identitas Pengguna</th><th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Hak Akses</th><th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Tindakan</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeUsers.map((user) => (<tr key={user.id} className="hover:bg-slate-50/80 transition-colors"><td className="py-5 px-8"><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[15px] uppercase shadow-sm border ${user.role === 'dosen' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{user.nama.charAt(0)}</div><div><div className="font-black text-slate-800 text-[15px]">{user.nama}</div><div className="text-[13px] text-slate-500 font-medium">{user.email}</div></div></div></td><td className="py-5 px-8 text-center"><span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider ${user.role === 'dosen' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{user.role}</span></td><td className="py-5 px-8 text-right"><button onClick={() => handleHapusPengguna(user.id, user.nama, user.role)} className="px-4 py-2.5 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-xl uppercase tracking-wider">Cabut Akses</button></td></tr>))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* ========================================================= */}
            {/* 📚 HALAMAN 4: MASTER MATKUL (Desain Premium) */}
            {/* ========================================================= */}
            {activeMenu === 'matkul' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    
                    {/* 🌟 FORM INPUT PREMIUM */}
                    <div className={`p-8 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border transition-all duration-300 relative overflow-hidden ${isEditing ? 'bg-gradient-to-r from-amber-50 to-orange-50/30 border-amber-200' : 'bg-white border-slate-100'}`}>
                        {/* Dekorasi Latar Form */}
                        {isEditing && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>}
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2.5 rounded-xl ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-[#0f4c3a]'}`}>
                                {isEditing ? 
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> : 
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                }
                            </div>
                            <div>
                                <h4 className={`text-[15px] font-black uppercase tracking-widest ${isEditing ? 'text-amber-800' : 'text-slate-800'}`}>
                                    {isEditing ? 'Mode Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}
                                </h4>
                                <p className="text-[12px] font-semibold text-slate-500 mt-0.5">
                                    {isEditing ? 'Ubah informasi matkul atau ganti dosen pengampu.' : 'Lengkapi formulir untuk menambah data akademik.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-5 items-end">
                            <div className="flex-[0.8] w-full">
                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Kode Indeks</label>
                                <input type="text" value={formMatkul.kode_mk} onChange={e => setFormMatkul({...formMatkul, kode_mk: e.target.value.toUpperCase()})} disabled={isEditing} className={`w-full px-5 py-4 rounded-xl border outline-none text-[14px] font-black transition-all shadow-sm ${isEditing ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 text-slate-800'}`} placeholder="Misal: IF101" />
                            </div>
                            
                            <div className="flex-[2] w-full">
                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Nama Mata Kuliah</label>
                                <input type="text" value={formMatkul.nama_mk} onChange={e => setFormMatkul({...formMatkul, nama_mk: e.target.value})} className={`w-full px-5 py-4 bg-slate-50 rounded-xl border outline-none text-[14px] font-bold text-slate-800 shadow-sm transition-all ${isEditing ? 'border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 focus:bg-white' : 'border-slate-200 focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 focus:bg-white'}`} placeholder="Nama Lengkap Matkul" />
                            </div>
                            
                            <div className="flex-[1.5] w-full">
                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Dosen Pengampu</label>
                                <select value={formMatkul.dosen_id} onChange={e => setFormMatkul({...formMatkul, dosen_id: e.target.value})} className={`w-full px-5 py-4 bg-slate-50 rounded-xl border outline-none text-[13px] font-bold text-slate-700 cursor-pointer appearance-none shadow-sm transition-all ${isEditing ? 'border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 focus:bg-white' : 'border-slate-200 focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 focus:bg-white'}`}>
                                    <option value="">-- Kosongkan / Belum Ada --</option>
                                    {activeUsers.filter(u => u.role === 'dosen').map(dosen => (
                                        <option key={dosen.id} value={dosen.id}>{dosen.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                                {isEditing && (
                                    <button onClick={handleBatalEdit} type="button" className="px-6 py-4 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm">
                                        Batal
                                    </button>
                                )}
                                <button onClick={handleSimpanMatkul} disabled={isLoading} className={`px-8 py-4 text-[12px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 flex-1 lg:flex-none flex items-center justify-center gap-2 ${isEditing ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-[#0f4c3a]/30'}`}>
                                    {isEditing ? 'Simpan Edit' : 'Tambah Data'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 🌟 TABEL DATA MATKUL PREMIUM */}
                    <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Daftar Mata Kuliah</h3>
                            <span className="bg-slate-800 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest shadow-sm">Total: {matkulList.length}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-white">
                                        <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest w-32">Kode MK</th>
                                        <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Mata Kuliah</th>
                                        <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Dosen Pengampu</th>
                                        <th className="py-5 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {matkulList.length === 0 ? (
                                        <tr><td colSpan="4" className="py-16 text-center text-slate-400 font-bold">Belum ada mata kuliah yang terdaftar di sistem.</td></tr>
                                    ) : (
                                        matkulList.map((mk) => (
                                            <tr key={mk.kode_mk} className={`transition-colors group ${formMatkul.kode_mk === mk.kode_mk && isEditing ? 'bg-amber-50/50' : 'hover:bg-slate-50/80'}`}>
                                                <td className="py-5 px-8">
                                                    <span className={`font-mono text-[13px] font-black px-3 py-1.5 rounded-lg border ${formMatkul.kode_mk === mk.kode_mk && isEditing ? 'bg-amber-100 text-amber-700 border-amber-200' : 'text-[#0f4c3a] bg-[#0f4c3a]/10 border-[#0f4c3a]/20'}`}>
                                                        {mk.kode_mk}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-8 text-[14px] font-bold text-slate-800 group-hover:text-[#0f4c3a] transition-colors">{mk.nama_mk}</td>
                                                <td className="py-5 px-8">
                                                    {mk.users ? (
                                                        <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                            {mk.users.nama}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[12px] font-semibold text-slate-400 italic flex items-center gap-1.5">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            Belum Ditentukan
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-5 px-8 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button onClick={() => handleKlikEdit(mk)} className="inline-flex items-center justify-center w-8 h-8 text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-500 hover:text-white rounded-lg transition-colors shadow-sm" title="Edit Matkul">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleHapusMatkul(mk.kode_mk, mk.nama_mk)} className="inline-flex items-center justify-center w-8 h-8 text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Hapus Matkul">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
            )}

        </motion.div>
    );
}   



