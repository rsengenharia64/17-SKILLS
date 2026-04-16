import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { SaveStatus } from '@/components/common/SaveStatus';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: '📊', end: true },
  { to: '/app/lancamento', label: 'Lançamento', icon: '📝' },
  { to: '/app/historico', label: 'Histórico', icon: '🗂️' },
  { to: '/app/relatorios', label: 'Relatórios', icon: '📑' },
  { to: '/app/admin', label: 'Administração', icon: '⚙️', adminOnly: true },
];

export function AppShell() {
  useIdleTimeout();
  useOnlineStatus();
  const session = useAuthStore(s => s.session);
  const logout = useAuthStore(s => s.logout);
  const nav = useNavigate();

  const userIsAdmin = session?.user.perfil === 'admin';
  const visibleNav = NAV.filter(n => !n.adminOnly || userIsAdmin);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface text-white">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-60 flex-col border-r border-surface-border bg-surface-soft">
        <div className="p-4 border-b border-surface-border">
          <div className="text-xs text-white/50">CBSI</div>
          <div className="text-sm font-semibold">Controle de Produtividade</div>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-1">
          {visibleNav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  isActive
                    ? 'bg-brand-500/15 text-brand-200'
                    : 'text-white/75 hover:bg-white/5',
                )
              }
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-border">
          <div className="text-[11px] text-white/50">Usuário</div>
          <div className="text-xs font-medium truncate">
            {session?.user.nome}
          </div>
          <div className="text-[11px] text-white/50 capitalize">
            {session?.user.perfil}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              logout();
              nav('/login', { replace: true });
            }}
          >
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-surface-border">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="md:hidden">
              <div className="text-[11px] text-white/60">CBSI</div>
              <div className="text-sm font-semibold">Produtividade</div>
            </div>
            <div className="flex-1 hidden md:block" />
            <div className="flex items-center gap-2">
              <SaveStatus />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:pb-4">
          <Outlet />
        </main>

        {/* Tab bar mobile */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-soft border-t border-surface-border flex">
          {visibleNav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[11px]',
                  isActive ? 'text-brand-300' : 'text-white/70',
                )
              }
            >
              <span className="text-base">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
