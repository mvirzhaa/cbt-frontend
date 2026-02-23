import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config/api';

export default function Grading() {
    const backendFileBaseUrl = API_BASE_URL.replace(/\/+$/, '');
    // State Master Data
    const [matkulList, setMatkulList] = useState([]);
    const [allExams, setAllExams] = useState([]);
    
    // State Filter (2 Tingkat)
    const [selectedMatkul, setSelectedMatkul] = useState('');
    const [filteredExams, setFilteredExams] = useState([]); 
    const [selectedExam, setSelectedExam] = useState('');
    
    // State Eksekusi
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputScores, setInputScores] = useState({}); 

    // 1. Tarik Data Awal (Matkul & Ujian)
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { headers: { Authorization: `Bearer ${token}` } };
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

    // 2. Jika Matkul dipilih, saring Ujiannya
    const handleMatkulChange = (e) => {
        const mkId = e.target.value;
        setSelectedMatkul(mkId);
        
        const examsForThisMatkul = allExams.filter(ex => ex.kode_mk === mkId);
        setFilteredExams(examsForThisMatkul);
        
        setSelectedExam('');
        setAnswers([]); // Reset daftar jawaban
    };

    // 3. Jika Ujian dipilih, tarik daftar jawabannya
    const handleExamChange = async (e) => {
        const examId = e.target.value;
        setSelectedExam(examId);
        
        if (!examId) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/grading/exams/${examId}/answers`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setAnswers(res.data.data || []);
        } catch (error) { 
            console.error("Gagal menarik jawaban", error); 
        } finally { 
            setLoading(false); 
        }
    };

    // 4. Simpan Nilai Manual
    const handleSaveScore = async (responseId, bobotMaksimal) => {
        const skorBaru = inputScores[responseId];
        
        if (skorBaru === undefined || skorBaru === '') return Swal.fire('Oops', 'Masukkan nilai terlebih dahulu!', 'warning');
        if (parseFloat(skorBaru) > parseFloat(bobotMaksimal)) return Swal.fire('Ditolak', `Skor tidak boleh melebihi bobot maksimal (${bobotMaksimal})!`, 'error');

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/grading/responses/${responseId}/score`, { skor: skorBaru }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nilai dikunci!', showConfirmButton: false, timer: 1500 });
            
            // Hapus kartu jawaban dari daftar agar Dosen bisa lanjut ke jawaban berikutnya
            setAnswers(prev => prev.filter(ans => ans.id !== responseId));
        } catch (error) {
            Swal.fire('Gagal', 'Tidak dapat menyimpan nilai ke server', 'error');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8 pb-12">
            
            {/* 🌟 HEADER HALAMAN */}
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Penilaian Manual & Evaluasi</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">Verifikasi hasil penjabaran mahasiswa (Esai) dan berikan skor pada dokumen (Tugas Upload) yang memerlukan tinjauan langsung oleh Dosen.</p>
            </div>

            {/* 🌟 FILTER 2 TINGKAT (SAMA SEPERTI REKAP NILAI) */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
                
                {/* Kotak 1: Pilih Matkul */}
                <div className="flex-1 relative z-10">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Filter Mata Kuliah
                    </label>
                    <select value={selectedMatkul} onChange={handleMatkulChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer appearance-none shadow-sm">
                        <option value="" disabled>-- Pilih Mata Kuliah Terlebih Dahulu --</option>
                        {matkulList.map(mk => (
                            <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                        ))}
                    </select>
                </div>

                {/* Kotak 2: Pilih Ujian */}
                <div className="flex-1 relative z-10">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-5 h-5 bg-[#0f4c3a]/10 text-[#0f4c3a] rounded-full flex items-center justify-center text-[10px]">2</span>
                        Pilih Lembar Sesi Ujian
                    </label>
                    <select value={selectedExam} onChange={handleExamChange} disabled={!selectedMatkul || filteredExams.length === 0} className={`w-full px-5 py-4 border rounded-xl text-[14px] font-bold outline-none transition-all appearance-none shadow-sm ${!selectedMatkul ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10 cursor-pointer'}`}>
                        <option value="" disabled>
                            {!selectedMatkul ? "Pilih Matkul di samping dulu ➔" : filteredExams.length === 0 ? "Belum ada sesi ujian di matkul ini" : "-- Pilih Sesi Ujian --"}
                        </option>
                        {filteredExams.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.nama_ujian} (Durasi: {ex.durasi} Menit)</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 🌟 KUMPULAN KARTU JAWABAN MAHASISWA */}
            {selectedExam && (
                <div className="space-y-8">
                    {/* Header Kecil Indikator Jumlah */}
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">
                            Menunggu Dikoreksi: <span className="text-blue-600 ml-1">{answers.length} Lembar</span>
                        </h4>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-4 border-[#0f4c3a]/20 border-t-[#0f4c3a] rounded-full animate-spin"></div>
                        </div>
                    ) : answers.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 p-16 rounded-3xl text-center shadow-sm">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h4 className="text-xl font-black text-slate-800 tracking-tight">Koreksi Tuntas!</h4>
                            <p className="text-slate-500 text-[14px] mt-2 font-medium">Tidak ada lagi lembar jawaban mahasiswa yang menunggu penilaian manual di sesi ini.</p>
                        </div>
                    ) : (
                        answers.map((ans) => {
                            // Asumsi bobot default jika tidak disetel adalah 10
                            const maxScore = ans.questions?.bobot_nilai || 10;
                            
                            return (
                                <div key={ans.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden relative group hover:border-[#0f4c3a]/30 transition-all">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#d4af37] to-amber-500"></div>
                                    
                                    <div className="p-8 md:p-10 flex flex-col md:flex-row gap-10">
                                        
                                        {/* Kiri: Identitas & Isi Jawaban */}
                                        <div className="flex-[2.5] space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-lg border border-slate-200">
                                                        {ans.users?.nama?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[16px] font-black text-slate-800">{ans.users?.nama}</h4>
                                                        <span className="inline-flex mt-1 items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-blue-100">
                                                            Mahasiswa Ujian
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Pertanyaan / Instruksi
                                                </p>
                                                <p className="text-[15px] font-semibold text-slate-700 leading-relaxed">{ans.questions?.isi_soal}</p>
                                            </div>
                                            
                                            <div>
                                                <p className="text-[10px] font-black text-[#0f4c3a] uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    Penyelesaian Mahasiswa
                                                </p>
                                                {ans.questions?.tipe_soal === 'TIPE_4' && ans.file_path ? (
                                                    <div className="p-6 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-slate-800">Dokumen Terlampir</p>
                                                                <p className="text-[11px] font-medium text-slate-500">Klik tombol di samping untuk melihat file.</p>
                                                            </div>
                                                        </div>
                                                        <a href={`${backendFileBaseUrl}/${String(ans.file_path || '').replace(/^\/+/, '')}`} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                                            Lihat File
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-[15px] font-medium text-slate-800 leading-loose whitespace-pre-wrap">
                                                        {ans.jawaban_teks || <span className="text-slate-400 italic">Peserta tidak mengisi kolom teks.</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Kanan: Alat Eksekusi Nilai */}
                                        <div className="flex-1 bg-gradient-to-b from-[#0f4c3a] to-[#0a3628] rounded-2xl p-8 flex flex-col justify-center text-center shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none"></div>
                                            
                                            <label className="block text-[11px] font-black text-emerald-300 uppercase tracking-widest mb-4">Skor Final Dosen</label>
                                            
                                            <div className="flex flex-col items-center justify-center gap-3 mb-8 relative z-10">
                                                <input 
                                                    type="number" min="0" max={maxScore} 
                                                    value={inputScores[ans.id] || ''} 
                                                    onChange={(e) => setInputScores({...inputScores, [ans.id]: e.target.value})}
                                                    className="w-full max-w-[140px] text-center text-5xl font-black text-slate-800 px-2 py-4 bg-white border-4 border-[#d4af37] rounded-2xl focus:border-emerald-400 focus:ring-0 outline-none transition-colors shadow-inner"
                                                    placeholder="0"
                                                />
                                                <div className="bg-black/20 px-4 py-1.5 rounded-full border border-white/10">
                                                    <span className="text-[11px] font-black text-emerald-100 uppercase tracking-widest">Batas Maks: {maxScore}</span>
                                                </div>
                                            </div>
                                            
                                            <button onClick={() => handleSaveScore(ans.id, maxScore)} className="w-full px-6 py-4 bg-[#d4af37] hover:bg-[#b5952f] text-[#0f4c3a] font-black text-[13px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 flex items-center justify-center gap-2 relative z-10">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                Kunci Nilai
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </motion.div>
    );
}
