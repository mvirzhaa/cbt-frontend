import { useState } from 'react';
import SiakadSearchPicker from './SiakadSearchPicker';

// Dropdown "pilih 1 matkul dari daftar sendiri" (beda sama SiakadSearchPicker
// di ManageMatkul.jsx yang nyari dari katalog SIAKAD buat DIIMPOR) -- dipakai
// di halaman yang cuma butuh milih matkul yang udah ada, tapi listnya kepanjangan
// buat native <select>. State search/open diurus di sini biar pemanggilnya
// tinggal pasang matkulList + value + onChange(kode_mk).
export default function MatkulSelect({ matkulList, value, onChange, placeholder = '-- Pilih Mata Kuliah --' }) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const list = matkulList?.data || [];
    const selected = list.find(mk => mk.kode_mk === value) || null;
    const label = mk => `${mk.kode_mk} - ${mk.nama_mk}${mk.siakad_id ? ' ✓' : ''}`;

    const q = search.trim().toLowerCase();
    const filtered = q
        ? list.filter(mk => mk.nama_mk?.toLowerCase().includes(q) || mk.kode_mk?.toLowerCase().includes(q))
        : list;

    return (
        <SiakadSearchPicker
            label={null}
            searchValue={isOpen ? search : (selected ? label(selected) : '')}
            onSearchChange={setSearch}
            isOpen={isOpen}
            onOpenChange={(open) => setIsOpen(prevOpen => {
                if (open && !prevOpen) setSearch('');
                return open;
            })}
            items={filtered}
            getKey={mk => mk.kode_mk}
            renderItem={mk => <span className="text-[13px] font-bold text-slate-800">{label(mk)}</span>}
            onSelect={mk => { onChange(mk.kode_mk); setIsOpen(false); }}
            placeholder={placeholder}
        />
    );
}