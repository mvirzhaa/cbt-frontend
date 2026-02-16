import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState(new Date());

    // 🌟 LOGIKA PINTAR & KEBAL TYPO
    const rawRole = localStorage.getItem('role') || 'dosen';
    // Mengubah "Super Admin" / "super_admin" menjadi "superadmin" agar pasti terdeteksi
    const roleDb = rawRole.toLowerCase().replace(/[^a-z]/g, ''); 
    const userName = localStorage.getItem('nama') || 'Pengguna Sistem';

    const isAdmin = roleDb.includes('admin');
    const isMahasiswa = roleDb.includes('mahasiswa') || roleDb.includes('student');

    // Penentuan Label Profil
    let userRole = 'Dosen Pengampu';
    if (isMahasiswa) userRole = 'Mahasiswa Aktif';
    if (isAdmin) userRole = 'Administrator Sistem';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        if(window.confirm("Konfirmasi: Apakah Anda yakin ingin keluar dari sistem?")) {
            localStorage.clear();
            navigate('/');
        }
    };

    // 🌟 MENU DINAMIS BERDASARKAN JABATAN
    let menuItems = [];
    if (isAdmin) {
        menuItems = [
            { path: '/admin', label: 'Master Data & Verifikasi', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
        ];
    } else if (isMahasiswa) {
        // 🌟 MENU BARU KHUSUS MAHASISWA
        menuItems = [
            { path: '/student-dashboard', label: 'Beranda Akademik', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { path: '/take-exam', label: 'Ruang Ujian Terpadu', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' }
        ];
    } else {
        // 🌟 MENU DOSEN (Ditambah Menu Kelola Matkul)
        menuItems = [
            { path: '/dashboard', label: 'Ikhtisar Sistem', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { path: '/manage-matkul', label: 'Data Mata Kuliah', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { path: '/manage-questions', label: 'Manajemen Bank Soal', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            { path: '/create-exam', label: 'Penerbitan Ujian', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { path: '/grading', label: 'Penilaian & Evaluasi', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
        ];
    }

    const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const userInitial = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="flex h-screen bg-[#f0f4f8] font-sans overflow-hidden text-slate-800">
            {/* SIDEBAR */}
            <aside className="w-64 bg-gradient-to-b from-[#0f4c3a] to-[#092e23] text-white flex flex-col shadow-xl z-20 relative font-medium">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

                <div className="pt-8 pb-6 px-5 border-b border-[#16654e]/50 text-center relative z-10">
                    <div className="h-16 w-16 mx-auto bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-xl font-black shadow-[0_0_15px_rgba(212,175,55,0.2)] mb-4 border-2 border-[#d4af37]">
                        {userInitial}
                    </div>
                    <h1 className="font-bold text-[13px] tracking-wide mb-1 leading-snug text-white">{userName}</h1>
                    <div className="mt-2 inline-block bg-[#064e3b]/80 px-3 py-1 rounded text-[9px] font-bold text-[#d4af37] uppercase tracking-widest border border-[#d4af37]/30">
                        {userRole}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-3 relative z-10 space-y-1">
                    <p className="px-3 text-[9px] font-bold text-[#6ee7b7]/70 uppercase tracking-[0.15em] mb-3">Navigasi Utama</p>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button key={item.path} onClick={() => navigate(item.path)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-[12px] font-bold rounded-lg transition-all duration-300 group relative overflow-hidden ${isActive ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-l-[3px] border-[#d4af37]' : 'text-[#a7f3d0] hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'}`}>
                                <svg className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-[#d4af37] drop-shadow-[0_0_5px_rgba(212,175,55,0.6)]' : 'text-[#6ee7b7]/50 group-hover:text-[#d4af37]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? "2" : "1.5"} d={item.icon} /></svg>
                                <span className="relative z-10">{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-[#16654e]/30 relative z-10">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold text-red-200 bg-red-900/20 hover:bg-red-900/40 hover:text-white rounded-lg transition-all border border-red-900/30">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Keluar
                    </button>
                </div>
            </aside>

            {/* AREA KONTEN */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex justify-between items-center px-6 z-10 shadow-sm">
                    <div>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight">Portal Akademik CBT</h2>
                        <p className="text-[10px] font-bold text-[#0f4c3a] uppercase tracking-widest mt-0.5">Universitas Ibn Khaldun Bogor</p>
                    </div>
                    <div className="text-right flex flex-col justify-center bg-slate-100/50 px-4 py-1.5 rounded border border-slate-200/50">
                        <span className="text-xs font-black text-slate-700 tracking-wide">{currentTime.toLocaleTimeString('id-ID')} <span className="text-[9px] text-slate-500 font-bold">WIB</span></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{formattedDate}</span>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 relative">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                    <div className="relative z-10"><Outlet /></div>
                </div>
            </main>
        </div>
    );
}