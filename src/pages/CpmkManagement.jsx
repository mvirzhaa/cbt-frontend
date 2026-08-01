import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import cpmkService from '../services/cpmk.service';

const swalFormClass = {
    popup: 'rounded-2xl',
    confirmButton: 'px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider bg-[#0f4c3a] text-white mx-1',
    cancelButton: 'px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 mx-1'
};

export default function CpmkManagement() {
    const [matkulList, setMatkulList] = useState([]);
    const [selectedKodeMk, setSelectedKodeMk] = useState('');
    const [cpmkList, setCpmkList] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    const fetchMatkul = async () => {
        try {
            const data = await matkulService.getMatkul();
            setMatkulList(data || []);
        } catch (error) { console.error("Gagal menarik data matkul", error); }
    };

    const fetchCpmk = async () => {
        try {
            const data = await cpmkService.getCpmk({ kode_mk: selectedKodeMk });
            setCpmkList(data?.data || []);
        } catch (error) { console.error("Gagal menarik data CPMK", error); }
    };

    useEffect(() => { fetchMatkul(); }, []);
    useEffect(() => {
        if (selectedKodeMk) fetchCpmk();
        else setCpmkList([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKodeMk]);

    const openCpmkForm = async (existing = null) => {
        const { value: formValues } = await Swal.fire({
            title: existing ? 'Ubah CPMK' : 'Tambah CPMK Baru',
            html: `
                <div class="text-left space-y-3 mt-2">
                    <div>
                        <label class="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">Kode CPMK</label>
                        <input id="swal-kode-cpmk" class="swal2-input !m-0 !w-full" placeholder="CPMK-1" value="${existing?.kode_cpmk || ''}">
                    </div>
                    <div>
                        <label class="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">Deskripsi</label>
                        <textarea id="swal-deskripsi-cpmk" class="swal2-textarea !m-0 !w-full" placeholder="Deskripsi capaian pembelajaran mata kuliah...">${existing?.deskripsi || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">ID SIAKAD (external_id, opsional)</label>
                        <input id="swal-external-id-cpmk" class="swal2-input !m-0 !w-full" placeholder="uuid CPMK di SIAKAD — bisa diisi lewat 'Sync CPMK' di Rekap Nilai" value="${existing?.external_id || ''}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: existing ? 'Simpan Perubahan' : 'Tambah',
            cancelButtonText: 'Batal',
            buttonsStyling: false,
            customClass: swalFormClass,
            preConfirm: () => {
                const kode_cpmk = document.getElementById('swal-kode-cpmk').value.trim();
                const deskripsi = document.getElementById('swal-deskripsi-cpmk').value.trim();
                const external_id = document.getElementById('swal-external-id-cpmk').value.trim();
                if (!kode_cpmk || !deskripsi) {
                    Swal.showValidationMessage('Kode CPMK dan deskripsi wajib diisi.');
                    return false;
                }
                return { kode_cpmk, deskripsi, external_id: external_id || null };
            }
        });

        if (!formValues) return;

        try {
            if (existing) {
                await cpmkService.updateCpmk(existing.id, formValues);
            } else {
                await cpmkService.createCpmk({ kode_mk: selectedKodeMk, ...formValues });
            }
            fetchCpmk();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'CPMK tersimpan!', showConfirmButton: false, timer: 1800 });
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan CPMK.', 'error');
        }
    };

    const handleDeleteCpmk = async (cpmk) => {
        const result = await Swal.fire({
            title: `Hapus ${cpmk.kode_cpmk}?`,
            text: 'Seluruh Sub-CPMK di dalamnya juga akan terhapus.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });
        if (!result.isConfirmed) return;

        try {
            await cpmkService.deleteCpmk(cpmk.id);
            fetchCpmk();
        } catch (error) {
            Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus CPMK.', 'error');
        }
    };

    const openSubCpmkForm = async (cpmkId, existing = null) => {
        const { value: formValues } = await Swal.fire({
            title: existing ? 'Ubah Sub-CPMK' : 'Tambah Sub-CPMK',
            html: `
                <div class="text-left space-y-3 mt-2">
                    <div>
                        <label class="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">Kode Sub-CPMK</label>
                        <input id="swal-kode-sub" class="swal2-input !m-0 !w-full" placeholder="Sub-CPMK-1.1" value="${existing?.kode_sub_cpmk || ''}">
                    </div>
                    <div>
                        <label class="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">Deskripsi</label>
                        <textarea id="swal-deskripsi-sub" class="swal2-textarea !m-0 !w-full" placeholder="Deskripsi sub capaian pembelajaran...">${existing?.deskripsi || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-widest">ID SIAKAD (external_id, opsional)</label>
                        <input id="swal-external-id-sub" class="swal2-input !m-0 !w-full" placeholder="uuid Sub-CPMK di SIAKAD — bisa diisi lewat 'Sync CPMK' di Rekap Nilai" value="${existing?.external_id || ''}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: existing ? 'Simpan Perubahan' : 'Tambah',
            cancelButtonText: 'Batal',
            buttonsStyling: false,
            customClass: swalFormClass,
            preConfirm: () => {
                const kode_sub_cpmk = document.getElementById('swal-kode-sub').value.trim();
                const deskripsi = document.getElementById('swal-deskripsi-sub').value.trim();
                const external_id = document.getElementById('swal-external-id-sub').value.trim();
                if (!kode_sub_cpmk || !deskripsi) {
                    Swal.showValidationMessage('Kode Sub-CPMK dan deskripsi wajib diisi.');
                    return false;
                }
                return { kode_sub_cpmk, deskripsi, external_id: external_id || null };
            }
        });

        if (!formValues) return;

        try {
            if (existing) {
                await cpmkService.updateSubCpmk(existing.id, formValues);
            } else {
                await cpmkService.createSubCpmk(cpmkId, formValues);
            }
            fetchCpmk();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Sub-CPMK tersimpan!', showConfirmButton: false, timer: 1800 });
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan Sub-CPMK.', 'error');
        }
    };

    const handleDeleteSubCpmk = async (subCpmk) => {
        const result = await Swal.fire({
            title: `Hapus ${subCpmk.kode_sub_cpmk}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });
        if (!result.isConfirmed) return;

        try {
            await cpmkService.deleteSubCpmk(subCpmk.id);
            fetchCpmk();
        } catch (error) {
            Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus Sub-CPMK.', 'error');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8 pb-12">

            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">CPMK & Sub-CPMK</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">Patokan capaian pembelajaran per mata kuliah — jadi acuan soal manual maupun soal generate AI di Bank Soal.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-100 p-6 md:p-8">
                <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Mata Kuliah Aktif</label>
                <select value={selectedKodeMk} onChange={e => setSelectedKodeMk(e.target.value)} className="w-full md:w-1/2 px-5 py-4 bg-slate-50 rounded-xl border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[14px] transition-all cursor-pointer appearance-none shadow-sm">
                    <option value="">-- Pilih Mata Kuliah --</option>
                    {matkulList?.data?.map((mk) => (
                        <option key={mk.kode_mk} value={mk.kode_mk}>{mk.kode_mk} - {mk.nama_mk}</option>
                    ))}
                </select>
            </div>

            {selectedKodeMk && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => openCpmkForm()} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest bg-[#0f4c3a] hover:bg-[#092e23] text-[#d4af37] shadow-lg shadow-[#0f4c3a]/30 transition-all active:scale-95">
                            + Tambah CPMK
                        </button>
                    </div>

                    {cpmkList.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400 font-bold text-[14px]">Belum ada CPMK untuk mata kuliah ini.</div>
                    ) : (
                        cpmkList.map(c => {
                            const isExpanded = expandedId === c.id;
                            return (
                                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-6 flex items-start justify-between gap-4">
                                        <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="flex-1 text-left flex items-start gap-3">
                                            <span className={`mt-1 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0f4c3a]/10 text-[#0f4c3a] border border-[#0f4c3a]/20">{c.kode_cpmk}</span>
                                                    <span className="text-[11px] font-bold text-slate-400">{(c.sub_cpmk || []).length} Sub-CPMK</span>
                                                    {c.external_id ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200" title={c.external_id}>✓ SIAKAD</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-200">Belum SIAKAD</span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-[14px] font-semibold text-slate-800 leading-relaxed">{c.deskripsi}</p>
                                            </div>
                                        </button>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => openCpmkForm(c)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors shadow-sm" title="Edit CPMK">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDeleteCpmk(c)} className="p-2.5 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm" title="Hapus CPMK">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 pl-12 space-y-3 border-t border-slate-100 pt-5">
                                            {(c.sub_cpmk || []).length === 0 ? (
                                                <p className="text-[12px] font-semibold text-slate-400 italic">Belum ada Sub-CPMK.</p>
                                            ) : (
                                                c.sub_cpmk.map(sc => (
                                                    <div key={sc.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                                                        <div>
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">{sc.kode_sub_cpmk}</span>
                                                            {sc.external_id ? (
                                                                <span className="ml-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200" title={sc.external_id}>✓ SIAKAD</span>
                                                            ) : (
                                                                <span className="ml-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-200">Belum SIAKAD</span>
                                                            )}
                                                            <p className="mt-1.5 text-[13px] font-semibold text-slate-700 leading-relaxed">{sc.deskripsi}</p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button onClick={() => openSubCpmkForm(c.id, sc)} className="p-2 rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors" title="Edit Sub-CPMK">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteSubCpmk(sc)} className="p-2 rounded-lg bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors" title="Hapus Sub-CPMK">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            <button onClick={() => openSubCpmkForm(c.id)} className="inline-flex items-center gap-2 text-[11px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors">
                                                + Tambah Sub-CPMK
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

        </motion.div>
    );
}
