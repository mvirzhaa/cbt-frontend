import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from './components/RouteGuards';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/profile'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const ManageQuestions = lazy(() => import('./pages/ManageQuestions'));
const CreateExam = lazy(() => import('./pages/CreateExam'));
const Grading = lazy(() => import('./pages/Grading'));
const RekapNilai = lazy(() => import('./pages/RekapNilai'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TakeExam = lazy(() => import('./pages/TakeExam'));
const ManageMatkul = lazy(() => import('./pages/ManageMatkul'));
const PanduanUjian = lazy(() => import('./pages/PanduanUjian'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-semibold">
      Memuat halaman...
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          <Route path="/take-exam" element={<RequireRole allow={['student']}><TakeExam /></RequireRole>} />

          <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route path="/panduan" element={<PanduanUjian />} />

            <Route path="/admin" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="overview" /></RequireRole>} />
            <Route path="/admin/verifikasi" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="verifikasi" /></RequireRole>} />
            <Route path="/admin/pengguna" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="pengguna" /></RequireRole>} />
            <Route path="/admin/matkul" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="matkul" /></RequireRole>} />

            <Route path="/dashboard" element={<RequireRole allow={['lecturer']}><DashboardOverview /></RequireRole>} />
            <Route path="/manage-matkul" element={<RequireRole allow={['lecturer']}><ManageMatkul /></RequireRole>} />
            <Route path="/manage-questions" element={<RequireRole allow={['lecturer']}><ManageQuestions /></RequireRole>} />
            <Route path="/create-exam" element={<RequireRole allow={['lecturer']}><CreateExam /></RequireRole>} />
            <Route path="/grading" element={<RequireRole allow={['lecturer']}><Grading /></RequireRole>} />
            <Route path="/rekap-nilai" element={<RequireRole allow={['lecturer']}><RekapNilai /></RequireRole>} />

            <Route path="/student-dashboard" element={<RequireRole allow={['student']}><StudentDashboard /></RequireRole>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
