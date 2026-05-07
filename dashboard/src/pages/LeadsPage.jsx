import { useEffect, useState } from 'react';
import { getLeads, patchLeadStatus } from '../lib/api';

const STATUS_LABELS = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  closed: 'Cerrado',
};

const STATUS_COLORS = {
  new: '#2563eb',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  closed: '#10b981',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getLeads().then(data => {
      setLeads(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  async function handleStatusChange(leadId, newStatus) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await patchLeadStatus(leadId, newStatus);
  }

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  if (loading) return <div className="page-loading">Cargando leads...</div>;

  return (
    <div className="page">
      <h1>Leads capturados</h1>

      <div className="filter-bar">
        {['all', 'new', 'contacted', 'qualified', 'closed'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todos' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No hay leads {filter !== 'all' ? `con estado "${STATUS_LABELS[filter]}"` : ''} aún.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Interés</th>
                <th>Zona</th>
                <th>Presupuesto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id}>
                  <td>{lead.name || '—'}</td>
                  <td>{lead.phone || '—'}</td>
                  <td>{lead.email || '—'}</td>
                  <td>{lead.interest || '—'}</td>
                  <td>{lead.zone || '—'}</td>
                  <td>{lead.budget || '—'}</td>
                  <td>
                    <select
                      className="status-select"
                      value={lead.status || 'new'}
                      style={{ background: STATUS_COLORS[lead.status] || '#94a3b8' }}
                      onChange={e => handleStatusChange(lead.id, e.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
