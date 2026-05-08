import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getMe, getLeads } from '../lib/api';
import Snippet from '../components/Snippet';

const STATUS_COLORS = {
  new: '#2563eb',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  closed: '#10b981',
};

const STATUS_LABELS = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  closed: 'Cerrado',
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getMe(), getLeads()])
      .then(([d, l]) => {
        setData(d);
        setLeads(Array.isArray(l) ? l : []);
        setLoading(false);
      })
      .catch(() => navigate('/onboarding', { replace: true }));
  }, [navigate]);

  if (loading) return <div className="page-loading">Cargando...</div>;
  if (!data?.client) return <div className="page-loading">No se encontró la cuenta.</div>;

  const { client, config, plan, usage } = data;
  const used = usage?.conversation_count || 0;
  const max = plan?.max_conversations_per_month;
  const pct = max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= startOfMonth);
  const pendingLeads = leads.filter(l => !l.status || l.status === 'new');
  const recentLeads = leads.slice(0, 5);

  return (
    <div className="page">
      <h1>Panel principal</h1>

      <div className="cards-row">
        <div className="card">
          <p className="card-label">Plan actual</p>
          <p className="card-value">{client.plan_id || 'free'}</p>
        </div>
        <div className="card">
          <p className="card-label">Conversaciones este mes</p>
          <p className="card-value">{used}{max !== -1 ? ` / ${max}` : ''}</p>
          {max !== -1 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 85 ? '#ef4444' : '#2563eb' }} />
            </div>
          )}
        </div>
        <div className="card">
          <p className="card-label">Leads este mes</p>
          <p className="card-value">{leadsThisMonth.length}</p>
        </div>
      </div>

      <div className="cards-row" style={{ marginTop: 16 }}>
        <div className="card">
          <p className="card-label">Negocio</p>
          <p className="card-value" style={{ fontSize: 16 }}>{config?.business_name || '—'}</p>
        </div>
        <div className="card">
          <p className="card-label">Total leads capturados</p>
          <p className="card-value">{leads.length}</p>
        </div>
        <div className="card">
          <p className="card-label">Pendientes de gestión</p>
          <p className="card-value" style={{ color: pendingLeads.length > 0 ? '#ef4444' : '#10b981' }}>
            {pendingLeads.length}
          </p>
        </div>
      </div>

      {recentLeads.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>Últimos leads capturados</h2>
            <Link to="/dashboard/leads" className="section-link">Ver todos →</Link>
          </div>
          <div className="recent-leads">
            {recentLeads.map(lead => (
              <div key={lead.id} className="recent-lead-row">
                <div className="recent-lead-avatar">
                  {(lead.name || '?')[0].toUpperCase()}
                </div>
                <div className="recent-lead-info">
                  <span className="recent-lead-name">{lead.name || 'Sin nombre'}</span>
                  <span className="recent-lead-sub">{lead.phone || lead.email || '—'}</span>
                </div>
                <div className="recent-lead-mid">
                  {lead.interest && <span className="recent-lead-interest">{lead.interest}</span>}
                </div>
                <div className="recent-lead-right">
                  <span
                    className="status-dot"
                    style={{ background: STATUS_COLORS[lead.status] || '#94a3b8' }}
                  >
                    {STATUS_LABELS[lead.status] || 'Nuevo'}
                  </span>
                  <span className="recent-lead-date">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-CO') : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h2>Tu snippet de integración</h2>
        <Snippet clientId={client.id} />
      </div>
    </div>
  );
}
