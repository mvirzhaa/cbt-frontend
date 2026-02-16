import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function TakeExam() {
    const navigate = useNavigate();
    
    // Status Layar: 'gate' (masuk token), 'exam' (mengerjakan), 'done' (selesai)
    const [screenStatus, setScreenStatus] = useState('gate'); 
    const [tokenUjian, setTokenUjian] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Data Ujian
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(5400); // Default 90 menit (dalam detik)

    // Penyimpanan Jawaban
    const [answers, setAnswers] = useState({}); // { id_soal: "jawaban" }
    const [files, setFiles] = useState({});     // { id_soal: FileObject }

    // GERBANG TOKEN: Masuk ke Ujian
    // 🌟 1. GERBANG TOKEN: Verifikasi ke Backend
    const handleMasukUjian = async (e) => {
        e.preventDefault();
        if (!tokenUjian) return alert("Masukkan token ujian terlebih dahulu!");
        
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            // PANGGIL RUTE VERIFIKASI TOKEN YANG BARU KITA BUAT
            const res = await axios.post('http://localhost:3000/api/student/verify-token', 
                { token_ujian: tokenUjian }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const examData = res.data.exam;
            const soalData = res.data.questions;

            if (soalData && soalData.length > 0) {
                setQuestions(soalData);
                // Set Timer secara otomatis sesuai durasi yang diatur Dosen!
                setTimeLeft(examData.durasi * 60); 
                setScreenStatus('exam'); // Buka medan tempur!
            } else {
                alert("Ujian ini belum memiliki soal. Silakan hubungi Dosen Anda.");
            }
        } catch (error) {
            // Jika token salah, tampilkan pesan error merah
            alert(error.response?.data?.message || "Gagal memverifikasi token. Pastikan token benar!");
        } finally {
            setIsLoading(false);
        }
    };

    // 🌟 2. TIMER HITUNG MUNDUR
    useEffect(() => {
        if (screenStatus !== 'exam' || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [screenStatus, timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // 🌟 3. PENCATATAN JAWABAN
    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleFileChange = (questionId, file) => {
        setFiles(prev => ({ ...prev, [questionId]: file }));
        setAnswers(prev => ({ ...prev, [questionId]: file.name })); // Tandai bahwa file sudah dipilih
    };

    // 🌟 4. PENGIRIMAN UJIAN (SUBMIT KE AUTO-GRADER)
    const handleSelesaiUjian = async () => {
        if (!window.confirm("Yakin ingin menyelesaikan ujian? Anda tidak bisa kembali setelah ini.")) return;
        
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const examId = questions[0]?.exam_id || 5;

            // Menggunakan FormData karena kita mengirim File & Teks sekaligus
            const formData = new FormData();
            formData.append('exam_id', examId);
            formData.append('answers', JSON.stringify(answers));
            
            // Masukkan semua file yang diupload mahasiswa
            Object.keys(files).forEach(qId => {
                formData.append(`file_${qId}`, files[qId]);
            });

            await axios.post('http://localhost:3000/api/exams/submit', formData, { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                } 
            });

            setScreenStatus('done');
        } catch (error) {
            alert("Gagal mengirim jawaban. Coba klik kumpulkan lagi.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const currentQ = questions[currentIndex];

    // =====================================================================
    // LAYAR 1: GERBANG TOKEN
    // =====================================================================
    if (screenStatus === 'gate') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#0f4c3a]/5 rounded-full blur-3xl"></div>
                
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full relative z-10 border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#0f4c3a] to-[#16654e] rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-[#0f4c3a]/20 border-2 border-[#d4af37]">
                            <svg className="w-10 h-10 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gerbang Akses Ujian</h2>
                        <p className="text-[13px] font-medium text-slate-500 mt-2">Masukkan Token Ujian yang diberikan oleh Dosen Pengawas Anda.</p>
                    </div>

                    <form onSubmit={handleMasukUjian}>
                        <input type="text" required value={tokenUjian} onChange={e => setTokenUjian(e.target.value.toUpperCase())} className="w-full text-center px-6 py-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:bg-white focus:border-[#0f4c3a] outline-none font-black text-slate-800 text-2xl tracking-[0.3em] uppercase transition-all mb-6" placeholder="XXXXXX" />
                        
                        <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl text-[14px] font-black uppercase tracking-widest text-white bg-[#0f4c3a] hover:bg-[#092e23] shadow-lg shadow-[#0f4c3a]/30 transition-all">
                            {isLoading ? 'Memverifikasi...' : 'Mulai Kerjakan'}
                        </button>
                    </form>
                    <button onClick={() => navigate('/student-dashboard')} className="w-full mt-4 py-3 text-[12px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">Kembali ke Beranda</button>
                </motion.div>
            </div>
        );
    }

    // =====================================================================
    // LAYAR 3: SELESAI
    // =====================================================================
    if (screenStatus === 'done') {
        return (
            <div className="min-h-screen bg-[#0f4c3a] flex flex-col items-center justify-center p-4 text-white">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-lg">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-[#d4af37]/30">
                        <svg className="w-12 h-12 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-4">Ujian Selesai!</h1>
                    <p className="text-[#a7f3d0] text-[15px] leading-relaxed mb-8">Jawaban Anda telah berhasil direkam oleh sistem dan sedang diproses oleh mesin penilai otomatis CBT UIKA.</p>
                    <button onClick={() => navigate('/student-dashboard')} className="px-8 py-4 bg-[#d4af37] hover:bg-[#f59e0b] text-[#0f4c3a] rounded-xl text-[13px] font-black uppercase tracking-widest shadow-xl transition-all">
                        Kembali ke Lobi Utama
                    </button>
                </motion.div>
            </div>
        );
    }

    // =====================================================================
    // LAYAR 2: MEDAN TEMPUR UJIAN (ACTIVE EXAM)
    // =====================================================================
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            
            {/* HEADER UJIAN */}
            <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shadow-sm fixed w-full z-20">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-[#0f4c3a] rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-[14px] font-black text-slate-800 tracking-tight">Sesi Ujian Aktif</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Token: {tokenUjian}</p>
                    </div>
                </div>
                
                {/* TIMER SAKTI */}
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 px-5 py-2 rounded-lg">
                    <svg className="w-5 h-5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[18px] font-black text-red-600 tracking-widest font-mono">{formatTime(timeLeft)}</span>
                </div>
            </header>

            {/* AREA KONTEN UTAMA */}
            <main className="flex-1 pt-24 pb-8 px-8 max-w-7xl mx-auto w-full flex gap-8 relative items-start">
                
                {/* KIRI: AREA PERTANYAAN */}
                <motion.div key={currentIndex} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-[3] bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                        <span className="text-[12px] font-black text-[#0f4c3a] uppercase tracking-widest bg-[#ecfdf5] px-4 py-1.5 rounded-full border border-[#a7f3d0]">
                            Pertanyaan {currentIndex + 1} dari {questions.length}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Tipe: {currentQ?.tipe_soal === 'TIPE_1' ? 'Pilihan Ganda' : currentQ?.tipe_soal === 'TIPE_3' ? 'Esai / Analisis' : 'Upload Berkas'}
                        </span>
                    </div>

                    <h2 className="text-[18px] font-bold text-slate-800 leading-relaxed mb-8">{currentQ?.isi_soal}</h2>

                    {/* RENDER INPUT JAWABAN BERDASARKAN TIPE */}
                    <div className="space-y-4">
                        
                        {/* 1. JIKA PILIHAN GANDA */}
                        {currentQ?.tipe_soal === 'TIPE_1' && currentQ?.opsi_jawaban && JSON.parse(currentQ.opsi_jawaban).map((opsi, idx) => {
                            const isSelected = answers[currentQ.id] === opsi;
                            const label = ['A', 'B', 'C', 'D'][idx];
                            return (
                                <button key={idx} onClick={() => handleAnswerChange(currentQ.id, opsi)} className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-[#0f4c3a] bg-[#f0fdf4] shadow-md' : 'border-slate-200 bg-white hover:border-[#0f4c3a]/50 hover:bg-slate-50'}`}>
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-black flex-shrink-0 transition-colors ${isSelected ? 'bg-[#0f4c3a] text-[#d4af37]' : 'bg-slate-100 text-slate-500'}`}>{label}</span>
                                    <span className={`text-[15px] font-semibold ${isSelected ? 'text-[#0f4c3a]' : 'text-slate-700'}`}>{opsi}</span>
                                </button>
                            );
                        })}

                        {/* 2. JIKA ESAI */}
                        {currentQ?.tipe_soal === 'TIPE_3' && (
                            <textarea rows="6" value={answers[currentQ.id] || ''} onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)} className="w-full px-6 py-5 bg-slate-50 rounded-xl border-2 border-slate-200 focus:bg-white focus:border-[#0f4c3a] outline-none font-medium text-slate-800 text-[15px] transition-all leading-relaxed" placeholder="Ketikkan jawaban uraian Anda di sini secara jelas dan padat..."></textarea>
                        )}

                        {/* 3. JIKA UPLOAD BERKAS */}
                        {currentQ?.tipe_soal === 'TIPE_4' && (
                            <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 hover:border-[#0f4c3a] transition-all group">
                                <input type="file" onChange={(e) => handleFileChange(currentQ.id, e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.png,.jpg,.jpeg" />
                                <div className="space-y-3">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <p className="text-[15px] font-bold text-slate-700">Klik atau seret berkas ke area ini</p>
                                    <p className="text-[12px] font-medium text-slate-400">Format yang didukung: PDF, JPG, PNG (Maks 5MB)</p>
                                    
                                    {files[currentQ.id] && (
                                        <div className="mt-4 inline-flex items-center gap-2 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] px-4 py-2 rounded-lg text-[12px] font-black">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            {files[currentQ.id].name}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TOMBOL NAVIGASI BAWAH */}
                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between">
                        <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="px-6 py-3 rounded-xl text-[12px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 uppercase tracking-widest disabled:opacity-50 transition-all">
                            &larr; Soal Sebelumnya
                        </button>
                        <button onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))} disabled={currentIndex === questions.length - 1} className="px-6 py-3 rounded-xl text-[12px] font-black text-white bg-[#0f4c3a] hover:bg-[#092e23] uppercase tracking-widest shadow-md disabled:opacity-50 transition-all">
                            Soal Selanjutnya &rarr;
                        </button>
                    </div>
                </motion.div>

                {/* KANAN: PANEL NAVIGASI NOMOR & SUBMIT */}
                <div className="flex-[1] flex flex-col gap-6 sticky top-24">
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Peta Navigasi Soal</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {questions.map((q, idx) => {
                                const isAnswered = !!answers[q.id];
                                const isCurrent = currentIndex === idx;
                                return (
                                    <button key={q.id} onClick={() => setCurrentIndex(idx)} className={`w-full aspect-square flex items-center justify-center rounded-lg text-[13px] font-black transition-all ${isCurrent ? 'ring-2 ring-offset-2 ring-[#0f4c3a] bg-[#0f4c3a] text-white shadow-md' : isAnswered ? 'bg-[#ecfdf5] text-[#0f4c3a] border border-[#a7f3d0]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-transparent'}`}>
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={handleSelesaiUjian} disabled={isLoading} className="w-full py-5 rounded-2xl text-[14px] font-black uppercase tracking-widest text-[#0f4c3a] bg-[#fbbf24] hover:bg-[#f59e0b] shadow-[0_8px_20px_rgba(251,191,36,0.3)] transition-all flex flex-col items-center justify-center gap-1">
                        {isLoading ? 'Mengirim Data...' : 'Kumpulkan Ujian'}
                        {!isLoading && <span className="text-[10px] font-bold text-[#b45309] tracking-normal capitalize">Pastikan semua terjawab</span>}
                    </button>

                </div>
            </main>
        </div>
    );
}