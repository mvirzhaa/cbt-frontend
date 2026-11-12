import { Component, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from './components/RouteGuards';
import { AuthProvider } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SsoCallback = lazy(() => import('./pages/SsoCallback'));
const Profile = lazy(() => import('./pages/profile'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview'));
const ManageQuestions = lazy(() => import('./pages/ManageQuestions'));
const ExamQuestions = lazy(() => import('./pages/ExamQuestions'));
const CpmkManagement = lazy(() => import('./pages/CpmkManagement'));
const CreateExam = lazy(() => import('./pages/CreateExam'));
const PenilaianUjian = lazy(() => import('./pages/PenilaianUjian'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TakeExam = lazy(() => import('./pages/TakeExam'));
const PanduanUjian = lazy(() => import('./pages/PanduanUjian'));
const ManageMateri = lazy(() => import('./pages/ManageMateri'));
const StudentMateri = lazy(() => import('./pages/StudentMateri'));
const AiProctoring = lazy(() => import('./pages/AiProctoring'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-semibold">
      Memuat halaman...
    </div>
  );
}

// FIX "blank putih pas pindah menu": halaman di-lazy() + Suspense tapi
// sebelumnya tanpa Error Boundary. Kalau dynamic import() gagal (chunk hash
// berubah karena ada deploy baru sementara tab lama masih kebuka, atau
// gangguan jaringan sesaat), React lempar error pas render & gak ada yang
// nangkep -> seluruh tree react-router ke-unmount -> blank putih, baru
// normal lagi setelah manual refresh (ambil index.html + manifest baru).
// Auto-reload SEKALI (ditandai sessionStorage, biar gak infinite-reload-loop
// kalau errornya bug beneran bukan stale chunk) buat nutup celah ini tanpa
// user harus sadar & refresh manual sendiri.
const CHUNK_RELOAD_FLAG = 'cbt_chunk_reload_once';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Gagal memuat halaman:', error);
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1';
    if (!alreadyReloaded) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-600 text-sm font-semibold px-6 text-center">
        <p>{alreadyReloaded ? 'Gagal memuat halaman ini.' : 'Terjadi kesalahan, memuat ulang...'}</p>
        {alreadyReloaded && (
          <button
            type="button"
            onClick={() => { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); window.location.reload(); }}
            className="px-5 py-2.5 rounded-xl bg-[#0f4c3a] text-white uppercase tracking-widest text-xs font-black"
          >
            Muat Ulang
          </button>
        )}
      </div>
    );
  }
}

function App() {
  useEffect(() => {
    // Mount sukses (gak ke-catch RouteErrorBoundary) -> reset eligibility
    // auto-reload buat kejadian chunk-load-error berikutnya di sesi ini.
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter basename="/cbt">
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/sso" element={<SsoCallback />} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

              <Route path="/take-exam" element={<RequireRole allow={['student']}><TakeExam /></RequireRole>} />

              <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
                <Route path="/panduan" element={<PanduanUjian />} />

                <Route path="/admin" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="overview" /></RequireRole>} />
                <Route path="/admin/verifikasi" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="verifikasi" /></RequireRole>} />
                <Route path="/admin/pengguna" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="pengguna" /></RequireRole>} />
                <Route path="/admin/matkul" element={<RequireRole allow={['admin']}><AdminDashboard activeMenu="matkul" /></RequireRole>} />
                {/* Materi Kuliah & CPMK & Sub-CPMK dipindah admin-only -- lihat CLAUDE.md */}
                <Route path="/manage-materi" element={<RequireRole allow={['admin']}><ManageMateri /></RequireRole>} />
                <Route path="/cpmk" element={<RequireRole allow={['admin']}><CpmkManagement /></RequireRole>} />

                <Route path="/dashboard" element={<RequireRole allow={['lecturer']}><DashboardOverview /></RequireRole>} />
                <Route path="/manage-questions" element={<RequireRole allow={['lecturer']}><ManageQuestions /></RequireRole>} />
                <Route path="/exams/:examId/soal" element={<RequireRole allow={['lecturer']}><ExamQuestions /></RequireRole>} />
                <Route path="/create-exam" element={<RequireRole allow={['lecturer']}><CreateExam /></RequireRole>} />
                {/* Penilaian & Evaluasi + Rekap Nilai Akhir digabung jadi 1 halaman 3 tab.
                    Route /rekap-nilai dipertahankan (tidak lagi di menu) murni buat
                    kompatibilitas deep-link lama dari LMS fe-ucl. */}
                <Route path="/grading" element={<RequireRole allow={['lecturer']}><PenilaianUjian /></RequireRole>} />
                <Route path="/rekap-nilai" element={<RequireRole allow={['lecturer']}><PenilaianUjian /></RequireRole>} />
                <Route path="/ai-proctoring" element={<RequireRole allow={['lecturer']}><AiProctoring /></RequireRole>} />

                <Route path="/student-dashboard" element={<RequireRole allow={['student']}><StudentDashboard /></RequireRole>} />
                <Route path="/student-materi" element={<RequireRole allow={['student']}><StudentMateri /></RequireRole>} />
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
