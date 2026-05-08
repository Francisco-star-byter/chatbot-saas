const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function getClientWithConfig(clientId) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, plan_id')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    logger.warn('clientService', 'Client not found', { clientId });
    return null;
  }

  const [{ data: config }, { data: plan }, { data: properties }] = await Promise.all([
    supabase
      .from('business_config')
      .select('tone, zones, services, custom_prompt, business_name, location, agent_name, price_range, working_hours, whatsapp_number, widget_color, widget_position')
      .eq('client_id', clientId)
      .single(),
    supabase
      .from('plans')
      .select('max_conversations_per_month, max_leads, telegram_alerts')
      .eq('id', client.plan_id || 'free')
      .single(),
    supabase
      .from('properties')
      .select('id, title, operation_type, property_type, status, price, city, zone, estrato, bedrooms, bathrooms, area_sqm, amenities, ai_description, description, featured')
      .eq('client_id', clientId)
      .eq('status', 'available')
      .order('featured', { ascending: false })
      .limit(15),
  ]);

  return {
    ...client,
    config: config || { tone: 'profesional', zones: [], services: [], custom_prompt: '' },
    plan: plan || { max_conversations_per_month: 100, max_leads: 20, telegram_alerts: false },
    properties: properties || [],
  };
}

module.exports = { getClientWithConfig };
