import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import matkulService from '../services/matkul.service';
import cpmkService from '../services/cpmk.service';
import siakadService from '../services/siakad.service';
import MatkulSelect from '../components/MatkulSelect';

export default function CpmkManagement() {
    const [matkulList, setMatkulList] = useState([]);
    const [selectedKodeMk, setSelectedKodeMk] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [search, setSearch] = useState('');

    // Pohon CPMK/Sub-CPMK LIVE dari SIAKAD (sumber kebenaran) — dipakai
    // sebagai daftar yang bisa diimpor, bukan dicocokkan terhadap data lokal.
    const [siakadCpmkData, setSiakadCpmkData] = useState({ cpmkData: [] });
    const [siakadLoading, setSiakadLoading] = useState(false);

    // Shadow record lokal (hasil impor) — cuma dipakai buat tahu item SIAKAD
    // mana yang sudah diimpor (badge) dan buat cari cpmk_id/sub_cpmk_id saat
    // dipakai di soal.
    const [localCpmkList, setLocalCpmkList] = useState([]);
    const [localLoading, setLocalLoading] = useState(false);

    const [busyKey, setBusyKey] = useState(null);

    const fetchMatkul = async () => {
        try {
            const data = await matkulService.getMatkul();
            setMatkulList(data || []);
        } catch (error) { console.error("Gagal menarik data matkul", error); }
    };

    const selectedMk = matkulList?.data?.find(mk => mk.kode_mk === selectedKodeMk) || null;

    const fetchSiakadCpmk = useCallback(async (kodeMk) => {
        setSiakadLoading(true);
        try {
            const result = await siakadService.getPemetaanCpmk(kodeMk);
            setSiakadCpmkData(result?.data || { cpmkData: [] });
        } catch (error) {
            console.error("Gagal menarik Pemetaan CPMK dari SIAKAD.", error);
            Swal.fire('Gagal', error.response?.data?.message || 'Gagal menarik Pemetaan CPMK dari SIAKAD.', 'error');
        } finally {
            setSiakadLoading(false);
        }
    }, []);

    const fetchLocalCpmk = useCallback(async (kodeMk) => {
        setLocalLoading(true);
        try {
            const data = await cpmkService.getCpmk({ kode_mk: kodeMk });
            setLocalCpmkList(data?.data || []);
        } catch (error) {
            console.error("Gagal menarik data CPMK lokal", error);
        } finally {
            setLocalLoading(false);
        }
    }, []);

    useEffect(() => { fetchMatkul(); }, []);

    useEffect(() => {
        if (selectedMk?.siakad_id) {
            fetchSiakadCpmk(selectedKodeMk);
            fetchLocalCpmk(selectedKodeMk);
        } else {
            setSiakadCpmkData({ cpmkData: [] });
            setLocalCpmkList([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKodeMk, selectedMk?.siakad_id]);

    // Peta external_id (uuid SIAKAD) -> row lokal, biar kelihatan mana yang
    // sudah diimpor tanpa cocok-cocokan kode.
    const localCpmkByExternal = useMemo(
        () => new Map(localCpmkList.filter(c => c.external_id).map(c => [c.external_id, c])),
        [localCpmkList]
    );
    const localSubByExternal = useMemo(
        () => new Map(localCpmkList.flatMap(c => (c.sub_cpmk || []).filter(s => s.external_id).map(s => [s.external_id, s]))),
        [localCpmkList]
    );

    const filteredCpmkData = useMemo(() => {
        const all = siakadCpmkData?.cpmkData || [];
        const q = search.trim().toLowerCase();
        if (!q) return all;
        return all.filter(c => {
            const subs = c.subCpmk || c.sub_cpmk || [];
            const selfMatch = c.kode?.toLowerCase().includes(q) || c.deskripsi?.toLowerCase().includes(q);
            const subMatch = subs.some(s => s.kode?.toLowerCase().includes(q) || s.deskripsi?.toLowerCase().includes(q));
            return selfMatch || subMatch;
        });
    }, [siakadCpmkData, search]);

    const handleImport = async (cpmkItem, subItem = null) => {
        const key = subItem ? `sub-${subItem.id}` : `cpmk-${cpmkItem.id}`;
        setBusyKey(key);
        try {
            await siakadService.resolveCpmk(selectedKodeMk, {
                cpmk: { kode: cpmkItem.kode, deskripsi: cpmkItem.deskripsi, external_id: cpmkItem.id },
                sub_cpmk: subItem ? { kode: subItem.kode, deskripsi: subItem.deskripsi, external_id: subItem.id } : undefined
            });
            await fetchLocalCpmk(selectedKodeMk);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Berhasil diimpor dari SIAKAD!', showConfirmButton: false, timer: 1500 });
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Gagal mengimpor dari SIAKAD.', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const handleImportAllSubs = async (cpmkItem) => {
        const subs = cpmkItem.subCpmk || cpmkItem.sub_cpmk || [];
        const belumImpor = subs.filter(s => !localSubByExternal.has(s.id));
        if (belumImpor.length === 0) return;

        setBusyKey(`bulk-${cpmkItem.id}`);
        try {
            for (const sub of belumImpor) {
                await siakadService.resolveCpmk(selectedKodeMk, {
                    cpmk: { kode: cpmkItem.kode, deskripsi: cpmkItem.deskripsi, external_id: cpmkItem.id },
                    sub_cpmk: { kode: sub.kode, deskripsi: sub.deskripsi, external_id: sub.id }
                });
            }
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${belumImpor.length} Sub-CPMK diimpor!`, showConfirmButton: false, timer: 1800 });
        } catch (error) {
            Swal.fire('Sebagian Gagal', error.response?.data?.message || 'Sebagian Sub-CPMK gagal diimpor, coba impor satu-satu.', 'warning');
        } finally {
            await fetchLocalCpmk(selectedKodeMk);
            setBusyKey(null);
        }
    };

    const handleUnlink = async (type, localRow) => {
        const label = type === 'cpmk' ? localRow.kode_cpmk : localRow.kode_sub_cpmk;
        const result = await Swal.fire({
            title: `Hapus ${label} dari CBT?`,
            text: 'Data di SIAKAD tidak berubah — bisa diimpor lagi kapan saja lewat tombol Impor.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });
        if (!result.isConfirmed) return;

        const key = type === 'cpmk' ? `cpmk-${localRow.external_id}` : `sub-${localRow.external_id}`;
        setBusyKey(key);
        try {
            if (type === 'cpmk') await cpmkService.deleteCpmk(localRow.id);
            else await cpmkService.deleteSubCpmk(localRow.id);
            await fetchLocalCpmk(selectedKodeMk);
        } catch (error) {
            Swal.fire('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menghapus.', 'error');
        } finally {
            setBusyKey(null);
        }
    };

    const ImportBadge = ({ imported, busy, onImport, onUnlink }) => {
        if (imported) {
            return (
                <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Diimpor</span>
                    <button onClick={onUnlink} disabled={busy} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-40">
                        {busy ? '...' : 'Hapus'}
                    </button>
                </div>
            );
        }
        return (
            <button onClick={onImport} disabled={busy} className="shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0f4c3a] text-[#d4af37] hover:bg-[#092e23] transition-colors disabled:opacity-40">
                {busy ? 'Mengimpor...' : '⬇ Impor'}
            </button>
        );
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8 pb-12">

            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">CPMK & Sub-CPMK</h3>
                <p className="text-[14px] font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">
                    Daftar CPMK/Sub-CPMK ditarik langsung dari SIAKAD — tinggal pilih mana yang mau dipakai di CBT, tanpa perlu mengetik ulang atau mencocokkan kode secara manual.
                </p>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-100 p-6 md:p-8">
                <label className="block text-[11px] font-black text-slate-500 mb-3 uppercase tracking-widest">Mata Kuliah Aktif</label>
                <div className="w-full md:w-1/2">
                    <MatkulSelect matkulList={matkulList} value={selectedKodeMk} onChange={setSelectedKodeMk} />
                </div>
            </div>

            {selectedKodeMk && !selectedMk?.siakad_id && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-2">
                    <p className="text-[14px] font-black text-amber-800">Mata kuliah ini belum terhubung ke SIAKAD</p>
                    <p className="text-[12px] font-semibold text-amber-700 max-w-md mx-auto">
                        Set ID SIAKAD dulu di menu <b>Mata Kuliah</b> sebelum CPMK/Sub-CPMK-nya bisa diimpor ke sini.
                    </p>
                </div>
            )}

            {selectedKodeMk && selectedMk?.siakad_id && (
                <div className="space-y-4">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari kode atau deskripsi CPMK/Sub-CPMK..."
                        className="w-full px-5 py-3.5 bg-white rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-800 text-[13px] transition-all shadow-sm"
                    />

                    {(siakadLoading || localLoading) && filteredCpmkData.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400 font-bold text-[14px] animate-pulse">Memuat data dari SIAKAD...</div>
                    ) : filteredCpmkData.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center text-slate-400 font-bold text-[14px]">
                            {search.trim() ? 'Tidak ada CPMK/Sub-CPMK yang cocok.' : 'Belum ada CPMK/Sub-CPMK untuk mata kuliah ini di SIAKAD.'}
                        </div>
                    ) : (
                        filteredCpmkData.map(c => {
                            const subs = c.subCpmk || c.sub_cpmk || [];
                            const isLeaf = subs.length === 0;
                            const isExpanded = expandedId === c.id;
                            const localCpmk = localCpmkByExternal.get(c.id);
                            const belumImporCount = subs.filter(s => !localSubByExternal.has(s.id)).length;

                            return (
                                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-6 flex items-start justify-between gap-4">
                                        <button onClick={() => !isLeaf && setExpandedId(isExpanded ? null : c.id)} disabled={isLeaf} className="flex-1 text-left flex items-start gap-3 disabled:cursor-default">
                                            {!isLeaf && (
                                                <span className={`mt-1 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                </span>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#0f4c3a]/10 text-[#0f4c3a] border border-[#0f4c3a]/20">{c.kode}</span>
                                                    <span className="text-[11px] font-bold text-slate-400">{isLeaf ? 'CPMK (langsung)' : `${subs.length} Sub-CPMK`}</span>
                                                </div>
                                                <p className="mt-2 text-[14px] font-semibold text-slate-800 leading-relaxed">{c.deskripsi}</p>
                                            </div>
                                        </button>
                                        {isLeaf ? (
                                            <ImportBadge
                                                imported={!!localCpmk}
                                                busy={busyKey === `cpmk-${c.id}`}
                                                onImport={() => handleImport(c)}
                                                onUnlink={() => handleUnlink('cpmk', localCpmk)}
                                            />
                                        ) : belumImporCount > 0 && (
                                            <button onClick={() => handleImportAllSubs(c)} disabled={busyKey === `bulk-${c.id}`} className="shrink-0 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
                                                {busyKey === `bulk-${c.id}` ? 'Mengimpor...' : `⬇ Impor Semua (${belumImporCount})`}
                                            </button>
                                        )}
                                    </div>

                                    {!isLeaf && isExpanded && (
                                        <div className="px-6 pb-6 pl-12 space-y-3 border-t border-slate-100 pt-5">
                                            {subs.map(sub => {
                                                const localSub = localSubByExternal.get(sub.id);
                                                return (
                                                    <div key={sub.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                                                        <div>
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">{sub.kode}</span>
                                                            <p className="mt-1.5 text-[13px] font-semibold text-slate-700 leading-relaxed">{sub.deskripsi}</p>
                                                        </div>
                                                        <ImportBadge
                                                            imported={!!localSub}
                                                            busy={busyKey === `sub-${sub.id}`}
                                                            onImport={() => handleImport(c, sub)}
                                                            onUnlink={() => handleUnlink('sub', localSub)}
                                                        />
                                                    </div>
                                                );
                                            })}
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
