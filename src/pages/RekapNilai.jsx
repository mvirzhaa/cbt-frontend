import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import examService from '../services/exam.service';
import gradingService from '../services/grading.service';

export default function RekapNilai() {
    // State Master Data
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);
    
    // State Filter (2 Tingkat)
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    
    // State Data Tabel & Ujian
    const [scores, setScores] = useState([]);
    const [examInfo, setExamInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    // State Modal Verifikasi
    const [verifyModal, setVerifyModal] = useState({
        isOpen: false,
        attempt: null,
        scores: { pilgan: 0, esai: 0, file: 0 }
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [resMatkul, resExams] = await Promise.all([
                matkulService.getMatkul(),
                examService.getExams()
            ]);
            
            setMatkulList(resMatkul || []);
            setAllExams(resExams || []);
        } catch (error) { 
            console.error("Gagal menarik data awal:", error); 
        }
    };

    const handleMatkulChange = (e) => {
        const mkId = e.target.value;
        setSelectedMatkul(mkId);
        
        const examsForThisMatkul = allExams?.data?.filter(ex => ex.kode_mk === mkId) || [];
        setFilteredExams(examsForThisMatkul);
        
        setSelectedExam('');
        setScores([]);
        setExamInfo(null);
    };

    const handleExamChange = async (e) => {
        const examId = e.target.value;
        setSelectedExam(examId);
        if (!examId) return;
        fetchAttemptsData(examId);
    };

    const fetchAttemptsData = async (examId) => {
        setLoading(true);
        try {
            const responseData = await gradingService.getAttempts(examId);
            setScores(responseData.data || responseData || []);
            setExamInfo(responseData.exam_info || null);
        } catch (error) { 
            console.error("Gagal menarik rincian nilai:", error); 
            Swal.fire('Error', 'Gagal memuat data nilai ujian ini.', 'error');
        } finally { 
            setLoading(false); 
        }
    };

    const handleExportExcel = () => {
        if (scores.length === 0) return Swal.fire('Data Kosong', 'Tidak ada data nilai untuk diekspor.', 'warning');

        const dataToExport = scores.map((s, index) => ({
            "No": index + 1,
            "NIM": s.nim,
            "Nama Mahasiswa": s.nama_mahasiswa,
            "Skor Pilihan Ganda (100)": Math.round(s.skor_pilgan_100),
            "Skor Esai AI (100)": Math.round(s.skor_esai_100),
            "Skor Upload (100)": Math.round(s.skor_file_100),
            "Total Nilai Akhir": s.final_score !== null ? Math.round(s.final_score) : 'Menunggu',
            "Status Evaluasi": s.status === 'SELESAI' ? 'Final' : 'Menunggu Verifikasi'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian_Nilai_CBT");

        const mkName = matkulList?.data?.find(m => m.kode_mk === selectedMatkul)?.nama_mk || 'Matkul';
        const examName = allExams?.data?.find(e => e.id.toString() === selectedExam)?.nama_ujian || 'Ujian';
        XLSX.writeFile(workbook, `Rekap_${mkName}_${examName}.xlsx`);
    };

    const openVerifyModal = (attempt) => {
        setVerifyModal({
            isOpen: true,
            attempt: attempt,
            scores: {
                pilgan: attempt.skor_pilgan_100,
                esai: attempt.skor_esai_100,
                file: attempt.skor_file_100
            }
        });
    };

    const closeVerifyModal = () => {
        setVerifyModal({ isOpen: false, attempt: null, scores: { pilgan: 0, esai: 0, file: 0 } });
    };

    const handleScoreChange = (type, value) => {
        let num = parseFloat(value);
        if (isNaN(num)) num = 0;
        if (num > 100) num = 100;
        if (num < 0) num = 0;
        setVerifyModal(prev => ({
            ...prev,
            scores: { ...prev.scores, [type]: num }
        }));
    };

    const submitVerification = async () => {
        try {
            const payload = {
                skor_pilgan_100: verifyModal.scores.pilgan,
                skor_esai_100: verifyModal.scores.esai,
                skor_file_100: verifyModal.scores.file
            };

            await gradingService.verifyExamAttempt(verifyModal.attempt.attempt_id, payload);

            Swal.fire({
                icon: 'success',
                title: 'Verifikasi Berhasil!',
                text: 'Nilai telah dipublikasikan ke mahasiswa.',
                timer: 1500,
                showConfirmButton: false
            });

            closeVerifyModal();
            fetchAttemptsData(selectedExam);
        } catch (error) {
            console.error("Gagal verifikasi:", error);
            Swal.fire('Error', 'Terjadi kesalahan saat memverifikasi nilai.', 'error');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 pb-10">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rekap Rincian Nilai & Verifikasi</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Verifikasi hasil ujian mahasiswa, override skor AI jika diperlukan, dan unduh laporan.</p>
                </div>
                
                <button onClick={handleExportExcel} disabled={scores.length === 0} className={`px-6 py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 ${scores.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/30'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    Export ke Excel
                </button>
            </div>

            {/* FILTER 2 TINGKAT */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Saring Mata Kuliah
                    </label>
                    <select value={selectedMatkul} onChange={handleMatkulChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none">
                        <option value="" disabled>-- Pilih Mata Kuliah Terlebih Dahulu --</option>
                        {matkulList?.data?.map(mk => (
                            <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 relative z-10">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Pilih Sesi Ujian
                    </label>
                    <select value={selectedExam} onChange={handleExamChange} disabled={!selectedMatkul || (!filteredExams?.data || filteredExams.data.length === 0)} className={`w-full px-5 py-4 border rounded-xl text-[13px] font-bold outline-none transition-all appearance-none ${!selectedMatkul ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer'}`}>
                        <option value="" disabled>
                            {!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : (!filteredExams?.data || filteredExams.data.length === 0) ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --"}
                        </option>
                        {filteredExams?.data?.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.nama_ujian} (Durasi: {ex.durasi} Menit)</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* INFORMASI BOBOT */}
            {examInfo && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 text-sm font-medium text-blue-800 items-center">
                    <span className="text-xl">⚖️</span>
                    <p>
                        <strong>Bobot Ujian:</strong> Pilihan Ganda ({examInfo.bobot_pilgan}%) | Esai ({examInfo.bobot_esai}%) | Upload ({examInfo.bobot_upload}%)
                    </p>
                </div>
            )}

            {/* TABEL RINCIAN NILAI */}
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest">Detail Buku Nilai</h3>
                    <span className="bg-[#0f4c3a]/10 text-[#0f4c3a] text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-[#0f4c3a]/20">Peserta: {scores.length}</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mahasiswa</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pilgan<br/>(0-100)</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Esai AI<br/>(0-100)</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Upload<br/>(0-100)</th>
                                <th className="py-5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-5 px-6 text-[10px] font-black text-[#0f4c3a] uppercase tracking-widest text-center bg-[#0f4c3a]/5">Total Akhir</th>
                                <th className="py-5 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="py-16 text-center text-slate-400 font-bold animate-pulse">Memuat data...</td></tr>
                            ) : !selectedExam ? (
                                <tr><td colSpan="7" className="py-20 text-center text-slate-400 font-bold text-sm">Silakan pilih Sesi Ujian pada filter di atas untuk melihat rincian.</td></tr>
                            ) : scores.length === 0 ? (
                                <tr><td colSpan="7" className="py-20 text-center text-slate-400 font-bold text-sm">Belum ada mahasiswa yang mengumpulkan ujian ini.</td></tr>
                            ) : (
                                scores.map((score, index) => (
                                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6">
                                            <p className="font-black text-slate-800 text-[13px]">{score.nama_mahasiswa}</p>
                                            <p className="text-xs text-slate-500 font-medium">{score.nim}</p>
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {Math.round(score.skor_pilgan_100)}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {Math.round(score.skor_esai_100)}
                                        </td>
                                        <td className="py-4 px-4 text-center font-bold text-slate-600 text-[13px]">
                                            {Math.round(score.skor_file_100)}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {score.status === 'SELESAI' ? (
                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Final</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center bg-[#0f4c3a]/[0.02]">
                                            <span className={`text-xl font-black tracking-tight ${score.status === 'SELESAI' ? 'text-[#0f4c3a]' : 'text-slate-400'}`}>
                                                {score.final_score !== null ? Math.round(score.final_score) : '-'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button 
                                                onClick={() => openVerifyModal(score)}
                                                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${score.status === 'SELESAI' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
                                            >
                                                {score.status === 'SELESAI' ? 'Edit Nilai' : 'Verifikasi'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL VERIFIKASI */}
            <AnimatePresence>
                {verifyModal.isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h4 className="font-black text-slate-800">Verifikasi Nilai Mahasiswa</h4>
                                <button onClick={closeVerifyModal} className="text-slate-400 hover:text-slate-600 p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            
                            <div className="p-6 space-y-5">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-black">
                                        {verifyModal.attempt?.nama_mahasiswa?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{verifyModal.attempt?.nama_mahasiswa}</p>
                                        <p className="text-xs font-medium text-slate-500">{verifyModal.attempt?.nim}</p>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    Anda dapat menyesuaikan skor di bawah ini sebelum mempublikasikan nilai akhir. Skor dihitung dalam skala 0 - 100.
                                </p>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Pilgan ({examInfo?.bobot_pilgan}%)</label>
                                        <input 
                                            type="number" 
                                            min="0" max="100"
                                            value={verifyModal.scores.pilgan}
                                            onChange={(e) => handleScoreChange('pilgan', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Esai AI ({examInfo?.bobot_esai}%)</label>
                                        <input 
                                            type="number" 
                                            min="0" max="100"
                                            value={verifyModal.scores.esai}
                                            onChange={(e) => handleScoreChange('esai', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Upload ({examInfo?.bobot_upload}%)</label>
                                        <input 
                                            type="number" 
                                            min="0" max="100"
                                            value={verifyModal.scores.file}
                                            onChange={(e) => handleScoreChange('file', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                
                                {/* Live Preview Total Score */}
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center mt-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Estimasi Total Akhir:</span>
                                    <span className="text-xl font-black text-[#0f4c3a]">
                                        {Math.round(
                                            (verifyModal.scores.pilgan * ((examInfo?.bobot_pilgan || 0) / 100)) +
                                            (verifyModal.scores.esai * ((examInfo?.bobot_esai || 0) / 100)) +
                                            (verifyModal.scores.file * ((examInfo?.bobot_upload || 0) / 100))
                                        )}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={closeVerifyModal} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Batal
                                </button>
                                <button onClick={submitVerification} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
                                    Verifikasi & Publish
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}