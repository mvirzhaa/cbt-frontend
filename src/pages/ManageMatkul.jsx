import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function ManageMatkul() {
    const [isLoading, setIsLoading] = useState(false);
    
    // State Form Tambah Matkul
    const [kodeMk, setKodeMk] = useState('');
    const [namaMk, setNamaMk] = useState('');
    
    // State Data & Dropdown
    const [matkulList, setMatkulList] = useState([]);
    const [selectedMkId, setSelectedMkId] = useState('');
    const [scoreList, setScoreList] = useState([]); // 🌟 Menyimpan Rekap Nilai Akhir

    useEffect(() => {
        fetchMatkul();
    }, []);

    const fetchMatkul = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:3000/api/matakuliah', { headers: { Authorization: `Bearer ${token}` } });
            setMatkulList(res.data.data || []);
        } catch (error) { console.error("Gagal menarik data matkul", error); }
    };

    // 🌟 FUNGSI BARU: MENARIK REKAP NILAI SAAT DROPDOWN BERUBAH
    const fetchScores = async (mkId) => {
        if (!mkId) {
            setScoreList([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:3000/api/matakuliah/${mkId}/scores`, { headers: { Authorization: `Bearer ${token}` } });
            setScoreList(res.data.data || []);
        } catch (error) { console.error("Gagal menarik nilai matkul", error); }
    };

    const handleTambahMatkul = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/matakuliah', { kode_mk: kodeMk, nama_mk: namaMk }, { headers: { Authorization: `Bearer ${token}` } });
            Swal.fire({
                icon: 'success',
                title: 'Mata Kuliah Ditambahkan!',
                text: `Mata kuliah ${kodeMk} - ${namaMk} berhasil ditambahkan.`,
                confirmButtonColor: '#0f4c3a'
            });
            setKodeMk(''); setNamaMk('');
            fetchMatkul(); // Refresh list matkul
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menambahkan!',
                text: 'Terjadi kesalahan saat menambahkan mata kuliah.',
                confirmButtonColor: '#0f4c3a'
            });
        } finally { setIsLoading(false); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
            
            <div className="mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Mata Kuliah & Buku Nilai</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Tambahkan mata kuliah baru dan pantau rekapitulasi nilai akhir mahasiswa.</p>
            </div>

            {/* BAGIAN 1: FORM TAMBAH MATA KULIAH */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-[#0f4c3a]/10 rounded-lg">
                        <svg className="w-5 h-5 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">Registrasi Mata Kuliah Baru</h3>
                </div>

                <form onSubmit={handleTambahMatkul} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kode Mata Kuliah</label>
                            <input type="text" required value={kodeMk} onChange={e => setKodeMk(e.target.value.toUpperCase())} placeholder="Misal: IF101" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all uppercase" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Mata Kuliah</label>
                            <input type="text" required value={namaMk} onChange={e => setNamaMk(e.target.value)} placeholder="Misal: Algoritma dan Pemrograman" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all" />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl text-[13px] font-black text-white bg-gradient-to-r from-[#0f4c3a] to-[#16654e] hover:from-[#092e23] hover:to-[#0f4c3a] shadow-lg shadow-[#0f4c3a]/20 transition-all uppercase tracking-widest">
                        {isLoading ? 'Menyimpan...' : 'Tambahkan Mata Kuliah'}
                    </button>
                </form>
            </div>

            {/* BAGIAN 2: BUKU NILAI (GRADEBOOK) DENGAN DROPDOWN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-10">
                
                {/* Header & Dropdown */}
                <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-[18px] font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Gradebook & Rekap Nilai
                            </h3>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pilih mata kuliah untuk melihat nilai mahasiswa</p>
                        </div>
                        
                        <div className="w-full md:w-96">
                            <select value={selectedMkId} onChange={(e) => { setSelectedMkId(e.target.value); fetchScores(e.target.value); }} className="w-full px-5 py-3.5 bg-blue-50/50 rounded-xl border border-blue-200 focus:bg-white focus:border-blue-500 outline-none font-bold text-blue-900 text-[13px] transition-all shadow-sm">
                                <option value="">-- Pilih Mata Kuliah --</option>
                                {matkulList.map((mk, idx) => (
                                    <option key={mk.id || idx} value={mk.id || mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tabel Hasil Nilai */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Mahasiswa</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Sesi Ujian</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status Evaluasi</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Skor Akhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!selectedMkId ? (
                                <tr><td colSpan="4" className="py-16 text-center text-slate-400 font-bold text-sm">Silakan pilih mata kuliah pada dropdown di atas.</td></tr>
                            ) : scoreList.length === 0 ? (
                                <tr><td colSpan="4" className="py-16 text-center text-slate-400 font-bold text-sm">Belum ada data nilai mahasiswa di mata kuliah ini.</td></tr>
                            ) : (
                                scoreList.map((score, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-5 px-8">
                                            <p className="text-[14px] font-black text-[#0f4c3a]">{score.nama_mahasiswa}</p>
                                        </td>
                                        <td className="py-5 px-8">
                                            <p className="text-[13px] font-bold text-slate-700">{score.nama_ujian}</p>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${score.status === 'Selesai' ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                {score.status}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <span className={`text-[20px] font-black ${score.status === 'Selesai' ? 'text-slate-800' : 'text-slate-300'}`}>
                                                {score.status === 'Selesai' ? Math.round(score.total_skor) : '??'}
                                            </span>
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