const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function getClientWithConfig(clientId) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    logger.warn('clientService', 'Client not found', { clientId });
    return null;
  }

  const { data: config, error: configError } = await supabase
    .from('business_config')
    .select('tone, zones, services, custom_prompt')
    .eq('client_id', clientId)
    .single();

  if (configError) {
    logger.warn('clientService', 'Config not found, using defaults', { clientId });
  }

  return {
    ...client,
    config: config || {
      tone: 'profesional',
      zones: [],
      services: [],
      custom_prompt: '',
    },
  };
}

module.exports = { getClientWithConfig };
