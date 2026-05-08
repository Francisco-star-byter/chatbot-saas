const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const ALLOWED_FIELDS = [
  'title', 'description', 'ai_description', 'price', 'operation_type',
  'property_type', 'status', 'featured', 'city', 'zone', 'address',
  'estrato', 'bedrooms', 'bathrooms', 'area_sqm', 'parking_spots',
  'images', 'amenities',
];

async function resolveClientId(userId) {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id || null;
}

async function listProperties(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.id);
    if (!clientId) return res.status(404).json({ error: 'Account not set up' });

    let query = supabase
      .from('properties')
      .select('*')
      .eq('client_id', clientId)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.operation_type) query = query.eq('operation_type', req.query.operation_type);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

async function createProperty(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.id);
    if (!clientId) return res.status(404).json({ error: 'Account not set up' });

    if (!req.body.title?.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const payload = { client_id: clientId };
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }

    const { data, error } = await supabase
      .from('properties')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    logger.info('propertiesController', 'Property created', { clientId, id: data.id });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function updateProperty(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.id);
    if (!clientId) return res.status(404).json({ error: 'Account not set up' });

    const updates = { updated_at: new Date().toISOString() };
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .select('*')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Propiedad no encontrada' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function deleteProperty(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.id);
    if (!clientId) return res.status(404).json({ error: 'Account not set up' });

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', clientId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProperties, createProperty, updateProperty, deleteProperty };
