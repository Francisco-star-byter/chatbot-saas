import { useEffect, useState, useMemo } from 'react';
import { getLeads, getConversations } from '../lib/api';

function groupByKey(items, keyFn) {
  const map = {};
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

function topN(obj, n = 8) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

function BarChart({ data, color = '#2563eb', peakIndices = [] }) {
  if (!data.length || data.every(d => d.value === 0)) {
    return <p className="chart-empty">Sin datos en este período</p>;
  }
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(14, Math.min(32, Math.floor(700 / data.length) - 4));
  const gap = 4;
  const chartH = 160;
  const totalW = data.length * (barW + gap);
  const svgW = Math.max(totalW, 300);
  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <div className="chart-scroll-x">
      <svg width={svgW} height={chartH + 36} style={{ display: 'block', overflow: 'visible' }}>
        {gridLines.map(pct => {
          const y = chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={0} y1={y} x2={svgW} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
              <text x={-4} y={y + 4} textAnchor="end" fontSize={8} fill="#94a3b8">{Math.round(pct * max)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * chartH);
          const x = i * (barW + gap);
          const isPeak = peakIndices.includes(i);
          return (
            <g key={i}>
              <rect
                x={x} y={chartH - h}
                width={barW} height={h}
                fill={isPeak ? '#dc2626' : color}
                rx={3}
                opacity={isPeak ? 1 : 0.8}
              />
              {d.value > 0 && (
                <text
                  x={x + barW / 2} y={chartH - h - 5}
                  textAnchor="middle" fontSize={10}
                  fill={isPeak ? '#dc2626' : '#475569'} fontWeight={600}
                >
                  {d.value}
                </text>
              )}
              {d.label && (
                <text
                  x={x + barW / 2} y={chartH + 16}
                  textAnchor="middle" fontSize={9} fill="#94a3b8"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function HorizBarChart({ data, color = '#2563eb' }) {
  if (!data.length) return <p className="chart-empty">Sin datos en este período</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="horiz-chart">
      {data.map((d, i) => (
        <div key={i} className="horiz-row">
          <span className="horiz-rank">{RANK_MEDALS[i] || `#${i + 1}`}</span>
          <span className="horiz-label" title={d.label}>{d.label}</span>
          <div className="horiz-bar-wrap">
            <div
              className="horiz-bar"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, background: color }}
            />
          </div>
          <span className="horiz-count">{d.value}</span>
          <span className="horiz-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
        </div>
      ))}
    </div>
  );
}

const PIPELINE = [
  { key: 'new',       label: 'Nuevo',      color: '#2563eb', icon: '🆕', desc: 'Recién llegados' },
  { key: 'contacted', label: 'Contactado', color: '#f59e0b', icon: '📞', desc: 'Ya los contactaste' },
  { key: 'qualified', label: 'Calificado', color: '#8b5cf6', icon: '✅', desc: 'Con intención real' },
  { key: 'closed',    label: 'Cerrado',    color: '#10b981', icon: '🏆', desc: 'Negocio concretado' },
];

const SCORE_CONFIG = [
  { key: 'hot',  label: 'Caliente',  icon: '🔥', color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    desc: 'Presupuesto definido, zona clara, listo para decidir' },
  { key: 'warm', label: 'Tibio',     icon: '☀️', color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    desc: 'Interés real pero faltan datos o urgencia' },
  { key: 'cold', label: 'Frío',      icon: '🧊', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
    desc: 'Explorando sin datos concretos aún' },
];

export default function AnalyticsPage() {
  const [leads, setLeads] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    Promise.all([getLeads(), getConversations()])
      .then(([l, c]) => {
        setLeads(Array.isArray(l) ? l : []);
        setConversations(Array.isArray(c) ? c : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - range + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [range]);

  const filteredLeads = useMemo(
    () => leads.filter(l => new Date(l.created_at) >= since),
    [leads, since]
  );

  const filteredConvs = useMemo(
    () => conversations.filter(c => new Date(c.created_at) >= since),
    [conversations, since]
  );

  const leadsByDay = useMemo(() => {
    const days = {};
    for (let i = 0; i < range; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (range - 1 - i));
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const l of filteredLeads) {
      const k = new Date(l.created_at).toISOString().slice(0, 10);
      if (k in days) days[k]++;
    }
    const step = range > 14 ? Math.ceil(range / 6) : 1;
    return Object.entries(days).map(([date, value], i) => ({
      label: i % step === 0 ? date.slice(5).replace('-', '/') : '',
      value,
    }));
  }, [filteredLeads, range]);

  const zoneData     = useMemo(() => topN(groupByKey(filteredLeads, l => l.zone)),               [filteredLeads]);
  const propertyData = useMemo(() => topN(groupByKey(filteredLeads, l => l.property_interest)), [filteredLeads]);

  const hourData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      label: i % 3 === 0 ? `${i}h` : '',
      value: 0,
    }));
    for (const c of filteredConvs) {
      hours[new Date(c.created_at).getHours()].value++;
    }
    return hours;
  }, [filteredConvs]);

  const peakHourIndices = useMemo(() => {
    const topVal = Math.max(...hourData.map(d => d.value), 0);
    if (!topVal) return [];
    return hourData.map((d, i) => d.value === topVal ? i : -1).filter(i => i !== -1);
  }, [hourData]);

  const peakHourLabel = useMemo(() => {
    if (!peakHourIndices.length) return '';
    const h = peakHourIndices[0];
    if (h >= 6 && h < 12) return `Pico a las ${h}h (mañana)`;
    if (h >= 12 && h < 18) return `Pico a las ${h}h (tarde)`;
    if (h >= 18 && h < 24) return `Pico a las ${h}h (noche)`;
    return `Pico a las ${h}h (madrugada)`;
  }, [peakHourIndices]);

  const pipelineData = useMemo(() =>
    PIPELINE.map(p => ({
      ...p,
      value: filteredLeads.filter(l => (l.status || 'new') === p.key).length,
    })),
    [filteredLeads]
  );

  const scoreData = useMemo(() =>
    SCORE_CONFIG.map(s => ({
      ...s,
      value: filteredLeads.filter(l => l.lead_score === s.key).length,
    })),
    [filteredLeads]
  );

  const hotLeads       = filteredLeads.filter(l => l.lead_score === 'hot').length;
  const closedLeads    = filteredLeads.filter(l => l.status === 'closed').length;
  const conversionRate = filteredLeads.length ? Math.round((closedLeads / filteredLeads.length) * 100) : 0;
  const hotPct         = filteredLeads.length ? Math.round((hotLeads / filteredLeads.length) * 100) : 0;
  const avgPerDay      = filteredLeads.length ? (filteredLeads.length / range).toFixed(1) : '0.0';
  const pipelineTotal  = pipelineData.reduce((s, d) => s + d.value, 0);

  if (loading) return <div className="page-loading">Cargando analíticas...</div>;

  return (
    <div className="page analytics-page">
      <div className="page-header">
        <div>
          <h1>Analíticas</h1>
          <p className="page-subtitle">Resumen de los últimos {range} días</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              className={`filter-btn ${range === d ? 'active' : ''}`}
              style={{ padding: '6px 14px' }}
              onClick={() => setRange(d)}
            >
              {d === 7 ? '7 días' : d === 30 ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="cards-row analytics-kpis">
        <div className="card">
          <p className="card-label">📋 Leads capturados</p>
          <p className="card-value">{filteredLeads.length}</p>
          <p className="card-sub">{avgPerDay} leads por día en promedio</p>
        </div>
        <div className="card">
          <p className="card-label">🔥 Leads calientes</p>
          <p className="card-value" style={{ color: '#dc2626' }}>{hotLeads}</p>
          <p className="card-sub">{hotPct}% del total · listos para contactar</p>
        </div>
        <div className="card">
          <p className="card-label">💬 Conversaciones</p>
          <p className="card-value" style={{ color: '#2563eb' }}>{filteredConvs.length}</p>
          <p className="card-sub">chats iniciados por visitantes</p>
        </div>
        <div className="card">
          <p className="card-label">🏆 Tasa de cierre</p>
          <p className="card-value" style={{ color: '#10b981' }}>{conversionRate}%</p>
          <p className="card-sub">{closedLeads} de {filteredLeads.length} leads cerrados</p>
        </div>
      </div>

      {/* Temperatura de leads */}
      <div className="analytics-section">
        <h2>Temperatura de leads</h2>
        <p className="section-desc">¿Qué tan listos están tus leads para comprar o arrendar?</p>
        <div className="score-cards">
          {scoreData.map(s => (
            <div key={s.key} className="score-card" style={{ background: s.bg, borderColor: s.border }}>
              <span className="score-icon">{s.icon}</span>
              <div className="score-body">
                <p className="score-label" style={{ color: s.color }}>{s.label}</p>
                <p className="score-value" style={{ color: s.color }}>{s.value}</p>
                <p className="score-sub">
                  {filteredLeads.length ? Math.round((s.value / filteredLeads.length) * 100) : 0}% del total
                </p>
                <p className="score-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leads por día */}
      <div className="analytics-section">
        <h2>Leads por día</h2>
        <p className="section-desc">Cuántos leads nuevos llegaron cada día del período seleccionado.</p>
        <div className="analytics-card">
          <BarChart data={leadsByDay} color="#2563eb" />
        </div>
      </div>

      {/* Zonas + Propiedades */}
      <div className="analytics-two-col">
        <div className="analytics-section">
          <h2>Zonas más buscadas</h2>
          <p className="section-desc">Dónde quieren vivir tus leads.</p>
          <div className="analytics-card">
            <HorizBarChart data={zoneData} color="#8b5cf6" />
          </div>
        </div>
        <div className="analytics-section">
          <h2>Propiedades más consultadas</h2>
          <p className="section-desc">Cuáles generaron más interés en el chat.</p>
          <div className="analytics-card">
            <HorizBarChart data={propertyData} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Horarios */}
      <div className="analytics-section">
        <h2>
          Horarios con más actividad
          {peakHourLabel && <span className="peak-badge">📍 {peakHourLabel}</span>}
        </h2>
        <p className="section-desc">A qué horas del día tus visitantes inician conversaciones. Las barras rojas marcan el pico.</p>
        <div className="analytics-card">
          <div className="hour-bands">
            <span>🌙 Madrugada<br /><small>0 – 6h</small></span>
            <span>🌅 Mañana<br /><small>6 – 12h</small></span>
            <span>☀️ Tarde<br /><small>12 – 18h</small></span>
            <span>🌆 Noche<br /><small>18 – 24h</small></span>
          </div>
          <BarChart data={hourData} color="#10b981" peakIndices={peakHourIndices} />
        </div>
      </div>

      {/* Pipeline */}
      <div className="analytics-section">
        <h2>Estado del pipeline</h2>
        <p className="section-desc">En qué etapa del proceso de venta se encuentra cada lead.</p>
        <div className="analytics-card">
          {pipelineTotal === 0 ? (
            <p className="chart-empty">Sin datos en este período</p>
          ) : (
            <>
              <div className="pipeline-track">
                {pipelineData.map(d => d.value > 0 && (
                  <div
                    key={d.key}
                    className="pipeline-segment"
                    style={{ flex: d.value, background: d.color }}
                    title={`${d.label}: ${d.value} leads`}
                  />
                ))}
              </div>
              <div className="pipeline-legend">
                {pipelineData.map(d => (
                  <div key={d.key} className="pipeline-legend-item">
                    <span className="pipeline-icon">{d.icon}</span>
                    <div>
                      <p className="pipeline-legend-label">{d.label}</p>
                      <p className="pipeline-legend-desc">{d.desc}</p>
                      <p className="pipeline-legend-count" style={{ color: d.color }}>
                        {d.value} leads
                        <span className="pipeline-legend-pct">
                          {' '}· {pipelineTotal ? Math.round((d.value / pipelineTotal) * 100) : 0}%
                        </span>
                      </p>
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
