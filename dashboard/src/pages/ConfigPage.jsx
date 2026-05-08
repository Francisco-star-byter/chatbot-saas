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
      <form onSubmit={handleSave}>

        <div className="config-section">
          <div className="config-section-title">Identidad del negocio</div>
          <div className="config-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del negocio</label>
                <input
                  value={form.business_name || ''}
                  onChange={e => set('business_name', e.target.value)}
                  placeholder="Inmobiliaria Horizonte"
                />
              </div>
              <div className="form-group">
                <label>Ciudad / Ubicación</label>
                <input
                  value={form.location || ''}
                  onChange={e => set('location', e.target.value)}
                  placeholder="Bogotá"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="config-section">
          <div className="config-section-title">Personalidad del agente</div>
          <div className="config-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del agente virtual</label>
                <input
                  value={form.agent_name || ''}
                  onChange={e => set('agent_name', e.target.value)}
                  placeholder="Sofia"
                />
                <p className="hint">Este nombre aparece en el widget de chat.</p>
              </div>
              <div className="form-group">
                <label>Tono de conversación</label>
                <select value={form.tone || 'profesional'} onChange={e => set('tone', e.target.value)}>
                  {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="hint">Define cómo se comunica el agente con los visitantes.</p>
              </div>
            </div>
            <div className="form-group">
              <label>Instrucciones adicionales</label>
              <textarea
                rows={4}
                value={form.custom_prompt || ''}
                onChange={e => set('custom_prompt', e.target.value)}
                placeholder="Ej: siempre menciona que tenemos financiación propia, no ofrezcas propiedades fuera de Bogotá..."
              />
              <p className="hint">Instrucciones específicas que el agente seguirá en cada conversación.</p>
            </div>
          </div>
        </div>

        <div className="config-section">
          <div className="config-section-title">Oferta y cobertura</div>
          <div className="config-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Rango de precios</label>
                <input
                  value={form.price_range || ''}
                  onChange={e => set('price_range', e.target.value)}
                  placeholder="desde $150M hasta $800M"
                />
                <p className="hint">El agente usará esto para orientar a los interesados.</p>
              </div>
              <div className="form-group">
                <label>Horario de atención</label>
                <input
                  value={form.working_hours || ''}
                  onChange={e => set('working_hours', e.target.value)}
                  placeholder="Lunes a viernes 8am-6pm"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Zonas que manejan</label>
              <input
                value={form.zones || ''}
                onChange={e => set('zones', e.target.value)}
                placeholder="Chapinero, Usaquén, Suba"
              />
              <p className="hint">Separa cada zona con una coma.</p>
            </div>
            <div className="form-group">
              <label>Servicios que ofrecen</label>
              <input
                value={form.services || ''}
                onChange={e => set('services', e.target.value)}
                placeholder="Venta de apartamentos, Arriendo de casas"
              />
              <p className="hint">Separa cada servicio con una coma.</p>
            </div>
          </div>
        </div>

        <div className="config-section">
          <div className="config-section-title">Widget de chat</div>
          <div className="config-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Color principal</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={form.widget_color || '#2563eb'}
                    onChange={e => set('widget_color', e.target.value)}
                    style={{ width: 44, height: 38, padding: 2, border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <input
                    value={form.widget_color || '#2563eb'}
                    onChange={e => set('widget_color', e.target.value)}
                    placeholder="#2563eb"
                    style={{ flex: 1 }}
                  />
                </div>
                <p className="hint">Color del botón, header y mensajes del widget.</p>
              </div>
              <div className="form-group">
                <label>Número de WhatsApp</label>
                <input
                  value={form.whatsapp_number || ''}
                  onChange={e => set('whatsapp_number', e.target.value)}
                  placeholder="3001234567"
                  maxLength={15}
                />
                <p className="hint">10 dígitos sin +57. Activa el botón "Hablar con asesor".</p>
              </div>
            </div>
            <div className="form-group">
              <label>Posición del widget</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {['right', 'left'].map(pos => (
                  <label key={pos} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 400 }}>
                    <input
                      type="radio"
                      name="widget_position"
                      value={pos}
                      checked={(form.widget_position || 'right') === pos}
                      onChange={() => set('widget_position', pos)}
                      style={{ accentColor: form.widget_color || '#2563eb' }}
                    />
                    {pos === 'right' ? 'Derecha (por defecto)' : 'Izquierda'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 0 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <span className="saved-badge">✓ Guardado correctamente</span>}
        </div>
      </form>
    </div>
  );
}
