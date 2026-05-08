import { useEffect, useState } from 'react';
import { getLeads, patchLeadStatus, patchLeadNotes } from '../lib/api';

const COLUMNS = [
  { key: 'new',       label: 'Nuevo',       color: '#2563eb' },
  { key: 'contacted', label: 'Contactado',  color: '#f59e0b' },
  { key: 'qualified', label: 'Calificado',  color: '#8b5cf6' },
  { key: 'closed',    label: 'Cerrado',     color: '#10b981' },
];

const SCORE_CONFIG = {
  hot:  { label: 'Caliente', bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' },
  warm: { label: 'Tibio',    bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
  cold: { label: 'Frío',     bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' },
};

function ScoreBadge({ score }) {
  const cfg = SCORE_CONFIG[score];
  if (!cfg) return null;
  return (
    <span className="score-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="score-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ── Lead detail modal ────────────────────────────────────────────────────────

function LeadModal({ lead, onClose, onStatusChange, onNotesSave }) {
  const [status, setStatus]   = useState(lead.status || 'new');
  const [notes, setNotes]     = useState(lead.notes || '');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  async function handleStatusChange(newStatus) {
    setStatus(newStatus);
    onStatusChange(lead.id, newStatus);
    await patchLeadStatus(lead.id, newStatus);
  }

  async function handleSaveNotes() {
    setSaving(true);
    await patchLeadNotes(lead.id, notes);
    onNotesSave(lead.id, notes);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const col = COLUMNS.find(c => c.key === status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div>
            <h2 style={{ marginBottom: 2 }}>{lead.name || 'Sin nombre'}</h2>
            {lead.phone && <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{lead.phone}</p>}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ gap: 16 }}>

          {/* Score + datos */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <ScoreBadge score={lead.lead_score} />
            {lead.property_interest && <span className="interest-tag">🏠 {lead.property_interest}</span>}
            {lead.budget && <span className="interest-tag">💰 {lead.budget}</span>}
            {lead.zone   && <span className="interest-tag">📍 {lead.zone}</span>}
          </div>

          {/* Estado */}
          <div>
            <p className="modal-section-title">Estado del lead</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLUMNS.map(c => (
                <button
                  key={c.key}
                  onClick={() => handleStatusChange(c.key)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: `2px solid ${c.color}`,
                    background: status === c.key ? c.color : '#fff',
                    color: status === c.key ? '#fff' : c.color,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <p className="modal-section-title">Notas internas</p>
            <textarea
              className="lead-notes"
              placeholder="Escribe tus notas sobre este lead..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Info adicional */}
          {(lead.email || lead.operation || lead.property_type) && (
            <div>
              <p className="modal-section-title">Información capturada</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lead.email         && <span style={{ fontSize: 13, color: '#475569' }}>✉️ {lead.email}</span>}
                {lead.operation     && <span style={{ fontSize: 13, color: '#475569' }}>🔑 {lead.operation === 'compra' ? 'Compra' : 'Arriendo'}</span>}
                {lead.property_type && <span style={{ fontSize: 13, color: '#475569' }}>🏠 {lead.property_type}</span>}
              </div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={handleSaveNotes} disabled={saving}>
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar notas'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getLeads().then(data => {
      setLeads(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  function handleStatusChange(id, newStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  }

  function handleNotesSave(id, notes) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
    if (selected?.id === id) setSelected(s => ({ ...s, notes }));
  }

  if (loading) return <div className="page-loading">Cargando pipeline...</div>;

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <h1>Pipeline de leads</h1>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{leads.length} leads en total</span>
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => (l.status || 'new') === col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span
                  className="kanban-col-title"
                  style={{ color: col.color }}
                >
                  {col.label}
                </span>
                <span className="kanban-count-badge">{colLeads.length}</span>
              </div>

              <div className="kanban-cards">
                {colLeads.length === 0 && (
                  <div style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '16px 0' }}>
                    Sin leads
                  </div>
                )}
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    onClick={() => setSelected(lead)}
                  >
                    {lead.lead_score && (
                      <ScoreBadge score={lead.lead_score} />
                    )}
                    <p className="kanban-card-name">{lead.name || 'Sin nombre'}</p>
                    {lead.phone && (
                      <p className="kanban-card-detail">📞 {lead.phone}</p>
                    )}
                    {lead.budget && (
                      <p className="kanban-card-detail">💰 {lead.budget}</p>
                    )}
                    {lead.zone && (
                      <p className="kanban-card-detail">📍 {lead.zone}</p>
                    )}
                    {lead.property_interest && (
                      <span className="kanban-card-interest">{lead.property_interest}</span>
                    )}
                    {lead.notes && (
                      <p className="kanban-card-detail" style={{ fontStyle: 'italic', marginTop: 6 }}>
                        📝 {lead.notes.slice(0, 50)}{lead.notes.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onNotesSave={handleNotesSave}
        />
      )}
    </div>
  );
}
