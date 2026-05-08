import { useEffect, useState } from 'react';
import { getConversations, getConversationDetail } from '../lib/api';

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

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7)  return d.toLocaleDateString('es-CO', { weekday: 'short' });
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function formatFull(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function EmptyThread() {
  return (
    <div className="conv-empty">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Selecciona una conversación para ver el hilo completo</p>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch]               = useState('');
  const [mobileView, setMobileView]       = useState('list');

  useEffect(() => {
    getConversations().then(data => {
      setConversations(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  async function selectConversation(conv) {
    setSelected(conv.id);
    setLoadingDetail(true);
    setMobileView('thread');
    const data = await getConversationDetail(conv.id);
    setDetail(data);
    setLoadingDetail(false);
  }

  const filtered = conversations.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.lead?.name  || '').toLowerCase().includes(q) ||
      (c.lead?.phone || '').includes(q) ||
      (c.last_message?.content || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="page-loading">Cargando conversaciones...</div>;

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      <div className="page-header">
        <h1>Conversaciones <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>({conversations.length})</span></h1>
      </div>

      <div className={`conversations-layout ${mobileView === 'thread' ? 'mobile-thread' : 'mobile-list'}`}>

        {/* ── Lista ── */}
        <aside className="conv-list">
          <div style={{ padding: '12px 12px 8px' }}>
            <input
              className="search-input"
              style={{ width: '100%' }}
              placeholder="Buscar conversación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              {conversations.length === 0 ? 'Aún no hay conversaciones.' : 'Sin resultados.'}
            </div>
          ) : (
            filtered.map(conv => (
              <div
                key={conv.id}
                className={`conv-item ${selected === conv.id ? 'active' : ''}`}
                onClick={() => selectConversation(conv)}
              >
                <div className="conv-item-header">
                  <span className="conv-item-name">
                    {conv.lead?.name || 'Visitante anónimo'}
                  </span>
                  <span className="conv-item-date">
                    {formatTime(conv.last_message?.created_at || conv.created_at)}
                  </span>
                </div>

                <div className="conv-item-preview">
                  {conv.last_message
                    ? (conv.last_message.sender === 'bot' ? '🤖 ' : '👤 ') + conv.last_message.content
                    : 'Sin mensajes'}
                </div>

                <div className="conv-item-meta">
                  {conv.lead?.lead_score && <ScoreBadge score={conv.lead.lead_score} />}
                  <span className="conv-count">{conv.message_count} msg</span>
                </div>
              </div>
            ))
          )}
        </aside>

        {/* ── Hilo ── */}
        <div className="conv-thread">
          {!detail && !loadingDetail && <EmptyThread />}

          {loadingDetail && (
            <div className="conv-empty">
              <p style={{ color: '#94a3b8' }}>Cargando...</p>
            </div>
          )}

          {detail && !loadingDetail && (
            <>
              <div className="conv-thread-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                  <button className="conv-back-btn" onClick={() => setMobileView('list')}>← Volver</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {detail.lead?.name || 'Visitante anónimo'}
                    </strong>
                    {detail.lead?.phone && (
                      <span style={{ fontSize: 13, color: '#64748b' }}>{detail.lead.phone}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    {detail.lead?.lead_score && <ScoreBadge score={detail.lead.lead_score} />}
                    <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatFull(detail.conversation.created_at)}
                    </span>
                  </div>
                </div>
                {detail.lead && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {detail.lead.property_interest && (
                      <span className="interest-tag">🏠 {detail.lead.property_interest}</span>
                    )}
                    {detail.lead.budget && (
                      <span className="interest-tag">💰 {detail.lead.budget}</span>
                    )}
                    {detail.lead.zone && (
                      <span className="interest-tag">📍 {detail.lead.zone}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="conv-thread-body">
                {detail.messages.map((msg, i) => (
                  <div key={i} className={`message-row ${msg.sender}`}>
                    <div className={`message-bubble ${msg.sender}`}>
                      {msg.content}
                      <div className="message-time">{formatFull(msg.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
