import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setupAccount, updateConfig } from '../lib/api';

const STEPS = ['Negocio', 'Zonas', 'Servicios', 'Listo'];

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'amigable', label: 'Amigable' },
  { value: 'formal', label: 'Formal' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    location: '',
    agent_name: '',
    tone: 'profesional',
    price_range: '',
    working_hours: '',
    zones: '',
    services: '',
    custom_prompt: '',
  });

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleFinish() {
    setSaving(true);
    await setupAccount(form.business_name || 'Mi Inmobiliaria');
    await updateConfig({
      ...form,
      zones: form.zones.split(',').map(s => s.trim()).filter(Boolean),
      services: form.services.split(',').map(s => s.trim()).filter(Boolean),
    });
    navigate('/dashboard');
  }

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-card">
        <div className="steps-bar">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-dot ${i <= step ? 'active' : ''}`}>{s}</div>
          ))}
        </div>

        {step === 0 && (
          <div className="step-content">
            <h2>Cuéntanos sobre tu inmobiliaria</h2>
            <label>Nombre del negocio</label>
            <input value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Ej: Inmobiliaria Horizonte" />
            <label>Ciudad / Ubicación</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ej: Bogotá" />
            <label>Nombre del agente virtual</label>
            <input value={form.agent_name} onChange={e => set('agent_name', e.target.value)} placeholder="Ej: Sofia" />
            <label>Tono del asistente</label>
            <select value={form.tone} onChange={e => set('tone', e.target.value)}>
              {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label>Rango de precios (opcional)</label>
            <input value={form.price_range} onChange={e => set('price_range', e.target.value)} placeholder="Ej: desde $150M hasta $800M" />
            <label>Horario de atención (opcional)</label>
            <input value={form.working_hours} onChange={e => set('working_hours', e.target.value)} placeholder="Ej: Lunes a viernes 8am-6pm" />
          </div>
        )}

        {step === 1 && (
          <div className="step-content">
            <h2>¿En qué zonas trabajas?</h2>
            <p className="hint">Separa las zonas con coma</p>
            <textarea
              rows={4}
              value={form.zones}
              onChange={e => set('zones', e.target.value)}
              placeholder="Ej: Chapinero, Usaquén, Suba, Chía"
            />
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h2>¿Qué servicios ofreces?</h2>
            <p className="hint">Separa los servicios con coma</p>
            <textarea
              rows={4}
              value={form.services}
              onChange={e => set('services', e.target.value)}
              placeholder="Ej: Venta de apartamentos, Arriendo de casas, Locales comerciales"
            />
            <label>Instrucciones adicionales (opcional)</label>
            <textarea
              rows={3}
              value={form.custom_prompt}
              onChange={e => set('custom_prompt', e.target.value)}
              placeholder="Ej: Siempre preguntar el presupuesto antes de mostrar opciones"
            />
          </div>
        )}

        {step === 3 && (
          <div className="step-content step-done">
            <div className="done-icon">🎉</div>
            <h2>¡Todo listo!</h2>
            <p>Tu asistente virtual está configurado. Ahora puedes copiar el snippet y pegarlo en tu web.</p>
          </div>
        )}

        <div className="step-actions">
          {step > 0 && (
            <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>Atrás</button>
          )}
          {step < STEPS.length - 1 && (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Siguiente</button>
          )}
          {step === STEPS.length - 1 && (
            <button className="btn btn-primary" onClick={handleFinish} disabled={saving}>
              {saving ? 'Guardando...' : 'Ir al panel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
