import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('users'); 
    
    // Logika API Tetap Sama Persis
    const [pendingUsers, setPendingUsers] = useState([
        { id: 1, nama: 'Dr. Budi Santoso', email: 'budi.s@kampus.ac.id', tanggal: '16 Feb 2026' },
        { id: 2, nama: 'Andi Pratama', email: 'andi.p@mhs.kampus.ac.id', tanggal: '16 Feb 2026' }
    ]);
    const [matkulList, setMatkulList] = useState([]);
    const [formMatkul, setFormMatkul] = useState({ kode_mk: '', nama_mk: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'matkul') fetchMatkul();
    }, [activeTab]);

    const fetchMatkul = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/matakuliah', { headers: { Authorization: `Bearer ${token}` } });
            setMatkulList(response.data.data || []);
        } catch (error) {
            console.error("Gagal mengambil data matkul:", error);
        }
    };

    const handleTambahMatkul = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/matakuliah', formMatkul, { headers: { Authorization: `Bearer ${token}` } });
            alert("Mata Kuliah Berhasil Ditambahkan!");
            setFormMatkul({ kode_mk: '', nama_mk: '' });
            fetchMatkul(); 
        } catch (error) {
            console.error(error);
            alert("Gagal menambahkan mata kuliah.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAktivasi = (id, nama, role) => {
        if (window.confirm(`Aktifkan ${nama} sebagai ${role.toUpperCase()}?`)) {
            alert(`Sukses! ${nama} diaktifkan sebagai ${role}.`);
            setPendingUsers(pendingUsers.filter(user => user.id !== id));
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
            
            {/* Header & Toggle Tab (Premium Design) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Pusat Kendali Admin</h3>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">Kelola otorisasi pendaftar baru dan master data akademik.</p>
                </div>
                <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex">
                    <button onClick={() => setActiveTab('users')} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-[#0f4c3a] text-[#d4af37] shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                        Verifikasi Akun
                        {pendingUsers.length > 0 && <span className="ml-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{pendingUsers.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('matkul')} className={`px-5 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'matkul' ? 'bg-[#0f4c3a] text-[#d4af37] shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Master Matkul</button>
                </div>
            </div>

            {/* KONTEN BERDASARKAN TAB */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Antrean Pendaftar Baru</h3>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identitas Pendaftar</th>
                                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tanggal Daftar</th>
                                <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Otorisasi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.length === 0 ? (
                                <tr><td colSpan="3" className="py-10 text-center text-slate-400 text-sm font-medium italic">Tidak ada pendaftar baru yang menunggu.</td></tr>
                            ) : (
                                pendingUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-800 text-[14px]">{user.nama}</div>
                                            <div className="text-[12px] text-slate-500 mt-0.5 font-medium">{user.email}</div>
                                        </td>
                                        <td className="py-4 px-6 text-center text-slate-600 text-[13px] font-semibold">{user.tanggal}</td>
                                        <td className="py-4 px-6 text-right space-x-2">
                                            <button onClick={() => handleAktivasi(user.id, user.nama, 'dosen')} className="px-4 py-2 text-[11px] font-bold text-[#0f4c3a] bg-[#ecfdf5] border border-[#a7f3d0] hover:bg-[#d1fae5] rounded-md transition-all uppercase tracking-wider">+ Dosen</button>
                                            <button onClick={() => handleAktivasi(user.id, user.nama, 'mahasiswa')} className="px-4 py-2 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-all uppercase tracking-wider">+ Mhs</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'matkul' && (
                <div className="space-y-6">
                    {/* Form Input Matkul Compact */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kode MK</label>
                            <input type="text" value={formMatkul.kode_mk} onChange={e => setFormMatkul({...formMatkul, kode_mk: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20 text-[13px] font-bold" placeholder="Misal: IF101" />
                        </div>
                        <div className="flex-[2] w-full">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Mata Kuliah</label>
                            <input type="text" value={formMatkul.nama_mk} onChange={e => setFormMatkul({...formMatkul, nama_mk: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20 text-[13px] font-bold" placeholder="Misal: Pemrograman Web Lanjut" />
                        </div>
                        <button onClick={handleTambahMatkul} disabled={isLoading} className="w-full md:w-auto px-6 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f4c3a] text-[12px] font-black uppercase tracking-widest rounded-lg shadow-sm h-[42px] transition-all flex items-center justify-center gap-2">
                            Tambah Data
                        </button>
                    </div>

                    {/* Tabel Matkul */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Master Data Tersimpan</h3>
                            <span className="bg-[#0f4c3a] text-white text-[10px] px-3 py-1 rounded-md font-bold uppercase tracking-widest">{matkulList.length} Mata Kuliah</span>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-white">
                                    <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Kode MK</th>
                                    <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Mata Kuliah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matkulList.length === 0 ? (
                                    <tr><td colSpan="2" className="py-8 text-center text-slate-400 text-sm font-medium italic">Belum ada data mata kuliah.</td></tr>
                                ) : (
                                    matkulList.map((mk) => (
                                        <tr key={mk.kode_mk} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-6 font-mono text-[13px] font-black text-slate-700 bg-slate-100/50">{mk.kode_mk}</td>
                                            <td className="py-3 px-6 text-[14px] font-bold text-slate-800">{mk.nama_mk}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </motion.div>
    );
}