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
import PanduanUjian from './pages/PanduanUjian'; // (Fitur Baru: Panduan Ujian CBT)
import { RequireAuth, RequireRole } from './components/RouteGuards';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. RUTE PUBLIK (Login) */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        

        {/* 2. RUTE KHUSUS UJIAN (Tanpa Sidebar/Layout agar Mahasiswa Fokus) */}
        <Route path="/take-exam" element={<RequireRole allow={['student']}><TakeExam /></RequireRole>} />

        {/* 3. RUTE DASHBOARD (Memakai Sidebar & Header) */}
        <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/panduan" element={<PanduanUjian />} />
            
            {/* ========================================== */}
          {/* 👑 RUTE KHUSUS SUPER ADMIN */}
          {/* ========================================== */}
          <Route path="/admin" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="overview" /></RequireRole>} />
          <Route path="/admin/verifikasi" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="verifikasi" /></RequireRole>} />
          <Route path="/admin/pengguna" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="pengguna" /></RequireRole>} />
          <Route path="/admin/matkul" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="matkul" /></RequireRole>} />

            {/* B. Rute Dosen */}
            <Route path="/dashboard" element={<RequireRole allow={['lecturer']}><DashboardOverview /></RequireRole>} />
            <Route path="/manage-matkul" element={<RequireRole allow={['lecturer']}><ManageMatkul /></RequireRole>} />
            <Route path="/manage-questions" element={<RequireRole allow={['lecturer']}><ManageQuestions /></RequireRole>} />
            <Route path="/create-exam" element={<RequireRole allow={['lecturer']}><CreateExam /></RequireRole>} />
            <Route path="/grading" element={<RequireRole allow={['lecturer']}><Grading /></RequireRole>} />
            <Route path="/rekap-nilai" element={<RequireRole allow={['lecturer']}><RekapNilai /></RequireRole>} />

            {/* C. Rute Mahasiswa */}
            <Route path="/student-dashboard" element={<RequireRole allow={['student']}><StudentDashboard /></RequireRole>} />
            
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
