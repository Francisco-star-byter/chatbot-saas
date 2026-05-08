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

function BarChart({ data, color = '#2563eb' }) {
  if (!data.length || data.every(d => d.value === 0)) {
    return <p className="chart-empty">Sin datos en este período</p>;
  }
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(14, Math.min(32, Math.floor(700 / data.length) - 4));
  const gap = 4;
  const chartH = 120;
  const totalW = data.length * (barW + gap);

  return (
    <div className="chart-scroll-x">
      <svg width={totalW} height={chartH + 30} style={{ display: 'block', overflow: 'visible' }}>
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * chartH);
          const x = i * (barW + gap);
          return (
            <g key={i}>
              <rect
                x={x} y={chartH - h}
                width={barW} height={h}
                fill={color} rx={3} opacity={0.85}
              />
              {d.value > 0 && (
                <text
                  x={x + barW / 2} y={chartH - h - 4}
                  textAnchor="middle" fontSize={9} fill="#475569" fontWeight={600}
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

function HorizBarChart({ data, color = '#2563eb' }) {
  if (!data.length) return <p className="chart-empty">Sin datos en este período</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="horiz-chart">
      {data.map((d, i) => (
        <div key={i} className="horiz-row">
          <span className="horiz-label" title={d.label}>{d.label}</span>
          <div className="horiz-bar-wrap">
            <div
              className="horiz-bar"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, background: color }}
            />
          </div>
          <span className="horiz-count">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

const PIPELINE = [
  { key: 'new',       label: 'Nuevo',       color: '#2563eb' },
  { key: 'contacted', label: 'Contactado',  color: '#f59e0b' },
  { key: 'qualified', label: 'Calificado',  color: '#8b5cf6' },
  { key: 'closed',    label: 'Cerrado',     color: '#10b981' },
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

  const zoneData    = useMemo(() => topN(groupByKey(filteredLeads, l => l.zone)),              [filteredLeads]);
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

  const pipelineData = useMemo(() =>
    PIPELINE.map(p => ({
      ...p,
      value: filteredLeads.filter(l => (l.status || 'new') === p.key).length,
    })),
    [filteredLeads]
  );

  const hotLeads       = filteredLeads.filter(l => l.lead_score === 'hot').length;
  const closedLeads    = filteredLeads.filter(l => l.status === 'closed').length;
  const conversionRate = filteredLeads.length ? Math.round((closedLeads / filteredLeads.length) * 100) : 0;
  const hotPct         = filteredLeads.length ? Math.round((hotLeads / filteredLeads.length) * 100) : 0;
  const avgPerDay      = filteredLeads.length ? (filteredLeads.length / range).toFixed(1) : '0.0';

  const pipelineTotal = pipelineData.reduce((s, d) => s + d.value, 0);

  if (loading) return <div className="page-loading">Cargando analíticas...</div>;

  return (
    <div className="page analytics-page">
      <div className="page-header">
        <h1>Analíticas</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              className={`filter-btn ${range === d ? 'active' : ''}`}
              style={{ padding: '6px 14px' }}
              onClick={() => setRange(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="cards-row analytics-kpis">
        <div className="card">
          <p className="card-label">Leads capturados</p>
          <p className="card-value">{filteredLeads.length}</p>
          <p className="card-sub">últimos {range} días</p>
        </div>
        <div className="card">
          <p className="card-label">Leads calientes 🔥</p>
          <p className="card-value" style={{ color: '#dc2626' }}>{hotLeads}</p>
          <p className="card-sub">{hotPct}% del total</p>
        </div>
        <div className="card">
          <p className="card-label">Tasa de conversión</p>
          <p className="card-value" style={{ color: '#10b981' }}>{conversionRate}%</p>
          <p className="card-sub">{closedLeads} cerrados</p>
        </div>
        <div className="card">
          <p className="card-label">Promedio diario</p>
          <p className="card-value">{avgPerDay}</p>
          <p className="card-sub">leads por día</p>
        </div>
      </div>

      {/* Leads por día */}
      <div className="analytics-section">
        <h2>Leads por día</h2>
        <div className="analytics-card">
          <BarChart data={leadsByDay} color="#2563eb" />
        </div>
      </div>

      {/* Zonas + Propiedades */}
      <div className="analytics-two-col">
        <div className="analytics-section">
          <h2>Zonas más buscadas</h2>
          <div className="analytics-card">
            <HorizBarChart data={zoneData} color="#8b5cf6" />
          </div>
        </div>
        <div className="analytics-section">
          <h2>Propiedades más consultadas</h2>
          <div className="analytics-card">
            <HorizBarChart data={propertyData} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Horarios */}
      <div className="analytics-section">
        <h2>Horarios con más actividad</h2>
        <div className="analytics-card">
          <BarChart data={hourData} color="#10b981" />
          <p className="chart-hint">Basado en inicio de conversaciones (hora local)</p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="analytics-section">
        <h2>Distribución del pipeline</h2>
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
                    style={{
                      flex: d.value,
                      background: d.color,
                    }}
                    title={`${d.label}: ${d.value}`}
                  />
                ))}
              </div>
              <div className="pipeline-legend">
                {pipelineData.map(d => (
                  <div key={d.key} className="pipeline-legend-item">
                    <span className="pipeline-dot" style={{ background: d.color }} />
                    <span className="pipeline-legend-label">{d.label}</span>
                    <span className="pipeline-legend-count" style={{ color: d.color }}>{d.value}</span>
                    <span className="pipeline-legend-pct">
                      {pipelineTotal ? Math.round((d.value / pipelineTotal) * 100) : 0}%
                    </span>
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
