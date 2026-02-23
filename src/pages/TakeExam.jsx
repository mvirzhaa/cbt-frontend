import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function TakeExam() {
    const navigate = useNavigate();
    
    // State Lobi
    const [token, setToken] = useState('');
    const [isExamStarted, setIsExamStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // State Data Ujian
    const [examData, setExamData] = useState(null);
    const [questions, setQuestions] = useState([]);
    
    // State Eksekusi (Teks & File)
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); 
    const [files, setFiles] = useState({}); // 🌟 STATE BARU UNTUK FILE UPLOAD
    const [timeLeft, setTimeLeft] = useState(0); 

    // =========================================================================
    // 📡 1. MASUK RUANG UJIAN
    // =========================================================================
    const handleMasukUjian = async (e) => {
        e.preventDefault();
        if (!token) return Swal.fire('Perhatian', 'Token ujian wajib diisi!', 'warning');
        
        setIsLoading(true);
        try {
            const authToken = localStorage.getItem('token');
            const res = await axios.post('/api/student/verify-token', { token }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            
            const data = res.data.data;
            setExamData(data.exam);
            setQuestions(data.questions);
            
            setTimeLeft((data.exam.durasi || 90) * 60);
            setIsExamStarted(true);
            
            Swal.fire({
                toast: true, position: 'top-end', icon: 'success',
                title: 'Token Valid! Semoga Berhasil.', showConfirmButton: false, timer: 2000
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: error.response?.data?.message || 'Token tidak valid.' });
        } finally {
            setIsLoading(false);
        }
    };

    // =========================================================================
    // ⏱️ 2. TIMER HITUNG MUNDUR & AUTO-SUBMIT
    // =========================================================================
    useEffect(() => {
        if (!isExamStarted || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleKumpulkanOtomatis(); 
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isExamStarted, timeLeft]);

    const formatWaktu = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // =========================================================================
    // 📝 3. MANAJEMEN JAWABAN & SUBMIT (TERMASUK FILE)
    // =========================================================================
    const handlePilihJawaban = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    // 🌟 FUNGSI KHUSUS MENANGKAP FILE UPLOAD
    const handlePilihFile = (questionId, file) => {
        if (file) {
            // Validasi ukuran max 5MB
            if (file.size > 5 * 1024 * 1024) {
                return Swal.fire('File Terlalu Besar', 'Maksimal ukuran file adalah 5MB.', 'warning');
            }
            setFiles(prev => ({ ...prev, [questionId]: file }));
            // Tandai juga di state answers agar kotak navigasi berubah jadi hijau (Sudah Dijawab)
            setAnswers(prev => ({ ...prev, [questionId]: "File terlampir" }));
        }
    };

    const handleKumpulkanOtomatis = async () => {
        Swal.fire({ icon: 'info', title: 'Waktu Habis!', text: 'Sistem sedang mengenkripsi dan menyimpan jawaban Anda...', showConfirmButton: false, allowOutsideClick: false });
        await submitKeBackend();
    };

    const handleKumpulkanManual = async () => {
        const dijawab = Object.keys(answers).filter(k => answers[k] && answers[k].trim() !== '').length;
        const total = questions.length;
        
        const result = await Swal.fire({
            title: 'Akhiri Ujian?',
            html: `Anda telah menjawab <b><span style="color:#10b981;font-size:20px;">${dijawab}</span></b> dari <b>${total}</b> soal.<br/><br/><span style="font-size:13px;color:#64748b;">Data yang telah dikumpulkan tidak dapat ditarik kembali.</span>`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#0f4c3a', cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Ya, Kumpulkan Final', cancelButtonText: 'Periksa Ulang', reverseButtons: true
        });

        if (result.isConfirmed) {
            Swal.fire({ title: 'Mengirim Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            await submitKeBackend();
        }
    };

    // 🌟 MENGGUNAKAN FORMDATA AGAR BISA MENGIRIM FILE + TEKS BERSAMAAN
    const submitKeBackend = async () => {
        try {
            const authToken = localStorage.getItem('token');
            const formData = new FormData();
            
            // Masukkan data dasar
            formData.append('exam_id', examData.id);
            formData.append('answers', JSON.stringify(answers));

            // Masukkan file satu per satu sesuai format yang diminta Backend (file_IDSOAL)
            Object.keys(files).forEach(qId => {
                if (files[qId]) {
                    formData.append(`file_${qId}`, files[qId]);
                }
            });

            await axios.post('/api/student/submit-exam', formData, {
                headers: { 
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data' // Wajib untuk pengiriman file
                }
            });
            
            Swal.fire({ icon: 'success', title: 'Evaluasi Selesai!', text: 'Jawaban dan Dokumen Anda berhasil direkam.', confirmButtonColor: '#0f4c3a' });
            navigate('/student-dashboard'); 
        } catch (error) {
            Swal.fire('Gagal Menyimpan', 'Terjadi gangguan jaringan saat mengirim data. Jangan tutup jendela ini, coba lagi!', 'error');
        }
    };

    // =========================================================================
    // 🎨 RENDER TAMPILAN
    // =========================================================================
    if (!isExamStarted) {
        return (
            <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 relative overflow-hidden -m-6 bg-slate-50">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[#0f4c3a]/5 to-[#d4af37]/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md w-full mx-auto relative z-10">
                    <div className="text-center mb-8">
                        <div className="mx-auto h-24 w-24 bg-gradient-to-br from-[#0f4c3a] to-[#092e23] rounded-3xl shadow-xl shadow-[#0f4c3a]/20 flex items-center justify-center mb-6 border-4 border-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
                            <svg className="w-12 h-12 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Otorisasi Sesi Ujian</h2>
                        <p className="mt-3 text-slate-500 font-medium text-[13px] px-4 leading-relaxed">Masukkan Token Akses Resmi 6 Digit yang diberikan oleh Dosen Pengawas untuk membuka naskah soal.</p>
                    </div>

                    <div className="bg-white py-10 px-8 shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 rounded-[2rem]">
                        <form onSubmit={handleMasukUjian} className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 mb-3 text-center uppercase tracking-widest">Token Keamanan CBT</label>
                                <input 
                                    type="text" required maxLength="6" value={token} onChange={e => setToken(e.target.value.toUpperCase())}
                                    className="block w-full px-4 py-5 bg-slate-50/50 border-2 border-slate-200 rounded-2xl text-center text-4xl font-black text-[#0f4c3a] tracking-[0.4em] uppercase placeholder-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0f4c3a]/10 focus:border-[#0f4c3a] transition-all shadow-inner"
                                    placeholder="XXXXXX" 
                                />
                            </div>

                            <button type="submit" disabled={isLoading || token.length < 5} className="w-full flex justify-center items-center py-4.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-[#0f4c3a]/20 text-[13px] font-black tracking-widest text-[#d4af37] bg-gradient-to-r from-[#0f4c3a] to-[#16654e] hover:from-[#092e23] hover:to-[#0f4c3a] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none uppercase">
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin"></div>
                                        Memverifikasi...
                                    </span>
                                ) : 'Buka Segel Naskah ➔'}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] -m-6 bg-slate-100 relative"> 
            
            {/* 🌟 HEADER MELAYANG EKSKLUSIF */}
            <div className="h-20 bg-white border-b border-slate-200 flex justify-between items-center px-8 shadow-sm sticky top-0 z-30">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-gradient-to-br from-[#0f4c3a] to-[#16654e] text-white rounded-xl shadow-md hidden sm:block">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div>
                        <h2 className="text-[16px] font-black text-slate-800 tracking-tight">{examData?.nama_ujian || 'Ujian CBT Resmi'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-blue-100">{examData?.kode_mk}</span>
                            <span className="text-[12px] font-semibold text-slate-500">{examData?.mata_kuliah?.nama_mk || 'Mata Kuliah Akademik'}</span>
                        </div>
                    </div>
                </div>
                
                {/* ⏱️ WIDGET TIMER KEKINIAN */}
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sisa Waktu</span>
                    <div className={`flex items-center gap-2 px-5 py-2 rounded-xl border-2 font-black text-2xl tracking-[0.1em] transition-colors shadow-inner ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-[#0f4c3a] border-slate-200'}`}>
                        <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {formatWaktu(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* 🌟 AREA NASKAH SOAL (KIRI - 75%) */}
                <div className="flex-[3] overflow-y-auto p-6 lg:p-10 relative">
                    <AnimatePresence mode="wait">
                        <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-200 min-h-full flex flex-col overflow-hidden">
                            
                            {/* Header Kartu Soal */}
                            <div className="bg-slate-50 border-b border-slate-100 px-10 py-6 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center font-black text-xl text-slate-800 shadow-sm">
                                        {currentIndex + 1}
                                    </div>
                                    <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">Dari {questions.length} Pertanyaan</h3>
                                </div>
                                <span className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                    Bobot: {currentQuestion.bobot_nilai || '10'}
                                </span>
                            </div>

                            <div className="px-10 py-8">
                                <div className="text-[17px] text-slate-800 font-medium leading-loose mb-10 whitespace-pre-wrap">
                                    {currentQuestion.isi_soal}
                                </div>

                                <div className="bg-white">
                                    
                                    {/* 🔘 PILIHAN GANDA */}
                                    {currentQuestion.tipe_soal === 'TIPE_1' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentQuestion.question_options?.map((opt) => {
                                                const isSelected = answers[currentQuestion.id] === opt.label_pilihan;
                                                return (
                                                    <label key={opt.id} className={`flex items-start gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 group ${isSelected ? 'bg-blue-50/50 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)] ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                                                        <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400 bg-white'}`}>
                                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                        </div>
                                                        <input type="radio" name={`soal-${currentQuestion.id}`} value={opt.label_pilihan} checked={isSelected} onChange={() => handlePilihJawaban(currentQuestion.id, opt.label_pilihan)} className="hidden" />
                                                        <div className="flex gap-2">
                                                            <span className={`font-black text-[16px] ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{opt.label_pilihan}.</span>
                                                            <span className={`text-[15px] leading-relaxed ${isSelected ? 'text-blue-900 font-semibold' : 'text-slate-700 font-medium'}`}>{opt.teks_pilihan}</span>
                                                        </div>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* ✍️ JAWABAN SINGKAT */}
                                    {currentQuestion.tipe_soal === 'TIPE_2' && (
                                        <div className="bg-blue-50/30 p-8 rounded-2xl border border-blue-100">
                                            <label className="block text-[12px] font-black text-blue-800 uppercase tracking-widest mb-4">Ketik Jawaban Singkat Anda:</label>
                                            <input type="text" value={answers[currentQuestion.id] || ''} onChange={(e) => handlePilihJawaban(currentQuestion.id, e.target.value)} className="w-full px-6 py-5 bg-white rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-[16px] font-bold text-slate-800 transition-all shadow-sm" placeholder="Masukkan kata kunci yang tepat..." />
                                        </div>
                                    )}

                                    {/* 📝 ESAI PANJANG (AI) */}
                                    {currentQuestion.tipe_soal === 'TIPE_3' && (
                                        <div className="h-full flex flex-col">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                    Lembar Uraian Esai
                                                </label>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Sistem Penilaian AI Aktif</span>
                                            </div>
                                            <textarea value={answers[currentQuestion.id] || ''} onChange={(e) => handlePilihJawaban(currentQuestion.id, e.target.value)} className="w-full min-h-[250px] px-6 py-5 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-[16px] font-medium text-slate-800 transition-all resize-none leading-loose shadow-inner" placeholder="Tuliskan uraian argumen Anda dengan bahasa yang jelas dan terstruktur..."></textarea>
                                        </div>
                                    )}

                                    {/* 📁 DESAIN UPLOAD FILE PREMIUM & FUNGSIONAL */}
                                    {currentQuestion.tipe_soal === 'TIPE_4' && (
                                        <div className={`p-10 border-2 border-dashed rounded-[2rem] text-center transition-all duration-300 ${files[currentQuestion.id] ? 'bg-emerald-50/50 border-emerald-400 shadow-sm' : 'bg-blue-50/30 border-blue-200 hover:bg-blue-50/60'}`}>
                                            
                                            {/* JIKA FILE SUDAH DIPILIH (TAMPILAN HIJAU) */}
                                            {files[currentQuestion.id] ? (
                                                <div className="space-y-5 flex flex-col items-center">
                                                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[18px] font-black text-slate-800">File Berhasil Dilampirkan</h4>
                                                        <p className="text-[13px] font-medium text-slate-500 mt-1">Dokumen Anda siap dikirim.</p>
                                                    </div>
                                                    <div className="bg-white px-6 py-3 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-3">
                                                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                                        <span className="text-[14px] font-bold text-slate-700">{files[currentQuestion.id].name}</span>
                                                    </div>
                                                    <label className="mt-2 inline-flex items-center justify-center px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[12px] font-black uppercase tracking-widest cursor-pointer transition-colors">
                                                        Ganti Dokumen
                                                        {/* TOMBOL ONCHANGE GANTI FILE */}
                                                        <input type="file" className="hidden" onChange={(e) => handlePilihFile(currentQuestion.id, e.target.files[0])} />
                                                    </label>
                                                </div>
                                            ) : (
                                                // JIKA FILE BELUM DIPILIH (TAMPILAN BIRU)
                                                <div className="space-y-5 flex flex-col items-center">
                                                    <div className="w-20 h-20 bg-white shadow-md rounded-full flex items-center justify-center border border-blue-50 text-blue-500">
                                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[18px] font-black text-slate-800">Unggah Lembar Jawaban</h4>
                                                        <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-sm mx-auto">Upload file PDF, JPG, PNG, atau ZIP. Ukuran maksimal yang diizinkan adalah 5MB.</p>
                                                    </div>
                                                    <label className="inline-flex items-center justify-center px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                                                        Pilih File Dari Perangkat
                                                        {/* TOMBOL ONCHANGE PILIH FILE PERTAMA */}
                                                        <input type="file" className="hidden" onChange={(e) => handlePilihFile(currentQuestion.id, e.target.files[0])} />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Bilah Navigasi Bawah */}
                            <div className="mt-auto px-10 py-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center rounded-b-[2rem]">
                                <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className={`px-8 py-4 rounded-xl text-[12px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${currentIndex === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100 active:scale-95 shadow-sm'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                                    Soal Sebelumnya
                                </button>
                                
                                {currentIndex === questions.length - 1 ? (
                                    <button onClick={handleKumpulkanManual} className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[13px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-3 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                        Akhiri & Kumpulkan
                                    </button>
                                ) : (
                                    <button onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))} className="px-10 py-4 bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] rounded-xl text-[13px] font-black uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-[0_10px_20px_rgba(15,76,58,0.2)]">
                                        Soal Selanjutnya
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                )}
                            </div>

                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* 🌟 NAVIGASI NOMOR SOAL (KANAN - 25%) */}
                <div className="w-full lg:w-[320px] bg-white border-l border-slate-200 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.02)] z-10">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            Peta Navigasi Soal
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-5 gap-3">
                            {questions.map((q, idx) => {
                                const isAnswered = answers[q.id] && answers[q.id].trim() !== '';
                                const isActive = currentIndex === idx;
                                
                                let boxClass = 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:bg-blue-50 shadow-sm'; 
                                if (isAnswered) boxClass = 'bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-500 text-white font-black shadow-md shadow-emerald-500/30'; 
                                if (isActive) boxClass += ' ring-4 ring-blue-500/30 border-blue-500 bg-white text-blue-700 transform scale-110'; 

                                return (
                                    <button key={q.id} onClick={() => setCurrentIndex(idx)} className={`w-full aspect-square rounded-xl border-2 text-[15px] font-black flex items-center justify-center transition-all duration-300 ${boxClass}`}>
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-800 text-white space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Keterangan Indikator</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded border border-emerald-400 shadow-sm"></div>
                            <span className="text-[12px] font-bold tracking-wide">Sudah Dijawab</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-white rounded border-2 border-slate-400"></div>
                            <span className="text-[12px] font-bold tracking-wide text-slate-300">Belum Dijawab</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-white rounded border-2 border-blue-500 ring-4 ring-blue-500/30 relative">
                                <div className="absolute inset-0 flex items-center justify-center text-blue-600 text-[10px] font-black">#</div>
                            </div>
                            <span className="text-[12px] font-bold tracking-wide text-blue-300">Posisi Saat Ini</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}