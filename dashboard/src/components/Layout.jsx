import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getLeads } from '../lib/api';

const NAV = [
  { to: '/dashboard', label: '🏠 Panel' },
  { to: '/dashboard/properties', label: '🏢 Propiedades' },
  { to: '/dashboard/leads', label: '📋 Leads' },
  { to: '/dashboard/config', label: '⚙️ Configuración' },
];

const POLL_INTERVAL = 30000;

export default function Layout() {
  const [newLeadCount, setNewLeadCount] = useState(0);
  const knownIds = useRef(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    async function checkLeads() {
      try {
        const leads = await getLeads();
        if (!Array.isArray(leads)) return;

        if (knownIds.current === null) {
          knownIds.current = new Set(leads.map(l => l.id));
          return;
        }

        const fresh = leads.filter(l => !knownIds.current.has(l.id));
        if (fresh.length === 0) return;

        fresh.forEach(lead => {
          knownIds.current.add(lead.id);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Nuevo lead capturado', {
              body: lead.name ? `${lead.name} está interesado en propiedades` : 'Nuevo contacto capturado',
              icon: '/favicon.ico',
            });
          }
        });
        setNewLeadCount(n => n + fresh.length);
      } catch {
        // silent
      }
    }

    checkLeads();
    const timer = setInterval(checkLeads, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

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
              onClick={to === '/dashboard/leads' ? () => setNewLeadCount(0) : undefined}
            >
              {label}
              {to === '/dashboard/leads' && newLeadCount > 0 && (
                <span className="nav-badge">{newLeadCount}</span>
              )}
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
