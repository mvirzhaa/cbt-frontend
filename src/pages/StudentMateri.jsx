import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

export default function StudentMateri() {
    const [materiList, setMateriList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchMateri = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/materi`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();
                if (response.ok) {
                    setMateriList(result.data || []);
                }
            } catch (error) {
                console.error("Gagal menarik materi:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMateri();
    }, []);

    // Logika Pencarian Pintar (Berdasarkan Judul atau Kode MK)
    const filteredMateri = materiList.filter(item => 
        item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kode_mk.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 w-full max-w-6xl mx-auto">
            {/* Header & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <svg className="w-8 h-8 text-[#0F4C3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        Pustaka Materi
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Akses dan pelajari modul kuliah yang telah dibagikan oleh Dosen.</p>
                </div>

                {/* Kotak Pencarian */}
                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Cari judul atau kode MK..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/50 focus:border-[#0F4C3A] transition-all shadow-sm font-medium text-sm"
                    />
                </div>
            </div>

            {/* Area Daftar Materi */}
            {loading ? (
                <div className="py-20 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <svg className="animate-spin h-10 w-10 text-[#0F4C3A] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Memuat pustaka...
                </div>
            ) : filteredMateri.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-5xl block mb-4">📭</span>
                    <h3 className="text-lg font-bold text-slate-700">Materi Tidak Ditemukan</h3>
                    <p className="text-sm text-slate-500 mt-1">Belum ada materi yang tersedia atau pencarian tidak cocok.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMateri.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-lg transition-all duration-300 group flex flex-col h-full">
                            
                            {/* Header Card (Tipe File & Tanggal) */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-[#0F4C3A]/10 text-[#0F4C3A] rounded-xl flex items-center justify-center font-black text-sm">
                                    {item.file_path.endsWith('.pdf') ? 'PDF' : item.file_path.endsWith('.ppt') || item.file_path.endsWith('.pptx') ? 'PPT' : 'DOC'}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Info Card */}
                            <div className="flex-1">
                                <span className="inline-block text-[10px] font-black px-2 py-0.5 bg-slate-800 text-white rounded uppercase tracking-widest mb-2">{item.kode_mk}</span>
                                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-[#0F4C3A] transition-colors">{item.judul}</h3>
                                {item.deskripsi && <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{item.deskripsi}</p>}
                            </div>

                            {/* Footer Card (Dosen & Tombol Download) */}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                        {(item.users?.nama || 'D')[0].toUpperCase()}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{item.users?.nama || 'Dosen Pengampu'}</p>
                                </div>
                                <a 
                                    href={`${API_BASE_URL}${item.file_path}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-[#0F4C3A] text-white text-[11px] font-black uppercase tracking-wider rounded-lg hover:bg-[#0a3326] transition-colors shadow-md hover:shadow-none"
                                >
                                    Buka File
                                </a>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}