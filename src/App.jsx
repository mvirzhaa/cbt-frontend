import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout'; 
import DashboardOverview from './pages/DashboardOverview'; 
import AdminDashboard from './pages/AdminDashboard';
import TakeExam from './pages/TakeExam';
import ManageQuestions from './pages/ManageQuestions';
import CreateExam from './pages/CreateExam';
import Grading from './pages/Grading';
import StudentDashboard from './pages/StudentDashboard';
import ManageMatkul from './pages/ManageMatkul'; // BARU

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* 🌟 SEMUA YANG BUTUH SIDEBAR ADA DI SINI */}
        <Route element={<DashboardLayout />}>
            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Dosen */}
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/manage-matkul" element={<ManageMatkul />} /> {/* BARU */}
            <Route path="/manage-questions" element={<ManageQuestions />} />
            <Route path="/create-exam" element={<CreateExam />} />
            <Route path="/grading" element={<Grading />} />

            {/* Mahasiswa */}
            <Route path="/student-dashboard" element={<StudentDashboard />} /> {/* BARU */}
            <Route path="/take-exam" element={<TakeExam />} /> {/* DIPINDAHKAN KE SINI */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;