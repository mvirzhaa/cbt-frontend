import { useState, useEffect } from 'react';
// 🌟 TAMBAHAN: Import Link untuk membuat profil bisa diklik
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

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

    const handleLogout = async () => {
        // 🌟 DIALOG KONFIRMASI LOGOUT PREMIUM
        const result = await Swal.fire({
            title: 'Akhiri Sesi Akademik?',
            html: "<span class='text-slate-500 font-medium text-[14px]'>Anda harus login kembali untuk mengakses portal.</span>",
            icon: 'question',
            iconColor: '#d4af37', // Menggunakan warna emas untuk ikon tanya
            
            showCancelButton: true,
            confirmButtonText: 'Ya, Keluar Sekarang',
            cancelButtonText: 'Tetap di Sini',
            reverseButtons: true,
            
            // 🚨 KUNCI KUSTOMISASI: Matikan styling bawaan Swal
            buttonsStyling: false, 
            
            // 🎨 SUNTIKAN KELAS TAILWIND CSS
            customClass: {
                popup: 'rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] border-0 p-0 overflow-hidden', // Bentuk popup lebih modern & shadow besar
                title: 'text-2xl font-black text-slate-800 tracking-tight mt-8', // Tipografi judul yang kuat
                htmlContainer: 'mb-8', // Jarak teks isi
                actions: 'bg-slate-50 w-full py-6 px-8 flex gap-4 justify-center border-t border-slate-100 mb-0', // Container tombol di bawah
                confirmButton: 'px-6 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider shadow-lg shadow-red-500/30 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all active:scale-95 flex-1 max-w-[200px]', // Tombol konfirmasi merah gradien
                cancelButton: 'px-6 py-3 rounded-xl text-[13px] font-black uppercase tracking-wider bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 transition-all active:scale-95 flex-1 max-w-[200px]', // Tombol batal minimalis
            },
            // Menambahkan sedikit tekstur halus pada background popup
            background: '#ffffff url("https://www.transparenttextures.com/patterns/cubes.png")',
            // Backdrop dengan efek blur dan logo samar di latar belakang
            backdrop: `
                rgba(15, 76, 58, 0.6)
                url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='%23d4af37' stroke-opacity='0.2' stroke-linecap='round' stroke-linejoin='round' stroke-width='1'%3E%3Cpath d='M12 14l9-5-9-5-9 5 9 5z'/%3E%3Cpath d='M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z'/%3E%3C/g%3E%3C/svg%3E")
                center center
                no-repeat
            `
        });

        if (result.isConfirmed) {
            localStorage.clear();
            navigate('/');
            
            // Alert kecil di pojok kanan atas setelah berhasil logout
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                  toast.addEventListener('mouseenter', Swal.stopTimer)
                  toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            })
              
            Toast.fire({
                icon: 'success',
                title: 'Anda telah berhasil keluar.'
            })
        }
    };

    // 🌟 MENU DINAMIS BERDASARKAN JABATAN
   // 🌟 MENU DINAMIS BERDASARKAN JABATAN
    let menuItems = [];
    if (isAdmin) {
        // 👑 MENU ADMIN SEKARANG JAUH LEBIH BERWIBAWA!
        menuItems = [
            { path: '/admin', label: 'Ikhtisar Sistem', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
            { path: '/admin/verifikasi', label: 'Verifikasi Pendaftar', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { path: '/admin/pengguna', label: 'Manajemen Pengguna', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { path: '/admin/matkul', label: 'Master Mata Kuliah', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' }
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
            { path: '/create-exam', label: 'Penerbitan Ujian', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { path: '/manage-questions', label: 'Manajemen Bank Soal', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
            { path: '/grading', label: 'Penilaian & Evaluasi', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { path: '/rekap-nilai', label: 'Rekap Nilai Akhir', icon: 'M9 17v-2m-2-4v-6m6 6v2m2 4v6m2-6v-6m-2 0H9m0 0H7' }
        ];
    }

    const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const userInitial = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="flex h-screen bg-[#f0f4f8] font-sans overflow-hidden text-slate-800">
            {/* SIDEBAR */}
            <aside className="w-64 bg-gradient-to-b from-[#0f4c3a] to-[#092e23] text-white flex flex-col shadow-xl z-20 relative font-medium">
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>

                {/* 🌟 BAGIAN PROFIL YANG SUDAH DIUBAH MENJADI LINK */}
                <Link to="/profile" className="block pt-8 pb-6 px-5 border-b border-[#16654e]/50 text-center relative z-10 group hover:bg-white/5 transition-all duration-300 cursor-pointer">
                    <div className="h-16 w-16 mx-auto bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-xl font-black shadow-[0_0_15px_rgba(212,175,55,0.2)] mb-4 border-2 border-[#d4af37] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] group-hover:border-white transition-all duration-300 relative">
                        {userInitial}
                        {/* Indikator Online Tambahan Opsional */}
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0f4c3a] rounded-full"></div>
                    </div>
                    <h1 className="font-bold text-[13px] tracking-wide mb-1 leading-snug text-white group-hover:text-[#d4af37] transition-colors">{userName}</h1>
                    <div className="mt-2 inline-block bg-[#064e3b]/80 px-3 py-1 rounded text-[9px] font-bold text-[#d4af37] uppercase tracking-widest border border-[#d4af37]/30 group-hover:bg-[#16654e] transition-colors">
                        {userRole}
                    </div>
                </Link>

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