import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function CreateExam() {
    const [isLoading, setIsLoading] = useState(false);
    const [matkulList, setMatkulList] = useState([]);
    const [examList, setExamList] = useState([]);

    const [formExam, setFormExam] = useState({
        matakuliah_id: '',
        nama_ujian: '',
        waktu_mulai: '',
        waktu_selesai: '',
        durasi: 90
    });

    useEffect(() => {
        fetchMatkul();
        fetchExams();
    }, []);

    const fetchMatkul = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/matakuliah', { headers: { Authorization: `Bearer ${token}` } });
            setMatkulList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data matkul", error); }
    };

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/exams', { headers: { Authorization: `Bearer ${token}` } });
            setExamList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data ujian", error); }
    };

    const handleTerbitkan = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            // Memastikan durasi dan id adalah angka (integer) sebelum dikirim
            const payload = {
                ...formExam,
                matakuliah_id: formExam.matakuliah_id, // 🌟 HAPUS parseInt() DI SINI
                durasi: parseInt(formExam.durasi)      // Ini sudah benar, biarkan saja
            };

            await axios.post('http://localhost:3000/api/exams', payload, { headers: { Authorization: `Bearer ${token}` } });
            // Setelah axios.post berhasil membuat ujian...
            Swal.fire({
                icon: 'success',
                title: 'Ujian Diterbitkan!',
                html: `Sesi ujian berhasil dibuat.<br><b>Token Ujian:</b> akan di-generate oleh sistem.`,
                confirmButtonColor: '#0f4c3a'
            }); 
            setFormExam({ matakuliah_id: '', nama_ujian: '', waktu_mulai: '', waktu_selesai: '', durasi: 90 });
            fetchExams();
        } catch (error) {
            console.error("Gagal Menerbitkan:", error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menerbitkan!',
                text: 'Terjadi kesalahan saat menerbitkan ujian. Pastikan Backend sudah diperbarui!',
                confirmButtonColor: '#0f4c3a'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
            <div className="mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Penerbitan Jadwal Ujian</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Atur parameter dan rilis sesi ujian akademik untuk mahasiswa.</p>
            </div>

            {/* FORM PENERBITAN */}
            <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-[#0f4c3a]/10 rounded-lg">
                        <svg className="w-5 h-5 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">Form Rilis Ujian Baru</h3>
                </div>

                <form onSubmit={handleTerbitkan} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Pilih Mata Kuliah</label>
                            <select required value={formExam.matakuliah_id} onChange={e => setFormExam({...formExam, matakuliah_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all">
                                <option value="" disabled>-- Pilih Mata Kuliah --</option>
                                
                                {/* 🌟 PERBAIKAN: Gunakan mk.kode_mk sebagai value jika mk.id tidak ada! */}
                                {matkulList.map((mk, index) => (
                                    <option key={mk.id || mk.kode_mk || index} value={mk.id || mk.kode_mk}>
                                        {mk.kode_mk} - {mk.nama_mk}
                                    </option>
                                ))}
                                
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Sesi Ujian</label>
                            <input type="text" required value={formExam.nama_ujian} onChange={e => setFormExam({...formExam, nama_ujian: e.target.value})} placeholder="Misal: Ujian Tengah Semester (UTS)" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Waktu Mulai Akses</label>
                            <input type="datetime-local" required value={formExam.waktu_mulai} onChange={e => setFormExam({...formExam, waktu_mulai: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Waktu Tutup Akses</label>
                            <input type="datetime-local" required value={formExam.waktu_selesai} onChange={e => setFormExam({...formExam, waktu_selesai: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Durasi Pengerjaan</label>
                            <div className="relative">
                                <input type="number" required min="10" value={formExam.durasi} onChange={e => setFormExam({...formExam, durasi: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all pr-16" />
                                <span className="absolute right-5 top-3.5 text-[12px] font-black text-slate-400">Menit</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl text-[13px] font-black text-white bg-gradient-to-r from-[#0f4c3a] to-[#16654e] hover:from-[#092e23] hover:to-[#0f4c3a] shadow-lg shadow-[#0f4c3a]/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                            {isLoading ? 'Menerbitkan...' : 'Rilis Sesi Ujian Sekarang'}
                        </button>
                    </div>
                </form>
            </div>

            {/* TABEL JADWAL UJIAN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden mt-10">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-[14px] font-black text-slate-800 tracking-tight">Daftar Ujian Aktif</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest w-12">No</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Ujian</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Waktu Pelaksanaan</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Durasi</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi Token</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {examList.length === 0 ? (
                                <tr><td colSpan="5" className="py-10 text-center text-slate-400 font-bold text-sm">Belum ada ujian yang diterbitkan.</td></tr>
                            ) : (
                                examList.map((ex, idx) => (
                                    <tr key={ex.id || `exam-${idx}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-5 px-8 text-[14px] font-black text-slate-400">{idx + 1}</td>
                                        <td className="py-5 px-8">
                                            <p className="text-[14px] font-bold text-slate-800">{ex.nama_ujian}</p>
                                            <p className="text-[11px] font-semibold text-[#0f4c3a] uppercase tracking-wider">{ex.mata_kuliah?.nama_mk}</p>                                        </td>
                                        <td className="py-5 px-8">
                                            <p className="text-[12px] font-semibold text-slate-600">Mulai: {new Date(ex.waktu_mulai).toLocaleString('id-ID')}</p>
                                            <p className="text-[12px] font-semibold text-slate-600">Selesai: {new Date(ex.waktu_selesai).toLocaleString('id-ID')}</p>
                                        </td>
                                        <td className="py-5 px-8 text-center text-[13px] font-black text-amber-600">{ex.durasi} Menit</td>
                                        <td className="py-5 px-8 text-right">
                                            <span className="inline-block bg-slate-100 border border-slate-200 text-slate-800 px-4 py-2 rounded-lg text-[13px] font-mono font-black tracking-[0.2em]">{ex.token_ujian || 'XXXXXX'}</span>
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