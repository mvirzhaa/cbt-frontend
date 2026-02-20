import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function RekapNilai() {
    const [matkulList, setMatkulList] = useState([]);
    const [selectedMk, setSelectedMk] = useState('');
    const [scores, setScores] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:3000/api/matakuliah', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(res => setMatkulList(res.data.data || []));
    }, []);

    const fetchScores = (mkId) => {
        setSelectedMk(mkId);
        if(!mkId) return setScores([]);
        
        axios.get(`http://localhost:3000/api/matakuliah/${mkId}/scores`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(res => setScores(res.data.data || []))
            .catch(err => console.error(err));
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-2xl font-black text-slate-800">📊 Rekapitulasi Nilai Akhir</h2>
            
            {/* Filter Matkul */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Pilih Mata Kuliah</label>
                <select value={selectedMk} onChange={(e) => fetchScores(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih Matkul --</option>
                    {matkulList.map((m, i) => (
                        <option key={i} value={m.kode_mk || m.id}>{m.kode_mk} - {m.nama_mk}</option>
                    ))}
                </select>
            </div>

            {/* Tabel Nilai */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase">Mahasiswa</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase">Ujian</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase text-center">Status</th>
                            <th className="p-4 text-xs font-black text-slate-500 uppercase text-right">Total Skor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {scores.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Belum ada data nilai untuk mata kuliah ini.</td></tr>
                        ) : (
                            scores.map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-700">{s.nama_mahasiswa}</td>
<td className="p-4 text-sm text-slate-600">{s.nama_ujian}</td>
<td className="p-4 text-center">
    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${s.status === 'Selesai' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {s.status}
    </span>
</td>
<td className="p-4 text-right font-black text-lg text-blue-900">{Math.round(s.total_skor)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}