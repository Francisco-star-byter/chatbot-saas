import { useEffect, useState } from 'react';
import { getMe, updateConfig } from '../lib/api';

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'amigable', label: 'Amigable' },
  { value: 'formal', label: 'Formal' },
];

export default function ConfigPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMe().then(({ config }) => {
      setForm({
        ...config,
        zones: Array.isArray(config?.zones) ? config.zones.join(', ') : '',
        services: Array.isArray(config?.services) ? config.services.join(', ') : '',
      });
    });
  }, []);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await updateConfig({
      ...form,
      zones: form.zones.split(',').map(s => s.trim()).filter(Boolean),
      services: form.services.split(',').map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!form) return <div className="page-loading">Cargando...</div>;

  return (
    <div className="page">
      <h1>Configuración del bot</h1>
      <form className="config-form" onSubmit={handleSave}>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre del negocio</label>
            <input value={form.business_name || ''} onChange={e => set('business_name', e.target.value)} placeholder="Inmobiliaria Horizonte" />
          </div>
          <div className="form-group">
            <label>Ciudad / Ubicación</label>
            <input value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="Bogotá" />
          </div>
          <div className="form-group">
            <label>Nombre del agente virtual</label>
            <input value={form.agent_name || ''} onChange={e => set('agent_name', e.target.value)} placeholder="Sofia" />
          </div>
          <div className="form-group">
            <label>Tono</label>
            <select value={form.tone || 'profesional'} onChange={e => set('tone', e.target.value)}>
              {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Rango de precios</label>
            <input value={form.price_range || ''} onChange={e => set('price_range', e.target.value)} placeholder="desde $150M hasta $800M" />
          </div>
          <div className="form-group">
            <label>Horario de atención</label>
            <input value={form.working_hours || ''} onChange={e => set('working_hours', e.target.value)} placeholder="Lunes a viernes 8am-6pm" />
          </div>
        </div>

        <div className="form-group">
          <label>Zonas (separadas por coma)</label>
          <input value={form.zones || ''} onChange={e => set('zones', e.target.value)} placeholder="Chapinero, Usaquén, Suba" />
        </div>
        <div className="form-group">
          <label>Servicios (separados por coma)</label>
          <input value={form.services || ''} onChange={e => set('services', e.target.value)} placeholder="Venta de apartamentos, Arriendo de casas" />
        </div>
        <div className="form-group">
          <label>Instrucciones adicionales</label>
          <textarea rows={4} value={form.custom_prompt || ''} onChange={e => set('custom_prompt', e.target.value)} placeholder="Instrucciones especiales para el asistente..." />
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <span className="saved-badge">✓ Guardado</span>}
        </div>
      </form>
    </div>
  );
}
