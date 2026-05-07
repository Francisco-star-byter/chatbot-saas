const supabase = require('../config/supabase');
const logger = require('../utils/logger');

function getCurrentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

async function checkLimit(clientId, maxConversations) {
  if (maxConversations === -1) return { allowed: true, count: 0 };

  const monthKey = getCurrentMonthKey();
  const { data } = await supabase
    .from('usage')
    .select('conversation_count')
    .eq('client_id', clientId)
    .eq('month', monthKey)
    .single();

  const count = data?.conversation_count || 0;
  return { allowed: count < maxConversations, count };
}

async function incrementUsage(clientId) {
  const monthKey = getCurrentMonthKey();
  const { error } = await supabase.rpc('increment_conversation_count', {
    p_client_id: clientId,
    p_month: monthKey,
  });

  if (error) {
    logger.warn('usageService', 'Failed to increment usage', { clientId, error: error.message });
  }
}

module.exports = { checkLimit, incrementUsage };
