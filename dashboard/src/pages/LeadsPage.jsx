import { useEffect, useState, useMemo } from 'react';
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

const SCORE_CONFIG = {
  hot:  { label: 'Caliente', bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  warm: { label: 'Tibio',    bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  cold: { label: 'Frío',     bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' },
};

function ScoreBadge({ score }) {
  if (!score) return null;
  const cfg = SCORE_CONFIG[score];
  if (!cfg) return null;
  return (
    <span className="score-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="score-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function exportCSV(leads) {
  const headers = ['Nombre', 'Teléfono', 'Email', 'Interés', 'Zona', 'Presupuesto', 'Estado', 'Fecha'];
  const rows = leads.map(l => [
    l.name || '',
    l.phone || '',
    l.email || '',
    l.interest || '',
    l.zone || '',
    l.budget || '',
    STATUS_LABELS[l.status] || l.status || '',
    l.created_at ? new Date(l.created_at).toLocaleDateString('es-CO') : '',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <span className="sort-icon">↕</span>;
  return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'created_at', dir: 'desc' });

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

  function toggleSort(field) {
    setSort(s => s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' }
    );
  }

  const countByStatus = useMemo(() => {
    const counts = { all: leads.length };
    for (const key of Object.keys(STATUS_LABELS)) {
      counts[key] = leads.filter(l => l.status === key).length;
    }
    return counts;
  }, [leads]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? leads : leads.filter(l => l.status === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      );
    }

    const { field, dir } = sort;
    return [...list].sort((a, b) => {
      const av = a[field] || '';
      const bv = b[field] || '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [leads, filter, search, sort]);

  if (loading) return <div className="page-loading">Cargando leads...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Leads capturados</h1>
        {leads.length > 0 && (
          <button className="btn btn-outline" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => exportCSV(filtered)}>
            ↓ Exportar CSV
          </button>
        )}
      </div>

      <div className="leads-toolbar">
        <div className="filter-bar">
          {['all', 'new', 'contacted', 'qualified', 'closed'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : STATUS_LABELS[f]}
              {countByStatus[f] > 0 && (
                <span className="filter-count">{countByStatus[f]}</span>
              )}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>
            {search
              ? `Sin resultados para "${search}"`
              : filter !== 'all'
                ? `No hay leads con estado "${STATUS_LABELS[filter]}".`
                : 'No hay leads aún. El widget los capturará automáticamente.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('lead_score')}>
                  Temp <SortIcon field="lead_score" sort={sort} />
                </th>
                <th className="sortable" onClick={() => toggleSort('name')}>
                  Nombre <SortIcon field="name" sort={sort} />
                </th>
                <th>Teléfono</th>
                <th>Zona</th>
                <th>Presupuesto</th>
                <th>Propiedad de interés</th>
                <th className="sortable" onClick={() => toggleSort('status')}>
                  Estado <SortIcon field="status" sort={sort} />
                </th>
                <th className="sortable" onClick={() => toggleSort('created_at')}>
                  Fecha <SortIcon field="created_at" sort={sort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr key={lead.id}>
                  <td><ScoreBadge score={lead.lead_score} /></td>
                  <td><strong>{lead.name || '—'}</strong></td>
                  <td>{lead.phone || '—'}</td>
                  <td>{lead.zone || '—'}</td>
                  <td>{lead.budget || '—'}</td>
                  <td>{lead.property_interest ? <span className="interest-tag">{lead.property_interest}</span> : '—'}</td>
                  <td>
                    <select
                      className="status-select"
                      value={lead.status || 'new'}
                      style={{ backgroundColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
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
