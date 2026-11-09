import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/hooks/useSession';

// 로그인 필수 (설계 4.0): 로그인 안 했으면 원래 경로를 들고 /login으로
function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session === undefined) return null;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

export default RequireAuth;
