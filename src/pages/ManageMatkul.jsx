import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import siakadService from '../services/siakad.service';
import SiakadSearchPicker from '../components/SiakadSearchPicker';

export default function ManageMatkul() {
    const [isLoading, setIsLoading] = useState(false);

    // State Form Tambah Matkul
    const [kodeMk, setKodeMk] = useState('');
    const [namaMk, setNamaMk] = useState('');
    const [siakadId, setSiakadId] = useState('');

    // State picker SIAKAD (cari matkul dari SIAKAD, autofill form di atas)
    const [siakadCourses, setSiakadCourses] = useState([]);
    const [siakadSearch, setSiakadSearch] = useState('');
    const [siakadPickerOpen, setSiakadPickerOpen] = useState(false);
    const [siakadLoading, setSiakadLoading] = useState(false);
    const [importingSiakad, setImportingSiakad] = useState(false);

    // State Data & Dropdown
    const [matkulList, setMatkulList] = useState([]);
    const [selectedMkId, setSelectedMkId] = useState('');
    const [scoreList, setScoreList] = useState([]); // 🌟 Menyimpan Rekap Nilai Akhir

    useEffect(() => {
        fetchMatkul();
        fetchSiakadCourses();
    }, []);

    const fetchSiakadCourses = useCallback(async () => {
        setSiakadLoading(true);
        try {
            const result = await siakadService.searchMataKuliah({ size: 100 });
            setSiakadCourses(result.data || []);
        } catch (error) {
            console.error("Gagal menarik mata kuliah SIAKAD:", error);
        } finally {
            setSiakadLoading(false);
        }
    }, []);

    const filteredSiakadCourses = siakadSearch.trim()
        ? siakadCourses.filter(c =>
            c.nama?.toLowerCase().includes(siakadSearch.toLowerCase()) ||
            c.kode?.toLowerCase().includes(siakadSearch.toLowerCase())
          )
        : siakadCourses;

    const handlePickSiakadCourse = (course) => {
        setKodeMk((course.kode || '').toUpperCase());
        setNamaMk(course.nama || '');
        setSiakadId(course.id || '');
        setSiakadPickerOpen(false);
        setSiakadSearch('');
    };

    const fetchMatkul = async () => {
        try {
            const data = await matkulService.getMatkul();
            setMatkulList(data || []);
        } catch (error) { 
            console.error("Gagal menarik data matkul", error); 
        }
    };

    // 🌟 FUNGSI BARU: MENARIK REKAP NILAI SAAT DROPDOWN BERUBAH
    const fetchScores = async (mkId) => {
        if (!mkId) {
            setScoreList([]);
            return;
        }
        try {
            const data = await matkulService.getMatkulScores(mkId);
            setScoreList(data || []);
        } catch (error) { 
            console.error("Gagal menarik nilai matkul", error); 
        }
    };

    const handleEditSiakadId = async () => {
        if (!selectedMkId) {
            return Swal.fire({ icon: 'warning', title: 'Pilih Mata Kuliah Dulu', confirmButtonColor: '#0f4c3a' });
        }
        const mk = matkulList?.data?.find(m => (m.id || m.kode_mk) === selectedMkId);
        const { value: siakadIdBaru } = await Swal.fire({
            title: `Edit ID SIAKAD — ${mk?.kode_mk || selectedMkId}`,
            input: 'text',
            inputValue: mk?.siakad_id || '',
            inputPlaceholder: 'uuid mata kuliah di SIAKAD',
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#0f4c3a'
        });
        if (siakadIdBaru === undefined) return;

        try {
            await matkulService.updateMatkul(mk?.kode_mk || selectedMkId, { siakad_id: siakadIdBaru.trim() || null });
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ID SIAKAD tersimpan!', showConfirmButton: false, timer: 1800 });
            fetchMatkul();
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan ID SIAKAD.', 'error');
        }
    };

    const handleBulkImportSiakad = async () => {
        if (filteredSiakadCourses.length === 0) {
            return Swal.fire({ icon: 'warning', title: 'Tidak Ada Data', text: 'Cari dulu mata kuliah SIAKAD yang mau diimpor.', confirmButtonColor: '#0f4c3a' });
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: `Impor ${filteredSiakadCourses.length} Mata Kuliah?`,
            text: 'Mata kuliah yang belum ada di CBT akan dibuat baru, yang sudah ada tapi belum punya ID SIAKAD akan disambungkan. Yang sudah punya ID SIAKAD tidak akan ditimpa.',
            showCancelButton: true,
            confirmButtonText: 'Ya, Impor',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#0f4c3a'
        });
        if (!confirm.isConfirmed) return;

        setImportingSiakad(true);
        try {
            const items = filteredSiakadCourses.map(c => ({ kode_mk: c.kode, nama_mk: c.nama, siakad_id: c.id }));
            const result = await matkulService.importSiakad(items);
            Swal.fire({
                icon: 'success',
                title: 'Impor Selesai',
                html: `${result.created?.length || 0} mata kuliah baru dibuat<br>${result.linked?.length || 0} disambungkan ke ID SIAKAD<br>${result.skipped?.length || 0} dilewati (sudah terpetakan)<br>${result.failed?.length || 0} gagal`,
                confirmButtonColor: '#0f4c3a'
            });
            fetchMatkul();
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat impor dari SIAKAD.', 'error');
        } finally {
            setImportingSiakad(false);
        }
    };

    const handleTambahMatkul = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await matkulService.createMatkul({ kode_mk: kodeMk, nama_mk: namaMk, siakad_id: siakadId.trim() || null });
            Swal.fire({
                icon: 'success',
                title: 'Mata Kuliah Ditambahkan!',
                text: `Mata kuliah ${kodeMk} - ${namaMk} berhasil ditambahkan.`,
                confirmButtonColor: '#0f4c3a'
            });
            setKodeMk('');
            setNamaMk('');
            setSiakadId('');
            fetchMatkul(); // Refresh list matkul
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menambahkan!',
                text: error.response?.data?.message || 'Terjadi kesalahan saat menambahkan mata kuliah.',
                confirmButtonColor: '#0f4c3a'
            });
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-10">
            
            <div className="mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Manajemen Mata Kuliah & Buku Nilai</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Tambahkan mata kuliah baru dan pantau rekapitulasi nilai akhir mahasiswa.</p>
            </div>

            {/* BAGIAN 1: FORM TAMBAH MATA KULIAH */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex items-center gap-3">
                    <div className="p-2 bg-[#0f4c3a]/10 rounded-lg">
                        <svg className="w-5 h-5 text-[#0f4c3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">Registrasi Mata Kuliah Baru</h3>
                </div>

                <form onSubmit={handleTambahMatkul} className="p-8 space-y-6">
                    <SiakadSearchPicker
                        label="Cari dari SIAKAD (opsional)"
                        searchValue={siakadSearch}
                        onSearchChange={setSiakadSearch}
                        isOpen={siakadPickerOpen}
                        onOpenChange={setSiakadPickerOpen}
                        items={filteredSiakadCourses}
                        getKey={course => course.id}
                        renderItem={course => (
                            <>
                                <p className="text-[12px] font-black text-slate-800">{course.nama}</p>
                                <p className="text-[10px] font-bold text-slate-400">{course.kode}</p>
                            </>
                        )}
                        onSelect={handlePickSiakadCourse}
                        loading={siakadLoading}
                        connected={!!siakadId}
                        placeholder="Ketik nama atau kode mata kuliah..."
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Kode Mata Kuliah</label>
                            <input type="text" required value={kodeMk} onChange={e => setKodeMk(e.target.value.toUpperCase())} placeholder="Misal: IF101" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all uppercase" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Mata Kuliah</label>
                            <input type="text" required value={namaMk} onChange={e => setNamaMk(e.target.value)} placeholder="Misal: Algoritma dan Pemrograman" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest">ID Mata Kuliah SIAKAD (opsional)</label>
                        <input type="text" value={siakadId} onChange={e => setSiakadId(e.target.value)} placeholder="uuid mata kuliah di SIAKAD — wajib diisi kalau mau pakai integrasi Jalur D" className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#0f4c3a]/20 focus:border-[#0f4c3a] outline-none font-bold text-slate-800 text-[13px] transition-all" />
                        <p className="text-[10px] text-slate-400 mt-1.5">Dipakai buat cari daftar Rencana Evaluasi &amp; sinkron CPMK dari SIAKAD di menu Rekap Nilai. Bisa diisi/diubah belakangan lewat "Edit ID SIAKAD" di bawah.</p>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-4 rounded-xl text-[13px] font-black text-white bg-gradient-to-r from-[#0f4c3a] to-[#16654e] hover:from-[#092e23] hover:to-[#0f4c3a] shadow-lg shadow-[#0f4c3a]/20 transition-all uppercase tracking-widest">
                        {isLoading ? 'Menyimpan...' : 'Tambahkan Mata Kuliah'}
                    </button>
                </form>
            </div>

            {/* BAGIAN 1B: IMPORT MASSAL DARI SIAKAD */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M7 10l5 5 5-5M12 15V3" /></svg>
                    </div>
                    <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-widest">Import Massal dari SIAKAD</h3>
                </div>

                <div className="p-8 space-y-4">
                    <p className="text-[12px] font-medium text-slate-500">Cari mata kuliah di SIAKAD (kosongkan buat tampilkan semua), lalu impor sekaligus ke CBT — kode, nama, dan ID SIAKAD-nya otomatis terisi. Mata kuliah yang sudah ada &amp; sudah punya ID SIAKAD tidak akan ditimpa.</p>
                    <input
                        type="text"
                        value={siakadSearch}
                        onChange={e => setSiakadSearch(e.target.value)}
                        placeholder="Ketik nama/kode buat mempersempit, atau kosongkan utk semua..."
                        className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-800 text-[13px] transition-all"
                    />
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            {siakadLoading ? 'Memuat dari SIAKAD...' : `${filteredSiakadCourses.length} mata kuliah siap diimpor`}
                        </p>
                        <button
                            type="button"
                            onClick={handleBulkImportSiakad}
                            disabled={importingSiakad || siakadLoading || filteredSiakadCourses.length === 0}
                            className="shrink-0 px-5 py-3 rounded-xl text-[12px] font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {importingSiakad ? 'Mengimpor...' : `Import ${filteredSiakadCourses.length || ''} dari SIAKAD`}
                        </button>
                    </div>
                </div>
            </div>

            {/* BAGIAN 2: BUKU NILAI (GRADEBOOK) DENGAN DROPDOWN */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-10">
                
                {/* Header & Dropdown */}
                <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-[18px] font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Gradebook & Rekap Nilai
                            </h3>
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pilih mata kuliah untuk melihat nilai mahasiswa</p>
                        </div>
                        
                        <div className="w-full md:w-96 flex gap-2 items-start">
                            <select value={selectedMkId} onChange={(e) => { setSelectedMkId(e.target.value); fetchScores(e.target.value); }} className="flex-1 px-5 py-3.5 bg-blue-50/50 rounded-xl border border-blue-200 focus:bg-white focus:border-blue-500 outline-none font-bold text-blue-900 text-[13px] transition-all shadow-sm">
                                <option value="">-- Pilih Mata Kuliah --</option>
                                {matkulList?.data?.map((mk, idx) => (
                                    <option key={mk.id || idx} value={mk.id || mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}{mk.siakad_id ? ' ✓' : ''}</option>
                                ))}
                            </select>
                            <button type="button" onClick={handleEditSiakadId} disabled={!selectedMkId} className="shrink-0 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white text-[#0f4c3a] border border-[#0f4c3a]/20 hover:bg-[#0f4c3a]/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Edit ID SIAKAD mata kuliah ini">
                                🔗 ID SIAKAD
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabel Hasil Nilai */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-white">
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nama Mahasiswa</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Sesi Ujian</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status Evaluasi</th>
                                <th className="py-4 px-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Skor Akhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!selectedMkId ? (
                                <tr><td colSpan="4" className="py-16 text-center text-slate-400 font-bold text-sm">Silakan pilih mata kuliah pada dropdown di atas.</td></tr>
                            ) : (!scoreList?.data || scoreList.data.length === 0) ? (
                                <tr><td colSpan="4" className="py-16 text-center text-slate-400 font-bold text-sm">Belum ada data nilai mahasiswa di mata kuliah ini.</td></tr>
                            ) : (
                                scoreList?.data?.map((score, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-5 px-8">
                                            <p className="text-[14px] font-black text-[#0f4c3a]">{score.nama_mahasiswa}</p>
                                        </td>
                                        <td className="py-5 px-8">
                                            <p className="text-[13px] font-bold text-slate-700">{score.nama_ujian}</p>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${score.status === 'Selesai' ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                {score.status}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <span className={`text-[20px] font-black ${score.status === 'Selesai' ? 'text-slate-800' : 'text-slate-300'}`}>
                                                {score.status === 'Selesai' ? parseFloat(Number(score.total_skor).toFixed(2)) : '??'}
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