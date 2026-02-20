import { BrowserRouter, Routes, Route } from 'react-router-dom';

// --- AUTH & LAYOUT ---
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout'; 
import Register from './pages/Register'; // (Fitur Baru: Halaman Registrasi)
import Profile from './pages/profile';

// --- HALAMAN ADMIN ---
import AdminDashboard from './pages/AdminDashboard';

// --- HALAMAN DOSEN ---
import DashboardOverview from './pages/DashboardOverview'; 
import ManageQuestions from './pages/ManageQuestions';
import CreateExam from './pages/CreateExam';
import Grading from './pages/Grading';
import RekapNilai from './pages/RekapNilai'; // (Fitur Baru Rekap Nilai Akhir)

// --- HALAMAN MAHASISWA ---
import StudentDashboard from './pages/StudentDashboard';
import TakeExam from './pages/TakeExam';
import ManageMatkul from './pages/ManageMatkul';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. RUTE PUBLIK (Login) */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        

        {/* 2. RUTE KHUSUS UJIAN (Tanpa Sidebar/Layout agar Mahasiswa Fokus) */}
        <Route path="/take-exam" element={<TakeExam />} />

        {/* 3. RUTE DASHBOARD (Memakai Sidebar & Header) */}
        <Route element={<DashboardLayout />}>
            
            {/* ========================================== */}
          {/* 👑 RUTE KHUSUS SUPER ADMIN */}
          {/* ========================================== */}
          <Route path="/admin" element={<AdminDashboard activeMenu="overview" />} />
          <Route path="/admin/verifikasi" element={<AdminDashboard activeMenu="verifikasi" />} />
          <Route path="/admin/pengguna" element={<AdminDashboard activeMenu="pengguna" />} />
          <Route path="/admin/matkul" element={<AdminDashboard activeMenu="matkul" />} />

            {/* B. Rute Dosen */}
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/manage-matkul" element={<ManageMatkul />} />
            <Route path="/manage-questions" element={<ManageQuestions />} />
            <Route path="/create-exam" element={<CreateExam />} />
            <Route path="/grading" element={<Grading />} />
            <Route path="/rekap-nilai" element={<RekapNilai />} />

            {/* C. Rute Mahasiswa */}
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;