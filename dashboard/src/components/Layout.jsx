import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NAV = [
  { to: '/dashboard', label: '🏠 Panel' },
  { to: '/dashboard/config', label: '⚙️ Configuración' },
  { to: '/dashboard/leads', label: '📋 Leads' },
];

export default function Layout() {
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">🏠 ChatBot</div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
