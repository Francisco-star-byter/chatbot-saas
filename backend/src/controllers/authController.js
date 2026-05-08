const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function setupAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, business_name, location } = req.body;

    // If user already has a client, return it
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name, api_key, plan_id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.json({ client: existing, already_setup: true });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ name: name.trim(), user_id: userId, plan_id: 'free' })
      .select('id, name, api_key, plan_id')
      .single();

    if (clientError) throw new Error(clientError.message);

    const { error: configError } = await supabase
      .from('business_config')
      .insert({
        client_id: client.id,
        tone: 'profesional y cercano',
        zones: [],
        services: [],
        custom_prompt: '',
        business_name: business_name || name.trim(),
        location: location || '',
        agent_name: '',
        price_range: '',
        working_hours: '',
      });

    if (configError) throw new Error(configError.message);

    logger.info('authController', 'Account setup complete', { userId, clientId: client.id });

    res.status(201).json({ client, already_setup: false });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, api_key, plan_id, created_at')
      .eq('user_id', userId)
      .single();

    if (error || !client) {
      return res.status(404).json({ error: 'Account not set up yet' });
    }

    const { data: config } = await supabase
      .from('business_config')
      .select('*')
      .eq('client_id', client.id)
      .single();

    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', client.plan_id)
      .single();

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthKey = monthStart.toISOString().slice(0, 10);

    const { data: usage } = await supabase
      .from('usage')
      .select('conversation_count')
      .eq('client_id', client.id)
      .eq('month', monthKey)
      .single();

    res.json({
      client,
      config: config || {},
      plan: plan || {},
      usage: { conversation_count: usage?.conversation_count || 0 },
    });
  } catch (err) {
    next(err);
  }
}

async function updateConfig(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!client) return res.status(404).json({ error: 'Account not set up yet' });

    const allowed = ['tone', 'zones', 'services', 'custom_prompt', 'business_name', 'location', 'agent_name', 'price_range', 'working_hours'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const { error } = await supabase
      .from('business_config')
      .update(updates)
      .eq('client_id', client.id);

    if (error) throw new Error(error.message);

    logger.info('authController', 'Config updated', { clientId: client.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getLeads(req, res, next) {
  try {
    const userId = req.user.id;

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!client) return res.status(404).json({ error: 'Account not set up yet' });

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    res.json(leads || []);
  } catch (err) {
    next(err);
  }
}

async function patchLeadStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['new', 'contacted', 'qualified', 'closed'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Debe ser: ${VALID.join(', ')}` });
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!client) return res.status(404).json({ error: 'Account not set up yet' });

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .eq('client_id', client.id)
      .select('id, status')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Lead no encontrado' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function patchLeadNotes(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!client) return res.status(404).json({ error: 'Account not set up yet' });

    const { data, error } = await supabase
      .from('leads')
      .update({ notes })
      .eq('id', id)
      .eq('client_id', client.id)
      .select('id, notes')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Lead no encontrado' });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { setupAccount, getMe, updateConfig, getLeads, patchLeadStatus, patchLeadNotes };
