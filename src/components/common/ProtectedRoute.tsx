import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute({
  children,
  adminOnly = false,
  allowTempPin = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  /** Se true, permite acessar mesmo com PIN temporário (apenas /trocar-pin). */
  allowTempPin?: boolean;
}) {
  const session = useAuthStore(s => s.session);
  const loc = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  // Força troca de PIN antes de qualquer rota do app.
  if (!allowTempPin && session.user.pin_temporario) {
    return <Navigate to="/trocar-pin" replace />;
  }
  if (adminOnly && session.user.perfil !== 'admin') {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
