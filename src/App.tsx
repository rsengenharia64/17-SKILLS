import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { ensureSeeds } from '@/db/seeds';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { ChangePinScreen } from '@/features/auth/ChangePinScreen';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { DailyEntryScreen } from '@/features/daily-entries/DailyEntryScreen';
import { HistoryScreen } from '@/features/history/HistoryScreen';
import { ReportsScreen } from '@/features/reports/ReportsScreen';
import { AdminScreen } from '@/features/admin/AdminScreen';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureSeeds();
        setReady(true);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Falha ao iniciar o banco local.');
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface text-white">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-red-300">
            Erro ao iniciar o banco local
          </h1>
          <p className="text-sm text-white/70 mt-2">{error}</p>
          <p className="text-xs text-white/50 mt-3">
            Libere cookies/IndexedDB para este site, ou reinstale o app.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-white">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-brand-400" />
          Preparando banco local…
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/trocar-pin"
          element={
            <ProtectedRoute allowTempPin>
              <ChangePinScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardScreen />} />
          <Route path="lancamento" element={<DailyEntryScreen />} />
          <Route path="lancamento/:id" element={<DailyEntryScreen />} />
          <Route path="historico" element={<HistoryScreen />} />
          <Route path="relatorios" element={<ReportsScreen />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminScreen />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
