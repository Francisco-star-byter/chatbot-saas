import { useEffect, useState, useRef } from 'react';
import {
  getProperties, createProperty, updateProperty,
  deleteProperty, uploadPropertyImage,
} from '../lib/api';

const OPERATION_LABELS = { sale: 'Venta', rent: 'Arriendo' };
const STATUS_LABELS    = { available: 'Disponible', sold: 'Vendida', rented: 'Alquilada', paused: 'Pausada' };
const STATUS_COLORS    = { available: '#10b981', sold: '#ef4444', rented: '#f59e0b', paused: '#94a3b8' };
const OPERATION_COLORS = { sale: '#2563eb', rent: '#7c3aed' };
const PROPERTY_TYPES   = ['apartamento', 'casa', 'local', 'oficina', 'lote', 'bodega'];

const EMPTY_FORM = {
  title: '', description: '', ai_description: '', price: '',
  operation_type: 'sale', property_type: 'apartamento', status: 'available',
  featured: false, city: '', zone: '', address: '', estrato: '',
  bedrooms: '', bathrooms: '', area_sqm: '', parking_spots: '',
  amenities: '', images: [],
};

function formatPrice(price, op) {
  if (!price) return 'Precio a consultar';
  return `$${Number(price).toLocaleString('es-CO')}${op === 'rent' ? '/mes' : ''}`;
}

// ── Modal add/edit ──────────────────────────────────────────────────────────

