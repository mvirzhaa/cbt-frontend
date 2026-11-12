import { useEffect, useRef } from 'react';

// Picker generik "cari & pilih dari SIAKAD" — dipakai buat matkul
// (AdminDashboard.jsx) dan Sub-CPMK/Kelas Kuliah (ExamQuestions.jsx,
// PenilaianUjian.jsx).
// Search & filtering item jadi tanggung jawab pemanggil (item yang masuk ke
// sini dianggap sudah terfilter), komponen ini cuma urus tampilan input +
// dropdown + klik-pilih.
//
// FIX dropdown "harus pilih lagi": sebelumnya nutup dropdown pakai
// onBlur + setTimeout(150ms). Tiap blur menjadwalkan timer independen yang
// gak pernah dibatalkan -- kalau user blur lalu buru-buru fokus lagi dalam
// <150ms, timer lama tetap nutup paksa dropdown yang baru dibuka ulang
// (keliatan kayak "klik pertama gak kepilih"). Ganti ke pola click-outside
// via ref + mousedown listener (sama kayak ExamMultiSelect di RekapNilai.jsx)
// yang gak punya race condition itu.
export default function SiakadSearchPicker({
    label = 'Cari dari SIAKAD',
    searchValue,
    onSearchChange,
    isOpen,
    onOpenChange,
    items,
    getKey,
    renderItem,
    onSelect,
    loading = false,
    connected = false,
    connectedLabel = 'Terhubung ke SIAKAD',
    placeholder = 'Ketik untuk mencari...',
    maxResults = 50
}) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) onOpenChange(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onOpenChange]);

    return (
        <div className="mb-6 relative" ref={containerRef}>
            {label && <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">{label}</label>}
            <input
                type="text"
                value={searchValue}
                onChange={e => { onSearchChange(e.target.value); onOpenChange(true); }}
                onFocus={() => onOpenChange(true)}
                placeholder={loading ? 'Memuat data dari SIAKAD...' : placeholder}
                title={searchValue}
                className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 outline-none text-[13px] font-bold text-slate-700 shadow-sm transition-all truncate focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10"
            />
            {connected && (
                <span className="inline-flex items-center gap-1.5 mt-2 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {connectedLabel}
                </span>
            )}
            {isOpen && items.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                    {items.slice(0, maxResults).map(item => (
                        <button
                            type="button"
                            key={getKey(item)}
                            onClick={() => onSelect(item)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                            {renderItem(item)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
