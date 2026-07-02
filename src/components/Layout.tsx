import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Dog,
  Siren,
  Home,
  HeartHandshake,
  Stethoscope,
  Scale,
  Building2,
  Truck,
  FileText,
  Search,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { roleLabels } from '../lib/constants';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/animaux', label: 'Animaux', icon: Dog },
  { to: '/signalements', label: 'Signalements', icon: Siren },
  { to: '/familles-accueil', label: 'Familles d\'accueil', icon: Home },
  { to: '/adoptions', label: 'Adoptions', icon: HeartHandshake },
  { to: '/veterinaires', label: 'Vétérinaires', icon: Stethoscope },
  { to: '/justice', label: 'Justice', icon: Scale },
  { to: '/pensions', label: 'Pensions / Fourrières', icon: Building2 },
  { to: '/transports', label: 'Transports', icon: Truck },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/enqueteurs', label: 'Enquêteurs', icon: Users },
  { to: '/registre', label: 'Registre légal', icon: ClipboardList },
  { to: '/import', label: 'Import Excel', icon: Upload },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-16 items-center border-b border-neutral-200 px-5">
          <Logo size={36} />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`
                  }
                >
                  <item.icon size={18} strokeWidth={2} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-neutral-900">
                {profile?.full_name ?? 'Utilisateur'}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {profile ? roleLabels[profile.role] : ''}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-600"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl animate-slide-in-right">
            <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5">
              <Logo size={32} />
              <button onClick={() => setMobileOpen(false)} className="p-1 text-neutral-500">
                <X size={20} />
              </button>
            </div>
            <nav className="overflow-y-auto px-3 py-4" style={{ maxHeight: 'calc(100% - 4rem)' }}>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-neutral-600 hover:bg-neutral-100'
                        }`
                      }
                    >
                      <item.icon size={18} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSignOut}
                className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher un animal, dossier, personne..."
                className="w-80 rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-4 text-sm focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    if (value.trim()) navigate(`/recherche?q=${encodeURIComponent(value)}`);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-neutral-600 hover:bg-neutral-100">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
