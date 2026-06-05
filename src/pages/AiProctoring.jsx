import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import proctoringService from '../services/proctoring.service';

export default function AiProctoring() {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchViolations();
    }, []);

    const fetchViolations = async () => {
        try {
            const data = await proctoringService.getViolations();
            setViolations(data || []);
        } catch (error) {
            console.error("Gagal menarik data pelanggaran:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Monitor Pengawas AI
                </h1>
                <p className="text-slate-500 font-medium mt-1">Log rekaman aktivitas mencurigakan yang ditangkap otomatis oleh mesin Proctoring AI.</p>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-500">
                    <svg className="animate-spin h-10 w-10 text-red-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Menyinkronkan data dari server...
                </div>
            ) : violations.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-6xl block mb-4">🛡️</span>
                    <h3 className="text-xl font-bold text-slate-700">Tidak Ada Pelanggaran</h3>
                    <p className="text-slate-500 mt-2">Ujian berjalan bersih. AI tidak mendeteksi adanya kecurangan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {violations.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden group">
                            {/* Area Foto Bukti */}
                            <div className="relative h-48 bg-slate-900 overflow-hidden">
                                <img 
                                    src={`${API_BASE_URL}${item.foto_bukti}`} 
                                    alt="Bukti Pelanggaran" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Foto+Tidak+Ditemukan' }}
                                />
                                <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg animate-pulse">
                                    Busted
                                </div>
                            </div>
                            
                            {/* Area Informasi */}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${item.jenis_pelanggaran === 'TIDAK_ADA_WAJAH' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                        {item.jenis_pelanggaran.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-1">{item.users?.nama || 'Mahasiswa Tidak Diketahui'}</h3>
                                <p className="text-sm font-bold text-slate-500">{item.exams?.nama_ujian || 'Sesi Ujian CBT'}</p>
                                
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-xs text-slate-400 font-medium">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {new Date(item.waktu_kejadian).toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}