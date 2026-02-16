import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function ManageMatkul() {
    const [matkulList, setMatkulList] = useState([]);
    const [formMatkul, setFormMatkul] = useState({ kode_mk: '', nama_mk: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { fetchMatkul(); }, []);

    const fetchMatkul = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:3000/api/matakuliah', { headers: { Authorization: `Bearer ${token}` } });
            setMatkulList(response.data.data || []);
        } catch (error) { console.error("Gagal menarik data.", error); }
    };

    const handleTambah = async (e) => {
        e.preventDefault(); setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/matakuliah', formMatkul, { headers: { Authorization: `Bearer ${token}` } });
            setFormMatkul({ kode_mk: '', nama_mk: '' });
            fetchMatkul();
        } catch (error) { alert("Gagal menambahkan mata kuliah."); } 
        finally { setIsLoading(false); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-6">
            <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Data Mata Kuliah</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1">Kelola data mata kuliah yang Anda ampu untuk keperluan Bank Soal.</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <form onSubmit={handleTambah} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Kode MK</label>
                        <input type="text" required value={formMatkul.kode_mk} onChange={e => setFormMatkul({...formMatkul, kode_mk: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-[#0f4c3a] text-[13px] font-bold" placeholder="Misal: IF101" />
                    </div>
                    <div className="flex-[2] w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Mata Kuliah</label>
                        <input type="text" required value={formMatkul.nama_mk} onChange={e => setFormMatkul({...formMatkul, nama_mk: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:border-[#0f4c3a] text-[13px] font-bold" placeholder="Misal: Pemrograman Web" />
                    </div>
                    <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-[#0f4c3a] text-[12px] font-black uppercase tracking-widest rounded-lg h-[42px] transition-all">
                        {isLoading ? 'Menyimpan...' : 'Tambah Data'}
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Kode MK</th>
                            <th className="py-3 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Mata Kuliah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matkulList.map((mk) => (
                            <tr key={mk.kode_mk} className="border-b border-slate-50">
                                <td className="py-3 px-6 font-mono text-[13px] font-black text-slate-700 bg-slate-100/50">{mk.kode_mk}</td>
                                <td className="py-3 px-6 text-[14px] font-bold text-slate-800">{mk.nama_mk}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}