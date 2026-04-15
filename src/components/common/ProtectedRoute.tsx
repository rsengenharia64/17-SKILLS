import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const session = useAuthStore(s => s.session);
  const loc = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (adminOnly && session.user.perfil !== 'admin') {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
