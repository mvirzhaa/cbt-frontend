import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function CreateExam() {
    const [isLoading, setIsLoading] = useState(false);
    const [matkulList, setMatkulList] = useState([]);
    const [examList, setExamList] = useState([]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [activeTab, setActiveTab] = useState('aktif'); 

    // 🌟 STATE BARU: DITAMBAH 3 BOBOT PENILAIAN
    const [formExam, setFormExam] = useState({
        kode_mk: '',
        nama_ujian: '',
        waktu_mulai: '',
        waktu_selesai: '',
        durasi: 90,
        bobot_pilgan: 100, // Default Pilgan 100%
        bobot_esai: 0,
        bobot_upload: 0
    });

    const formRef = useRef(null);

    // Hitung total persentase secara real-time
    const totalPersentase = parseInt(formExam.bobot_pilgan || 0) + parseInt(formExam.bobot_esai || 0) + parseInt(formExam.bobot_upload || 0);

    useEffect(() => {
        fetchMatkul();
        fetchExams();
    }, []);

    const fetchMatkul = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('https://u-talent.uika-bogor.ac.id/cbt-api/api/matakuliah', { headers: { Authorization: `Bearer ${token}` } });
            setMatkulList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data matkul", error); }
    };

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('https://u-talent.uika-bogor.ac.id/cbt-api/api/exams', { headers: { Authorization: `Bearer ${token}` } });
            setExamList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data ujian", error); }
    };

    const formatToDatetimeLocal = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const offset = d.getTimezoneOffset() * 60000; 
        return (new Date(d.getTime() - offset)).toISOString().slice(0,16);
    };

    const handleSimpanUjian = async (e) => {
        e.preventDefault();
        
        // 🌟 BENTENG VALIDASI: Total Harus 100%
        if (totalPersentase !== 100) {
            return Swal.fire('Distribusi Nilai Salah', `Total Persentase Penilaian harus tepat 100%. Saat ini totalnya: ${totalPersentase}%`, 'warning');
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                kode_mk: formExam.kode_mk,
                nama_ujian: formExam.nama_ujian,
                waktu_mulai: formExam.waktu_mulai,
                waktu_selesai: formExam.waktu_selesai,
                durasi: parseInt(formExam.durasi),
                bobot_pilgan: parseInt(formExam.bobot_pilgan),
                bobot_esai: parseInt(formExam.bobot_esai),
                bobot_upload: parseInt(formExam.bobot_upload)
            };

            if (isEditing) {
                await axios.put(`https://u-talent.uika-bogor.ac.id/cbt-api/api/exams/${editId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Perubahan Disimpan!', showConfirmButton: false, timer: 2000 });
            } else {
                await axios.post('https://u-talent.uika-bogor.ac.id/cbt-api/api/exams', payload, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire({ icon: 'success', title: 'Sesi Ujian Diterbitkan!', text: `Sistem berhasil men-generate Token Ujian unik.`, confirmButtonColor: '#0f4c3a' });
            }
            resetForm();
            fetchExams();
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Pastikan semua kolom terisi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (exam) => {
        setFormExam({
            kode_mk: exam.kode_mk,
            nama_ujian: exam.nama_ujian,
            waktu_mulai: formatToDatetimeLocal(exam.waktu_mulai),
            waktu_selesai: formatToDatetimeLocal(exam.waktu_selesai),
            durasi: exam.durasi,
            bobot_pilgan: exam.bobot_pilgan ?? 100, // Ambil dari DB
            bobot_esai: exam.bobot_esai ?? 0,
            bobot_upload: exam.bobot_upload ?? 0
        });
        setIsEditing(true);
        setEditId(exam.id);
        if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleHapusClick = async (examId, namaUjian) => {
        const result = await Swal.fire({
            title: 'Yakin Hapus Ujian?',
            html: `Anda akan mencoba melenyapkan <b>${namaUjian}</b>.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Ya, Eksekusi!', reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`https://u-talent.uika-bogor.ac.id/cbt-api/api/exams/${examId}`, { headers: { Authorization: `Bearer ${token}` } });
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ujian terhapus.', showConfirmButton: false, timer: 2000 });
                fetchExams();
                if (editId === examId) resetForm();
            } catch (error) {
                Swal.fire('Penghapusan Ditolak', error.response?.data?.message || 'Terjadi kesalahan sistem.', 'error');
            }
        }
    };

    const resetForm = () => {
        setFormExam({ kode_mk: '', nama_ujian: '', waktu_mulai: '', waktu_selesai: '', durasi: 90, bobot_pilgan: 100, bobot_esai: 0, bobot_upload: 0 });
        setIsEditing(false);
        setEditId(null);
    };

    const handleCopyToken = (tokenKode) => {
        navigator.clipboard.writeText(tokenKode);
        Swal.fire({ toast: true, position: 'bottom-end', icon: 'success', title: 'Token Disalin!', showConfirmButton: false, timer: 1500 });
    };

    const now = new Date();
    const activeExams = examList.filter(ex => new Date(ex.waktu_selesai) > now);
    const archivedExams = examList.filter(ex => new Date(ex.waktu_selesai) <= now);
    const displayedExams = activeTab === 'aktif' ? activeExams : archivedExams;

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-12">
            
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Sesi Ujian</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">Terbitkan jadwal, atur persentase nilai, dan awasi status sesi ujian. Ujian yang telah lewat batas waktu akan otomatis masuk ke Arsip.</p>
            </div>

            <div ref={formRef} className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border relative overflow-hidden transition-colors duration-500 ${isEditing ? 'border-amber-300' : 'border-slate-100'}`}>
                <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 transition-colors duration-500 ${isEditing ? 'bg-amber-100/50' : 'bg-[#0f4c3a]/5'}`}></div>
                {isEditing && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>}
                
                <div className="px-8 md:px-10 py-6 border-b border-slate-100/50 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isEditing ? 'bg-amber-50 text-amber-600' : 'bg-[#0f4c3a]/10 text-[#0f4c3a]'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h3 className={`text-[15px] font-black uppercase tracking-widest ${isEditing ? 'text-amber-800' : 'text-slate-800'}`}>
                                {isEditing ? 'Mode Edit Sesi Ujian' : 'Form Rilis Ujian Baru'}
                            </h3>
                        </div>
                    </div>
                    {isEditing && (
                        <button type="button" onClick={resetForm} className="text-[11px] font-black text-slate-500 hover:text-slate-800 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-lg transition-colors">Batal Edit</button>
                    )}
                </div>

                <form onSubmit={handleSimpanUjian} className="p-8 md:p-10 space-y-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">A. Pemilihan Mata Kuliah</label>
                            <select required value={formExam.kode_mk} onChange={e => setFormExam({...formExam, kode_mk: e.target.value})} className="w-full px-5 py-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px] transition-all cursor-pointer appearance-none shadow-sm">
                                <option value="" disabled>-- Pilih Mata Kuliah --</option>
                                {matkulList.map((mk) => (
                                    <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">B. Label Sesi Ujian</label>
                            <input type="text" required value={formExam.nama_ujian} onChange={e => setFormExam({...formExam, nama_ujian: e.target.value})} placeholder="Misal: Ujian Tengah Semester (UTS)" className="w-full px-5 py-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px] transition-all shadow-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Waktu Buka Gerbang</label>
                            <input type="datetime-local" required value={formExam.waktu_mulai} onChange={e => setFormExam({...formExam, waktu_mulai: e.target.value})} className="w-full px-5 py-3.5 bg-white rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#0f4c3a]/10 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Waktu Tutup Gerbang</label>
                            <input type="datetime-local" required value={formExam.waktu_selesai} onChange={e => setFormExam({...formExam, waktu_selesai: e.target.value})} className="w-full px-5 py-3.5 bg-white rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#0f4c3a]/10 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Durasi Total Pengerjaan</label>
                            <div className="relative">
                                <input type="number" required min="10" value={formExam.durasi} onChange={e => setFormExam({...formExam, durasi: e.target.value})} className="w-full px-5 py-3.5 bg-white rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#0f4c3a]/10 focus:border-[#0f4c3a] outline-none font-bold text-[#0f4c3a] text-[15px] transition-all pr-16 shadow-sm" />
                                <span className="absolute right-5 top-4 text-[11px] font-black text-slate-400 uppercase">Menit</span>
                            </div>
                        </div>
                    </div>

                    {/* 🌟 DISTRIBUSI BOBOT NILAI (CUSTOM FORMULA) */}
                    <div className="p-6 md:p-8 rounded-2xl border-2 border-blue-100 bg-blue-50/30">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h4 className="text-[13px] font-black text-blue-800 uppercase tracking-widest">C. Distribusi Persentase Penilaian (%)</h4>
                                <p className="text-[11px] font-medium text-slate-500 mt-1">Atur persentase bobot masing-masing kategori terhadap Nilai Akhir.</p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[13px] font-black border-2 transition-colors ${totalPersentase === 100 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-600 border-red-300 animate-pulse'}`}>
                                Total: {totalPersentase}%
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-2">Bobot Pilihan Ganda</label>
                                <div className="relative">
                                    <input type="number" min="0" max="100" value={formExam.bobot_pilgan} onChange={e => setFormExam({...formExam, bobot_pilgan: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]" />
                                    <span className="absolute right-4 top-3.5 text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-2">Bobot Uraian Esai (AI)</label>
                                <div className="relative">
                                    <input type="number" min="0" max="100" value={formExam.bobot_esai} onChange={e => setFormExam({...formExam, bobot_esai: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]" />
                                    <span className="absolute right-4 top-3.5 text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-2">Bobot Unggah Dokumen</label>
                                <div className="relative">
                                    <input type="number" min="0" max="100" value={formExam.bobot_upload} onChange={e => setFormExam({...formExam, bobot_upload: e.target.value})} className="w-full px-5 py-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px]" />
                                    <span className="absolute right-4 top-3.5 text-slate-400 font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={isLoading} className={`px-10 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 w-full md:w-auto ${isEditing ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-gradient-to-r from-[#0f4c3a] to-[#16654e] hover:from-[#092e23] hover:to-[#0f4c3a] text-[#d4af37] shadow-[#0f4c3a]/30'}`}>
                            {isLoading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan Jadwal' : 'Rilis Ujian & Generate Token'}
                        </button>
                    </div>
                </form>
            </div>

            {/* TABEL DENGAN SISTEM TAB (AKTIF vs ARSIP) */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex bg-slate-200/50 p-1.5 rounded-xl">
                        <button onClick={() => setActiveTab('aktif')} className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'aktif' ? 'bg-white text-[#0f4c3a] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                            Ujian Aktif ({activeExams.length})
                        </button>
                        <button onClick={() => setActiveTab('arsip')} className={`px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'arsip' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                            Arsip Selesai ({archivedExams.length})
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesi & Mata Kuliah</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jadwal Pelaksanaan</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durasi & Bobot (%)</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Token</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedExams.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-16 text-center text-slate-400 font-bold text-[14px]">
                                        Tidak ada data di tab {activeTab === 'aktif' ? 'Ujian Aktif' : 'Arsip'}.
                                    </td>
                                </tr>
                            ) : (
                                displayedExams.map((ex) => {
                                    const isRowEditing = editId === ex.id;
                                    const isArchived = activeTab === 'arsip';

                                    return (
                                        <tr key={ex.id} className={`transition-colors group ${isRowEditing ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'} ${isArchived ? 'opacity-80' : ''}`}>
                                            <td className="py-5 px-8">
                                                <p className="text-[14px] font-black text-slate-800">{ex.nama_ujian}</p>
                                                <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{ex.kode_mk} • {ex.mata_kuliah?.nama_mk}</p>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600">Buka: {new Date(ex.waktu_mulai).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                                                    <span className={`inline-flex items-center gap-2 text-[11px] font-bold ${isArchived ? 'text-slate-600' : 'text-red-500'}`}>Tutup: {new Date(ex.waktu_selesai).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="bg-slate-100 text-slate-700 font-black text-[12px] px-3 py-1 rounded-lg border border-slate-200">{ex.durasi} Min</span>
                                                    <span className="text-[9px] font-bold text-slate-400">P:{ex.bobot_pilgan}% | E:{ex.bobot_esai}% | U:{ex.bobot_upload}%</span>
                                                </div>
                                            </td>
                                            
                                            <td className="py-5 px-6 text-center">
                                                {isArchived ? (
                                                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-md">KEDALUWARSA</span>
                                                ) : (
                                                    <button onClick={() => handleCopyToken(ex.token_ujian)} className="group/btn relative inline-flex items-center justify-center gap-2 bg-[#0f4c3a]/5 hover:bg-[#0f4c3a]/10 border border-[#0f4c3a]/20 text-[#0f4c3a] px-4 py-2 rounded-xl transition-all active:scale-95" title="Copy Token">
                                                        <span className="text-[14px] font-mono font-black tracking-[0.2em]">{ex.token_ujian}</span>
                                                    </button>
                                                )}
                                            </td>

                                            <td className="py-5 px-8 text-right space-x-2">
                                                {!isArchived && (
                                                    <button onClick={() => handleEditClick(ex)} className="inline-flex items-center justify-center w-8 h-8 text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-500 hover:text-white rounded-lg transition-colors shadow-sm" title="Edit Ujian">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                )}
                                                <button onClick={() => handleHapusClick(ex.id, ex.nama_ujian)} className="inline-flex items-center justify-center w-8 h-8 text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm" title="Hapus Ujian">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </motion.div>
    );
}