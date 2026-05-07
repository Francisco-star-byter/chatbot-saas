import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../lib/api';
import Snippet from '../components/Snippet';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => navigate('/onboarding', { replace: true }));
  }, [navigate]);

  if (loading) return <div className="page-loading">Cargando...</div>;
  if (!data?.client) return <div className="page-loading">No se encontró la cuenta.</div>;

  const { client, config, plan, usage } = data;
  const used = usage?.conversation_count || 0;
  const max = plan?.max_conversations_per_month;
  const pct = max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));

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
          <p className="card-value">{used} / {max === -1 ? '∞' : max}</p>
          {max !== -1 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct > 85 ? '#ef4444' : '#2563eb' }} />
            </div>
          )}
        </div>
        <div className="card">
          <p className="card-label">Negocio</p>
          <p className="card-value">{config?.business_name || '—'}</p>
        </div>
      </div>

      <div className="section">
        <h2>Tu snippet de integración</h2>
        <Snippet clientId={client.id} />
      </div>
    </div>
  );
}
