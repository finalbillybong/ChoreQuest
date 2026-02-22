import { lazy, Suspense, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './components/Layout';
import UpgradePrompt from './components/UpgradePrompt';
import WelcomeModal from './components/WelcomeModal';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SaasLogin = lazy(() => import('./pages/SaasLogin'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const KidDashboard = lazy(() => import('./pages/KidDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Chores = lazy(() => import('./pages/Chores'));
const ChoreDetail = lazy(() => import('./pages/ChoreDetail'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Profile = lazy(() => import('./pages/Profile'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Events = lazy(() => import('./pages/Events'));
const KidQuests = lazy(() => import('./pages/KidQuests'));
const Party = lazy(() => import('./pages/Party'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-sky font-medium text-sm animate-pulse">Loading...</div>
    </div>
  );
}

export default function App() {
  const { user, family, loading, saas, refreshSession } = useAuth();

  const handleWsMessage = useCallback((msg) => {
    refreshSession();
    window.dispatchEvent(new CustomEvent('ws:message', { detail: msg }));
  }, [refreshSession]);

  useWebSocket(user?.id, handleWsMessage);

  if (loading) return <Loading />;

  // --- Not logged in ---
  if (!user) {
    if (saas) {
      return (
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="*" element={<SaasLogin />} />
          </Routes>
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // --- SaaS: logged in but no family yet -> onboarding ---
  if (saas && family === null) {
    return (
      <Suspense fallback={<Loading />}>
        <Onboarding />
      </Suspense>
    );
  }

  const DashboardComponent = user.role === 'kid' ? KidDashboard
    : user.role === 'parent' ? ParentDashboard
    : ParentDashboard;

  return (
    <>
      <Layout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<DashboardComponent />} />
            <Route path="/chores" element={<Chores />} />
            <Route path="/chores/:id" element={<ChoreDetail />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/inventory" element={<Navigate to="/rewards?tab=inventory" replace />} />
            <Route path="/wishlist" element={<Navigate to="/rewards?tab=wishlist" replace />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/party" element={<Party />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/events" element={<Events />} />
            <Route path="/kids/:kidId" element={<KidQuests />} />
            <Route path="/settings" element={<Settings />} />
            {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      {saas && <UpgradePrompt />}
      {saas && <WelcomeModal />}
    </>
  );
}
