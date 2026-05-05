const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function createClient(req, res, next) {
  try {
    const { name, tone, zones, services, custom_prompt } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    // Create client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ name: name.trim() })
      .select('id, name, api_key')
      .single();

    if (clientError) throw new Error(clientError.message);

    // Create business config
    const { error: configError } = await supabase
      .from('business_config')
      .insert({
        client_id: client.id,
        tone: tone || 'profesional y cercano',
        zones: zones || [],
        services: services || [],
        custom_prompt: custom_prompt || '',
      });

    if (configError) throw new Error(configError.message);

    logger.info('adminController', 'Client created', { id: client.id, name: client.name });

    res.status(201).json({
      client_id: client.id,
      name: client.name,
      api_key: client.api_key,
      widget_snippet: `<script src="https://tudominio.com/widget/widget.js" data-client-id="${client.id}" data-api-url="https://tudominio.com"></script>`,
    });
  } catch (err) {
    next(err);
  }
}

async function getClientConfig(req, res, next) {
  try {
    const { id } = req.params;

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, api_key, created_at')
      .eq('id', id)
      .single();

    if (clientError || !client) return res.status(404).json({ error: 'Client not found' });

    const { data: config } = await supabase
      .from('business_config')
      .select('tone, zones, services, custom_prompt')
      .eq('client_id', id)
      .single();

    res.json({ ...client, config: config || {} });
  } catch (err) {
    next(err);
  }
}

async function updateClientConfig(req, res, next) {
  try {
    const { id } = req.params;
    const { name, tone, zones, services, custom_prompt } = req.body;

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .single();

    if (clientError || !client) return res.status(404).json({ error: 'Client not found' });

    // Update client name if provided
    if (name) {
      await supabase.from('clients').update({ name }).eq('id', id);
    }

    // Build config updates
    const configUpdates = {};
    if (tone !== undefined) configUpdates.tone = tone;
    if (zones !== undefined) configUpdates.zones = zones;
    if (services !== undefined) configUpdates.services = services;
    if (custom_prompt !== undefined) configUpdates.custom_prompt = custom_prompt;

    if (Object.keys(configUpdates).length > 0) {
      const { error: configError } = await supabase
        .from('business_config')
        .upsert({ client_id: id, ...configUpdates }, { onConflict: 'client_id' });

      if (configError) throw new Error(configError.message);
    }

    logger.info('adminController', 'Config updated', { clientId: id });
    res.json({ success: true, client_id: id });
  } catch (err) {
    next(err);
  }
}

async function listClients(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, api_key, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json({ clients: data, count: data.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { createClient, getClientConfig, updateClientConfig, listClients };
