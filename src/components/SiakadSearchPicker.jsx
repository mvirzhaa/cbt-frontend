// Picker generik "cari & pilih dari SIAKAD" — dipakai buat matkul
// (ManageMatkul.jsx, AdminDashboard.jsx) dan Sub-CPMK (ExamQuestions.jsx).
// Search & filtering item jadi tanggung jawab pemanggil (item yang masuk ke
// sini dianggap sudah terfilter), komponen ini cuma urus tampilan input +
// dropdown + klik-pilih.
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
    return (
        <div className="mb-6 relative">
            {label && <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">{label}</label>}
            <input
                type="text"
                value={searchValue}
                onChange={e => { onSearchChange(e.target.value); onOpenChange(true); }}
                onFocus={() => onOpenChange(true)}
                onBlur={() => setTimeout(() => onOpenChange(false), 150)}
                placeholder={loading ? 'Memuat data dari SIAKAD...' : placeholder}
                className="w-full px-5 py-4 bg-slate-50 rounded-xl border border-slate-200 outline-none text-[13px] font-bold text-slate-700 shadow-sm transition-all focus:bg-white focus:border-[#0f4c3a] focus:ring-4 focus:ring-[#0f4c3a]/10"
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