function PropertyModal({ property, onSave, onClose }) {
  const isEdit = !!property;
  const [form, setForm] = useState(isEdit ? {
    ...property,
    amenities: Array.isArray(property.amenities) ? property.amenities.join(', ') : '',
    images: Array.isArray(property.images) ? property.images : [],
  } : { ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadPropertyImage(f)));
      setField('images', [...form.images, ...urls]);
    } catch {
      alert('Error al subir la imagen. Verifica que el bucket "property-images" esté creado en Supabase Storage.');
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleSave() {
    if (!form.title.trim()) { alert('El título es requerido'); return; }
    setSaving(true);
    const payload = {
      ...form,
      price:         form.price         ? Number(form.price)         : null,
      estrato:       form.estrato        ? Number(form.estrato)        : null,
      bedrooms:      form.bedrooms       ? Number(form.bedrooms)       : null,
      bathrooms:     form.bathrooms      ? Number(form.bathrooms)      : null,
      area_sqm:      form.area_sqm       ? Number(form.area_sqm)       : null,
      parking_spots: form.parking_spots  ? Number(form.parking_spots)  : 0,
      amenities:     form.amenities.split(',').map(s => s.trim()).filter(Boolean),
    };
    await onSave(payload);
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">

          {/* Datos principales */}
          <div>
            <p className="modal-section-title">Datos principales</p>
            <div className="form-group">
              <label>Título *</label>
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Apartamento moderno con vista al mar"
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Tipo de operación</label>
                <select value={form.operation_type} onChange={e => setField('operation_type', e.target.value)}>
                  <option value="sale">Venta</option>
                  <option value="rent">Arriendo</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de propiedad</label>
                <select value={form.property_type} onChange={e => setField('property_type', e.target.value)}>
                  {PROPERTY_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)}>
                  <option value="available">Disponible</option>
                  <option value="sold">Vendida</option>
                  <option value="rented">Alquilada</option>
                  <option value="paused">Pausada</option>
                </select>
              </div>
              <div className="form-group">
                <label>Precio (COP)</label>
                <input
                  type="number" min="0"
                  value={form.price}
                  onChange={e => setField('price', e.target.value)}
                  placeholder="320000000"
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <p className="modal-section-title">Ubicación</p>
            <div className="form-grid">
              <div className="form-group">
                <label>Ciudad</label>
                <input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Santa Marta" />
              </div>
              <div className="form-group">
                <label>Zona / Barrio</label>
                <input value={form.zone} onChange={e => setField('zone', e.target.value)} placeholder="El Rodadero" />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Cra 4 #12-30" />
              </div>
              <div className="form-group">
                <label>Estrato</label>
                <select value={form.estrato} onChange={e => setField('estrato', e.target.value)}>
                  <option value="">— Estrato —</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Características */}
          <div>
            <p className="modal-section-title">Características</p>
            <div className="form-grid">
              <div className="form-group">
                <label>Habitaciones</label>
                <input type="number" min="0" value={form.bedrooms} onChange={e => setField('bedrooms', e.target.value)} placeholder="3" />
              </div>
              <div className="form-group">
                <label>Baños</label>
                <input type="number" min="0" value={form.bathrooms} onChange={e => setField('bathrooms', e.target.value)} placeholder="2" />
              </div>
              <div className="form-group">
                <label>Área (m²)</label>
                <input type="number" min="0" value={form.area_sqm} onChange={e => setField('area_sqm', e.target.value)} placeholder="85" />
              </div>
              <div className="form-group">
                <label>Parqueaderos</label>
                <input type="number" min="0" value={form.parking_spots} onChange={e => setField('parking_spots', e.target.value)} placeholder="1" />
              </div>
            </div>
            <div className="form-group">
              <label>Amenidades (separadas por coma)</label>
              <input
                value={form.amenities}
                onChange={e => setField('amenities', e.target.value)}
                placeholder="Piscina, Gimnasio, Seguridad 24h, Zona BBQ"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <p className="modal-section-title">Descripción</p>
            <div className="form-group">
              <label>Descripción pública</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Describe la propiedad para los clientes..."
              />
            </div>
            <div className="form-group">
              <label>Descripción para el chatbot</label>
              <textarea
                rows={2}
                value={form.ai_description}
                onChange={e => setField('ai_description', e.target.value)}
                placeholder="Versión corta que usará el bot al recomendar esta propiedad..."
              />
              <p className="hint">El chatbot usará este texto cuando recomiende esta propiedad a los visitantes.</p>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => setField('featured', e.target.checked)}
                />
                Destacar esta propiedad (el chatbot la menciona primero)
              </label>
            </div>
          </div>

          {/* Imágenes */}
          <div>
            <p className="modal-section-title">Imágenes</p>
            <div className="img-upload-area" onClick={() => fileRef.current?.click()}>
              {uploading ? '⏳ Subiendo...' : '+ Agregar imágenes (JPG, PNG, WebP)'}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFiles}
            />
            {form.images.length > 0 && (
              <div className="img-grid">
                {form.images.map((url, i) => (
                  <div key={i} className="img-thumb">
                    <img src={url} alt="" />
                    <button
                      className="img-thumb-remove"
                      onClick={() => setField('images', form.images.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear propiedad'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [opFilter, setOpFilter]     = useState('all');
  const [stFilter, setStFilter]     = useState('available');
  const [modal, setModal]           = useState(null); // null | 'new' | { ...property }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getProperties();
    setProperties(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleSave(payload) {
    if (modal === 'new') {
      const res = await createProperty(payload);
      if (res?.id) setProperties(prev => [res, ...prev]);
    } else {
      const res = await updateProperty(modal.id, payload);
      if (res?.id) setProperties(prev => prev.map(p => p.id === res.id ? res : p));
    }
    setModal(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    await deleteProperty(id);
    setProperties(prev => prev.filter(p => p.id !== id));
  }

  const filtered = properties.filter(p => {
    if (opFilter !== 'all' && p.operation_type !== opFilter) return false;
    if (stFilter !== 'all' && p.status !== stFilter) return false;
    return true;
  });

  if (loading) return <div className="page-loading">Cargando propiedades...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Propiedades <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>({properties.length})</span></h1>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nueva propiedad</button>
      </div>

      <div className="leads-toolbar">
        <div className="filter-bar">
          {[['all', 'Todas'], ['sale', 'En venta'], ['rent', 'En arriendo']].map(([v, l]) => (
            <button key={v} className={`filter-btn ${opFilter === v ? 'active' : ''}`} onClick={() => setOpFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="filter-bar">
          {[['all', 'Cualquier estado'], ['available', 'Disponibles'], ['sold', 'Vendidas'], ['rented', 'Alquiladas'], ['paused', 'Pausadas']].map(([v, l]) => (
            <button key={v} className={`filter-btn ${stFilter === v ? 'active' : ''}`} onClick={() => setStFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-properties">
          <div style={{ fontSize: 52, marginBottom: 12 }}>🏢</div>
          <h3>{properties.length === 0 ? 'Aún no tienes propiedades' : 'Sin propiedades con estos filtros'}</h3>
          <p style={{ maxWidth: 380, margin: '0 auto' }}>
            {properties.length === 0
              ? 'Agrega tu catálogo de propiedades. El chatbot las usará para recomendar opciones a cada visitante.'
              : 'Prueba cambiando los filtros de operación o estado.'}
          </p>
          {properties.length === 0 && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setModal('new')}>
              + Agregar primera propiedad
            </button>
          )}
        </div>
      ) : (
        <div className="property-grid">
          {filtered.map(p => (
            <div key={p.id} className="property-card">

              <div className="property-img">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.title} />
                  : <div className="property-img-placeholder">🏠</div>
                }
                <div className="property-badges">
                  <span className="property-badge" style={{ background: OPERATION_COLORS[p.operation_type] || '#2563eb' }}>
                    {OPERATION_LABELS[p.operation_type] || p.operation_type}
                  </span>
                  <span className="property-badge" style={{ background: STATUS_COLORS[p.status] || '#94a3b8' }}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  {p.featured && (
                    <span className="property-badge" style={{ background: '#f59e0b' }}>★ Destacada</span>
                  )}
                </div>
              </div>

              <div className="property-body">
                <p className="property-title">{p.title}</p>
                <p className="property-price" style={{ color: p.operation_type === 'rent' ? '#7c3aed' : '#2563eb' }}>
                  {formatPrice(p.price, p.operation_type)}
                </p>
                <div className="property-specs">
                  {p.bedrooms  != null && <span>🛏 {p.bedrooms}</span>}
                  {p.bathrooms != null && <span>🚿 {p.bathrooms}</span>}
                  {p.area_sqm  != null && <span>📐 {p.area_sqm}m²</span>}
                  {p.estrato   != null && <span>Est. {p.estrato}</span>}
                </div>
                {(p.zone || p.city) && (
                  <p className="property-location">📍 {[p.zone, p.city].filter(Boolean).join(', ')}</p>
                )}
              </div>

              <div className="property-footer">
                <button className="btn-sm" onClick={() => setModal(p)}>Editar</button>
                <button className="btn-sm btn-sm-danger" onClick={() => handleDelete(p.id)}>Eliminar</button>
              </div>

            </div>
          ))}
        </div>
      )}

      {modal && (
        <PropertyModal
          property={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
