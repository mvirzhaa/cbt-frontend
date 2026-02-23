import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export default function RekapNilai() {
    // State Master Data
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);
    
    // State Filter (2 Tingkat)
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]); // Menyimpan ujian khusus matkul yg dipilih
    const [selectedExam, setSelectedExam] = useState('');
    
    // State Data Tabel
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Saat halaman dibuka, tarik Data Matkul & Data Ujian sekaligus
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { headers: { Authorization: `Bearer ${token}` } };
            
            // Tarik berbarengan agar cepat
            const [resMatkul, resExams] = await Promise.all([
                axios.get('/api/matakuliah', headers),
                axios.get('/api/exams', headers)
            ]);
            
            setMatkulList(resMatkul.data.data || []);
            setAllExams(resExams.data.data || []);
        } catch (error) { 
            console.error("Gagal menarik data awal:", error); 
        }
    };

    // 2. Jika Dosen memilih Mata Kuliah, saring daftar Ujiannya!
    const handleMatkulChange = (e) => {
        const mkId = e.target.value;
        setSelectedMatkul(mkId);
        
        // Saring: Hanya tampilkan ujian yang kode_mk nya sesuai
        const examsForThisMatkul = allExams.filter(ex => ex.kode_mk === mkId);
        setFilteredExams(examsForThisMatkul);
        
        // Reset pilihan ujian & tabel di bawahnya
        setSelectedExam('');
        setScores([]);
    };

    // 3. Jika Dosen memilih Sesi Ujian, barulah tarik Rincian Nilainya!
    const handleExamChange = async (e) => {
        const examId = e.target.value;
        setSelectedExam(examId);
        
        if (!examId) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Memanggil endpoint baru yang baru saja kita buat!
            const res = await axios.get(`/api/exams/${examId}/rekap-detail`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setScores(res.data.data || []);
        } catch (error) { 
            console.error("Gagal menarik rincian nilai:", error); 
            Swal.fire('Error', 'Gagal memuat data nilai ujian ini.', 'error');
        } finally { 
            setLoading(false); 
        }
    };

    // 🌟 FUNGSI SAKTI EXPORT KE EXCEL (DIPERBARUI)
    const handleExportExcel = () => {
        if (scores.length === 0) return Swal.fire('Data Kosong', 'Tidak ada data nilai untuk diekspor.', 'warning');

        // Menyusun rincian data ke format kolom Excel
        const dataToExport = scores.map((s, index) => ({
            "No": index + 1,
            "Nama Mahasiswa": s.nama_mahasiswa,
            "Skor Pilihan Ganda": Math.round(s.skor_pilgan),
            "Skor Esai (Otomatis AI)": Math.round(s.skor_esai),
            "Skor Upload (Manual)": Math.round(s.skor_upload),
            "Total Nilai Akhir": Math.round(s.total_skor),
            "Status Evaluasi": s.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian_Nilai_CBT");

        // Bikin nama file otomatis keren
        const mkName = matkulList.find(m => m.kode_mk === selectedMatkul)?.nama_mk || 'Matkul';
        const examName = allExams.find(e => e.id.toString() === selectedExam)?.nama_ujian || 'Ujian';
        XLSX.writeFile(workbook, `Rekap_${mkName}_${examName}.xlsx`);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rekap Rincian Nilai</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Pantau perolehan skor spesifik mahasiswa dan unduh laporan arsip nilai resmi.</p>
                </div>
                
                {/* TOMBOL EXCEL */}
                <button onClick={handleExportExcel} disabled={scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/30'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    Export ke Excel
                </button>
            </div>

            {/* 🌟 FILTER 2 TINGKAT (MATKUL -> UJIAN) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
                
                {/* TAHAP 1: Pilih Matkul */}
                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Saring Mata Kuliah
                    </label>
                    <select value={selectedMatkul} onChange={handleMatkulChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none">
                        <option value="" disabled>-- Pilih Mata Kuliah Terlebih Dahulu --</option>
                        {matkulList.map(mk => (
                            <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                        ))}
                    </select>
                </div>

                {/* TAHAP 2: Pilih Ujian (Hanya aktif jika Matkul sudah dipilih) */}
                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Pilih Sesi Ujian
                    </label>
                    <select value={selectedExam} onChange={handleExamChange} disabled={!selectedMatkul || filteredExams.length === 0} className={`w-full px-5 py-4 border rounded-xl text-[13px] font-bold outline-none transition-all appearance-none ${!selectedMatkul ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer'}`}>
                        <option value="" disabled>
                            {!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : filteredExams.length === 0 ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --"}
                        </option>
                        {filteredExams.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.nama_ujian} (Durasi: {ex.durasi} Menit)</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 🌟 TABEL RINCIAN NILAI BUKU BESAR */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Detail Buku Nilai</h3>
                    <span className="bg-[#0f4c3a]/10 text-[#0f4c3a] text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-[#0f4c3a]/20">Peserta: {scores.length}</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Identitas Mahasiswa</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pilgan</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Esai (AI)</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Upload</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-5 px-6 text-[10px] font-black text-[#0f4c3a] uppercase tracking-widest text-right bg-[#0f4c3a]/5">Total Akhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="py-16 text-center text-slate-400 font-bold animate-pulse">Mengkalkulasi Rincian Nilai AI...</td></tr>
                            ) : !selectedExam ? (
                                <tr><td colSpan="6" className="py-20 text-center"><p className="text-slate-400 font-bold text-sm">Silakan pilih Sesi Ujian pada filter di atas untuk melihat rincian.</p></td></tr>
                            ) : scores.length === 0 ? (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400 font-bold text-sm">Belum ada mahasiswa yang mengumpulkan ujian ini.</td></tr>
                            ) : (
                                scores.map((score, index) => (
                                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6 font-black text-slate-800 text-[13px] group-hover:text-blue-600 transition-colors">
                                            {score.nama_mahasiswa}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {Math.round(score.skor_pilgan)}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {Math.round(score.skor_esai)}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {Math.round(score.skor_upload)}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {score.status === 'Selesai' ? (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Final</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Evaluasi</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right bg-[#0f4c3a]/[0.02]">
                                            <span className={`text-2xl font-black tracking-tight ${score.status === 'Selesai' ? 'text-[#0f4c3a]' : 'text-slate-400'}`}>
                                                {Math.round(score.total_skor)}
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