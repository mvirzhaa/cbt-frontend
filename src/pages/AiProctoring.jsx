import React, { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config/api';
import proctoringService from '../services/proctoring.service';
import examService from '../services/exam.service';

const JENIS_BADGE = {
    TIDAK_ADA_WAJAH: 'bg-orange-100 text-orange-700',
    LEBIH_DARI_SATU_WAJAH: 'bg-red-100 text-red-700',
    BERPINDAH_TAB: 'bg-amber-100 text-amber-700',
    KELUAR_LAYAR_PENUH: 'bg-purple-100 text-purple-700',
    MENYALIN_TEMPEL: 'bg-yellow-100 text-yellow-700',
    DEVTOOLS_TERDETEKSI: 'bg-yellow-100 text-yellow-700',
    PENGAWAS_AI_TIDAK_AKTIF: 'bg-slate-200 text-slate-700',
    TIDAK_MENGGUNAKAN_SEB: 'bg-sky-100 text-sky-700',
    KETIKAN_TIDAK_WAJAR: 'bg-red-100 text-red-700',
    MOUSE_TIDAK_AKTIF: 'bg-slate-200 text-slate-700',
};

// 📝 Keterangan detail per jenis pelanggaran — ditampilkan di kolom tabel supaya dosen
// tidak perlu menebak-nebak arti dari nama enum mentahnya.
const JENIS_KETERANGAN = {
    TIDAK_ADA_WAJAH: 'Tidak ada wajah yang terdeteksi di depan kamera (mahasiswa kemungkinan meninggalkan layar atau menutupi kamera).',
    LEBIH_DARI_SATU_WAJAH: 'Terdeteksi lebih dari satu wajah di depan kamera (kemungkinan ada orang lain yang membantu/menyontek).',
    BERPINDAH_TAB: 'Mahasiswa berpindah tab atau meminimalkan jendela browser saat ujian berlangsung.',
    KELUAR_LAYAR_PENUH: 'Mahasiswa keluar dari mode layar penuh (fullscreen) saat ujian berlangsung.',
    MENYALIN_TEMPEL: 'Terdeteksi aktivitas copy, paste, atau klik kanan pada halaman ujian.',
    DEVTOOLS_TERDETEKSI: 'Terindikasi membuka Developer Tools / inspect element pada browser.',
    PENGAWAS_AI_TIDAK_AKTIF: 'Skrip pengawas AI berhenti mengirim sinyal aktif (heartbeat) — kemungkinan dimatikan/di-tamper oleh mahasiswa.',
    TIDAK_MENGGUNAKAN_SEB: 'Ujian tidak dikerjakan lewat Safe Exam Browser (SEB) — terdeteksi dari User-Agent browser. Bersifat informasi saja, ujian tetap berjalan.',
    KETIKAN_TIDAK_WAJAR: 'Terdeteksi teks esai yang masuk lewat paste/drag-drop/autofill, bukan ketikan manual biasa.',
    MOUSE_TIDAK_AKTIF: 'Mouse dan keyboard sama-sama tidak ada aktivitas dalam waktu lama — kemungkinan perangkat ditinggal atau dikendalikan dari jarak jauh.',
};

const PAGE_SIZE = 12;

// 📸 Thumbnail foto bukti. Dulu fallback-nya memuat gambar dari via.placeholder.com (domain
// eksternal) saat foto gagal dimuat — kalau domain itu tidak bisa diakses, onError juga gagal
// diam-diam dan yang terlihat cuma background gelap kartu, terlihat seperti "foto hitam total"
// padahal sebenarnya gambar gagal dimuat (404/CORS/dll), bukan hasil jepretan yang benar-benar hitam.
// Fallback sekarang murni lokal (tanpa network) supaya kedua kondisi ini bisa dibedakan dengan jelas.
function BuktiFoto({ fotoBukti }) {
    const [gagalMuat, setGagalMuat] = useState(false);

    if (!fotoBukti) {
        return (
            <div className="w-32 h-24 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wide text-center px-1">Tanpa Foto (Deteksi Server)</span>
            </div>
        );
    }

    if (gagalMuat) {
        return (
            <div className="w-32 h-24 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wide text-center px-1">Gambar Gagal Dimuat</span>
            </div>
        );
    }

    return (
        <a href={`${API_BASE_URL}${fotoBukti}`} target="_blank" rel="noopener noreferrer" title="Lihat foto ukuran penuh">
            <img
                src={`${API_BASE_URL}${fotoBukti}`}
                alt="Bukti Pelanggaran"
                className="w-32 h-24 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity"
                onError={() => setGagalMuat(true)}
            />
        </a>
    );
}

export default function AiProctoring() {
    const [violations, setViolations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [filterExamId, setFilterExamId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const seenMaxId = useRef(0);
    const isFirstLoad = useRef(true);

    const fetchViolations = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const params = { page, limit: PAGE_SIZE };
            if (filterExamId) params.exam_id = filterExamId;
            if (filterStatus) params.status = filterStatus;

            const result = await proctoringService.getViolations(params);
            const list = result?.data || [];
            setViolations(list);
            setTotalPages(result?.totalPages || 1);

            const maxId = list.reduce((max, item) => Math.max(max, item.id), 0);
            if (!isFirstLoad.current && page === 1 && maxId > seenMaxId.current) {
                const jumlahBaru = list.filter(item => item.id > seenMaxId.current).length;
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'warning',
                    title: `${jumlahBaru} pelanggaran baru terdeteksi`,
                    showConfirmButton: false, timer: 3000
                });
            }
            if (maxId > seenMaxId.current) seenMaxId.current = maxId;
            isFirstLoad.current = false;
        } catch (error) {
            console.error("Gagal menarik data pelanggaran:", error);
        } finally {
            setLoading(false);
        }
    }, [page, filterExamId, filterStatus]);

    useEffect(() => {
        examService.getExams()
            .then(res => setExams(res?.data || []))
            .catch(err => console.error("Gagal menarik daftar ujian:", err));
    }, []);

    useEffect(() => {
        fetchViolations();
    }, [fetchViolations]);

    // 🔄 Polling otomatis tiap 10 detik supaya dosen tidak perlu refresh manual
    useEffect(() => {
        const interval = setInterval(() => fetchViolations({ silent: true }), 10000);
        return () => clearInterval(interval);
    }, [fetchViolations]);

    const handleFilterExamChange = (e) => {
        setFilterExamId(e.target.value);
        setPage(1);
    };

    const handleFilterStatusChange = (e) => {
        setFilterStatus(e.target.value);
        setPage(1);
    };

    const handleReview = async (id) => {
        try {
            await proctoringService.reviewViolation(id);
            setViolations(prev => prev.map(v => v.id === id ? { ...v, status: 'DITINJAU' } : v));
        } catch (error) {
            console.error("Gagal menandai pelanggaran:", error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak bisa menandai pelanggaran ini sebagai ditinjau.' });
        }
    };

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Monitor Pengawas AI
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Log rekaman aktivitas mencurigakan yang ditangkap otomatis oleh mesin Proctoring AI. Halaman ini menyegarkan diri otomatis tiap 10 detik.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <select value={filterExamId} onChange={handleFilterExamChange} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-200 text-[13px] font-semibold text-slate-700 bg-white focus:outline-none focus:border-red-400">
                        <option value="">Semua Ujian</option>
                        {exams.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.nama_ujian}</option>
                        ))}
                    </select>
                    <select value={filterStatus} onChange={handleFilterStatusChange} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-200 text-[13px] font-semibold text-slate-700 bg-white focus:outline-none focus:border-red-400">
                        <option value="">Semua Status</option>
                        <option value="BARU">Baru</option>
                        <option value="DITINJAU">Ditinjau</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-500">
                    <svg className="animate-spin h-10 w-10 text-red-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Menyinkronkan data dari server...
                </div>
            ) : violations.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
                    <span className="text-6xl block mb-4">🛡️</span>
                    <h3 className="text-xl font-bold text-slate-700">Tidak Ada Pelanggaran</h3>
                    <p className="text-slate-500 mt-2">Ujian berjalan bersih. AI tidak mendeteksi adanya kecurangan.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 w-40">Foto Bukti</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">Mahasiswa</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">Pelanggaran &amp; Keterangan</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">Waktu</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500">Status</th>
                                        <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {violations.map((item) => (
                                        <tr key={item.id} className="align-top hover:bg-slate-50/60">
                                            <td className="px-4 py-4">
                                                <BuktiFoto fotoBukti={item.foto_bukti} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-sm font-black text-slate-800">{item.users?.nama || 'Mahasiswa Tidak Diketahui'}</p>
                                                <p className="text-xs font-semibold text-slate-400">{item.users?.email}</p>
                                                <p className="text-xs font-bold text-slate-500 mt-1">{item.exams?.nama_ujian || 'Sesi Ujian CBT'}</p>
                                            </td>
                                            <td className="px-4 py-4 max-w-md">
                                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${JENIS_BADGE[item.jenis_pelanggaran] || 'bg-red-100 text-red-700'}`}>
                                                    {item.jenis_pelanggaran.replace(/_/g, ' ')}
                                                </span>
                                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                                                    {JENIS_KETERANGAN[item.jenis_pelanggaran] || 'Tidak ada keterangan tambahan untuk jenis pelanggaran ini.'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-slate-500 font-semibold whitespace-nowrap">
                                                {new Date(item.waktu_kejadian).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${item.status === 'DITINJAU' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.status === 'DITINJAU' ? 'Ditinjau' : 'Baru'}
                                                </span>
                                                {item.status === 'DITINJAU' && (
                                                    <p className="mt-1.5 text-[11px] font-bold text-emerald-600">oleh {item.peninjau?.nama || 'dosen'}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {item.status !== 'DITINJAU' && (
                                                    <button
                                                        onClick={() => handleReview(item.id)}
                                                        className="py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-900 text-white transition-colors whitespace-nowrap"
                                                    >
                                                        Tandai Ditinjau
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-8">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-white border-2 border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Sebelumnya
                            </button>
                            <span className="text-[13px] font-bold text-slate-500">Halaman {page} dari {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest bg-white border-2 border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
