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

  const [{ data: config }, { data: plan }] = await Promise.all([
    supabase
      .from('business_config')
      .select('tone, zones, services, custom_prompt, business_name, location, agent_name, price_range, working_hours')
      .eq('client_id', clientId)
      .single(),
    supabase
      .from('plans')
      .select('max_conversations_per_month, max_leads, telegram_alerts')
      .eq('id', client.plan_id || 'free')
      .single(),
  ]);

  return {
    ...client,
    config: config || { tone: 'profesional', zones: [], services: [], custom_prompt: '' },
    plan: plan || { max_conversations_per_month: 100, max_leads: 20, telegram_alerts: false },
  };
}

module.exports = { getClientWithConfig };
