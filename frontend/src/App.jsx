import { lazy, Suspense, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const KidDashboard = lazy(() => import('./pages/KidDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Chores = lazy(() => import('./pages/Chores'));
const ChoreDetail = lazy(() => import('./pages/ChoreDetail'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Profile = lazy(() => import('./pages/Profile'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Settings = lazy(() => import('./pages/Settings'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gold font-heading text-sm animate-pulse">Loading...</div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  const handleWsMessage = useCallback((msg) => {
    window.dispatchEvent(new CustomEvent('ws:message', { detail: msg }));
  }, []);

  useWebSocket(user?.id, handleWsMessage);

  if (loading) return <Loading />;

  if (!user) {
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

  const DashboardComponent = user.role === 'kid' ? KidDashboard
    : user.role === 'parent' ? ParentDashboard
    : ParentDashboard;

  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<DashboardComponent />} />
          <Route path="/chores" element={<Chores />} />
          <Route path="/chores/:id" element={<ChoreDetail />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/settings" element={<Settings />} />
          {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
