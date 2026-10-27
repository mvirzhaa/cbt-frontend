import { motion } from 'framer-motion';

export default function PanduanUjian() {
    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6 pb-12">
            
            {/* 🌟 HEADER PREMIUM */}
            <div className="bg-gradient-to-r from-[#0f4c3a] to-[#092e23] rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden flex flex-col justify-center border border-[#16654e]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <svg className="absolute -right-10 -bottom-10 w-56 h-56 text-white/5 pointer-events-none transform -rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                
                <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-black uppercase tracking-widest rounded-lg mb-4 backdrop-blur-sm">
                        Dokumen Resmi Akademik
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
                        Panduan & Tata Tertib CBT
                    </h2>
                    <p className="text-emerald-100/80 text-[14px] font-medium max-w-xl leading-relaxed">
                        Harap membaca dan memahami seluruh peraturan ini sebelum memasuki Ruang Ujian Terpadu Universitas Ibn Khaldun Bogor.
                    </p>
                </div>
            </div>

            {/* 🌟 GRID INFORMASI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* KARTU 1: Persiapan Teknis */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest">1. Persiapan Teknis</h3>
                    </div>
                    <ul className="space-y-4 text-slate-600 text-[13px] font-medium leading-relaxed">
                        <li className="flex gap-3"><span className="text-blue-500 font-bold">✓</span> Pastikan perangkat Anda (Laptop/PC/Smartphone) memiliki daya baterai yang cukup atau terhubung ke sumber listrik.</li>
                        <li className="flex gap-3"><span className="text-blue-500 font-bold">✓</span> Gunakan peramban (browser) versi terbaru seperti Google Chrome atau Mozilla Firefox untuk pengalaman terbaik.</li>
                        <li className="flex gap-3"><span className="text-blue-500 font-bold">✓</span> Pastikan koneksi internet Anda stabil. Gangguan koneksi saat mengirim jawaban sepenuhnya menjadi tanggung jawab peserta.</li>
                    </ul>
                </div>

                {/* KARTU 2: Mekanisme Ujian */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest">2. Mekanisme Ujian</h3>
                    </div>
                    <ul className="space-y-4 text-slate-600 text-[13px] font-medium leading-relaxed">
                        <li className="flex gap-3"><span className="text-amber-500 font-bold">✓</span> Dapatkan <b>Token Ujian</b> dari Dosen Pengampu sesaat sebelum jadwal ujian dimulai. Token bersifat rahasia.</li>
                        <li className="flex gap-3"><span className="text-amber-500 font-bold">✓</span> Perhatikan durasi hitung mundur (Timer) di sudut layar. Ujian akan tertutup otomatis apabila waktu telah habis.</li>
                        <li className="flex gap-3"><span className="text-amber-500 font-bold">✓</span> Jangan menekan tombol "Refresh" (F5) atau "Back" pada browser saat berada di dalam Ruang Ujian agar data Anda tidak hilang.</li>
                    </ul>
                </div>

                {/* KARTU 2B: Safe Exam Browser (hanya relevan untuk ujian yang mewajibkannya) */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest">Khusus Ujian Berkunci (Safe Exam Browser)</h3>
                    </div>
                    <p className="text-slate-500 text-[13px] font-medium leading-relaxed mb-5">
                        Sebagian ujian mewajibkan <b>Safe Exam Browser (SEB)</b> — aplikasi resmi pihak ketiga yang mengunci laptop/PC Anda selama ujian berlangsung (tidak bisa buka tab/aplikasi lain, tidak bisa keluar sebelum selesai). Kalau dosen Anda mengaktifkan ini, ikuti langkah berikut:
                    </p>
                    <ol className="space-y-3 text-slate-600 text-[13px] font-medium leading-relaxed list-decimal list-inside">
                        <li><b>Install SEB sekali saja</b> dari situs resmi <span className="font-mono font-bold text-slate-700">safeexambrowser.org</span> (pilih versi Windows atau Mac sesuai perangkat Anda).</li>
                        <li><b>Dapatkan file konfigurasi <span className="font-mono">.seb</span></b> untuk ujian yang akan dikerjakan — bisa dari dosen pengampu, atau unduh sendiri lewat tombol yang muncul kalau Anda mencoba masuk ujian ini tanpa SEB.</li>
                        <li><b>Buka file <span className="font-mono">.seb</span> itu</b> (bukan buka Chrome/Firefox biasa) — SEB akan terbuka dalam mode layar penuh dan langsung ke halaman ujian dengan token sudah otomatis terisi.</li>
                        <li>Izinkan akses kamera saat diminta (untuk pengawas AI), baca Syarat & Ketentuan, lalu klik mulai.</li>
                        <li>SEB hanya bisa ditutup dengan password yang diberikan dosen — gunakan itu setelah ujian benar-benar selesai/terkirim.</li>
                    </ol>
                </div>

                {/* KARTU 3: Integritas & Pelanggaran */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3.5 bg-red-50 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-widest">3. Integritas Akademik & Pelanggaran</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 text-slate-600 text-[13px] font-medium leading-relaxed">
                        <p>
                            Sistem CBT UIKA dilengkapi dengan mesin pendeteksi kecurangan dan AI Penilai. Peserta diwajibkan menjunjung tinggi nilai kejujuran akademik. Segala bentuk kerja sama, mencontek, atau membagikan token ke pihak luar adalah pelanggaran berat.
                        </p>
                        <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                            <p className="font-bold text-red-800 mb-2">Sanksi Pelanggaran:</p>
                            <ul className="space-y-1.5 text-red-700">
                                <li>• Nilai langsung dibatalkan (Skor 0).</li>
                                <li>• Pemblokiran akses akun oleh Administrator.</li>
                                <li>• Pelaporan kepada pihak Program Studi / Fakultas.</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}