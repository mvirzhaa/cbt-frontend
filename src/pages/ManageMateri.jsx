import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import Swal from 'sweetalert2';

export default function ManageMateri() {
    const [kodeMk, setKodeMk] = useState('');
    const [judul, setJudul] = useState('');
    const [deskripsi, setDeskripsi] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // State untuk menyimpan daftar materi
    const [materiList, setMateriList] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Fungsi Mengambil Daftar Materi dari Server
    const fetchMateri = async () => {
        setLoadingData(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/materi`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                setMateriList(result.data || []);
            }
        } catch (error) {
            console.error("Gagal menarik materi:", error);
        } finally {
            setLoadingData(false);
        }
    };

    // Panggil fungsi fetch saat halaman pertama kali dibuka
    useEffect(() => {
        fetchMateri();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!kodeMk || !judul || !file) {
            Swal.fire({ icon: 'warning', title: 'Data Tidak Lengkap', text: 'Kode MK, Judul, dan File Materi wajib diisi!', confirmButtonColor: '#0F4C3A' });
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('kode_mk', kodeMk);
        formData.append('judul', judul);
        formData.append('deskripsi', deskripsi);
        formData.append('file_materi', file);

        const user = JSON.parse(localStorage.getItem('user'));
        formData.append('dosen_id', user ? user.id : 1);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/materi/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: result.message, confirmButtonColor: '#0F4C3A', timer: 2000, showConfirmButton: false });
                setKodeMk(''); setJudul(''); setDeskripsi(''); setFile(null);
                document.getElementById('fileInput').value = ''; 
                
                // Segarkan tabel secara otomatis setelah berhasil upload!
                fetchMateri(); 
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal Upload', text: result.error || 'Terjadi kesalahan pada server', confirmButtonColor: '#0F4C3A' });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Koneksi Terputus', text: 'Gagal terhubung ke server. Periksa jaringan Anda.', confirmButtonColor: '#0F4C3A' });
        } finally {
            setLoading(false);
        }
    };

    // Fungsi Menghapus Materi
    const handleDelete = async (id, judulMateri) => {
        const result = await Swal.fire({
            title: 'Hapus Materi?',
            html: `Materi <b>${judulMateri}</b> beserta file fisiknya akan dihapus permanen.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus Permanen!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/materi/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Materi berhasil dihanguskan.', confirmButtonColor: '#0F4C3A', timer: 1500 });
                    fetchMateri(); // Segarkan tabel
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Gagal', text: 'Terjadi kesalahan jaringan.', confirmButtonColor: '#0F4C3A' });
            }
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-6xl mx-auto">
            {/* Bagian Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <svg className="w-8 h-8 text-[#0F4C3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Pusat Unggahan Materi
                </h1>
                <p className="text-slate-500 font-medium mt-1">Distribusikan modul, presentasi, atau bahan bacaan ke ruang kelas virtual Anda.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* KOLOM KIRI: FORM UPLOAD */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 relative overflow-hidden sticky top-6">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0F4C3A]"></div>
                        <h2 className="text-lg font-black text-slate-800 mb-5 border-b pb-3">📤 Form Publikasi Baru</h2>
                        <form onSubmit={handleUpload} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Kode Mata Kuliah <span className="text-red-500">*</span></label>
                                <input type="text" value={kodeMk} onChange={(e) => setKodeMk(e.target.value)} placeholder="Contoh: IF101" className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-[#0F4C3A]/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Judul Materi <span className="text-red-500">*</span></label>
                                <input type="text" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Pengantar Algoritma" className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-[#0F4C3A]/50 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Deskripsi (Opsional)</label>
                                <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows="2" placeholder="Catatan untuk mahasiswa..." className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3 rounded-xl focus:ring-2 focus:ring-[#0F4C3A]/50 outline-none text-sm resize-none"></textarea>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">Unggah File (PDF/PPT) <span className="text-red-500">*</span></label>
                                <div className="relative w-full">
                                    <input id="fileInput" type="file" onChange={handleFileChange} accept=".pdf,.ppt,.pptx,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                                        <p className="text-[12px] font-bold text-slate-700 text-center truncate w-full px-2">
                                            {file ? `✅ ${file.name}` : 'Klik/Seret file ke sini'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className={`w-full py-3 px-4 rounded-xl text-xs font-black text-white uppercase tracking-wider transition-all shadow-md ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0F4C3A] hover:bg-[#0a3326] hover:-translate-y-0.5'}`}>
                                {loading ? 'Memproses...' : 'Terbitkan Materi'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* KOLOM KANAN: DAFTAR MATERI */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
                        <h2 className="text-lg font-black text-slate-800 mb-5 border-b pb-3">📚 Arsip Materi Kelas</h2>
                        
                        {loadingData ? (
                            <div className="py-10 text-center text-slate-500">
                                <svg className="animate-spin h-8 w-8 text-[#0F4C3A] mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Sedang memuat arsip materi...
                            </div>
                        ) : materiList.length === 0 ? (
                            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <span className="text-4xl block mb-3">📭</span>
                                <h3 className="text-sm font-bold text-slate-700">Belum Ada Materi</h3>
                                <p className="text-xs text-slate-500 mt-1">Materi yang Anda unggah akan muncul di sini.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {materiList.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 border border-slate-100 rounded-xl hover:shadow-md transition-all bg-slate-50/50 group">
                                        
                                        <div className="flex items-start gap-4 flex-1">
                                            {/* Ikon Tipe File (PDF/PPT) */}
                                            <div className="w-12 h-12 shrink-0 bg-[#0F4C3A]/10 text-[#0F4C3A] rounded-lg flex items-center justify-center font-black">
                                                {item.file_path.endsWith('.pdf') ? 'PDF' : item.file_path.endsWith('.ppt') || item.file_path.endsWith('.pptx') ? 'PPT' : 'DOC'}
                                            </div>
                                            
                                            {/* Info Materi */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded uppercase tracking-wider">{item.kode_mk}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                                                </div>
                                                <h3 className="text-[15px] font-black text-slate-800 leading-tight">{item.judul}</h3>
                                                {item.deskripsi && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.deskripsi}</p>}
                                                <p className="text-[10px] text-slate-400 font-medium mt-1">Oleh: {item.users?.nama || 'Dosen Pengampu'}</p>
                                            </div>
                                        </div>

                                        {/* Aksi Tombol */}
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {/* Tombol Lihat/Download */}
                                            <a 
                                                href={`${API_BASE_URL}${item.file_path}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex-1 sm:flex-none text-center px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-[#0F4C3A] hover:text-white hover:border-[#0F4C3A] transition-colors"
                                            >
                                                Buka
                                            </a>
                                            {/* Tombol Hapus */}
                                            <button 
                                                onClick={() => handleDelete(item.id, item.judul)}
                                                className="px-3 py-2 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                                                title="Hapus Materi"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}