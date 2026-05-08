const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function saveLead(clientId, leadData) {
  const { name, phone, budget, zone, operation, property_type, score, interest } = leadData;

  if (phone) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id, phone')
      .eq('client_id', clientId)
      .eq('phone', phone)
      .single();

    if (existing) {
      const updates = {};
      if (name)          updates.name              = name;
      if (budget)        updates.budget            = budget;
      if (zone)          updates.zone              = zone;
      if (operation)     updates.operation         = operation;
      if (property_type) updates.property_type     = property_type;
      if (score)         updates.lead_score        = score;
      if (interest)      updates.property_interest = interest;

      if (Object.keys(updates).length > 0) {
        await supabase.from('leads').update(updates).eq('id', existing.id);
        logger.info('leadService', 'Lead updated (duplicate phone)', { id: existing.id, clientId });
      }
      return { id: existing.id, isUpdate: true, leadData };
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      client_id:         clientId,
      name:              name          || null,
      phone:             phone         || null,
      budget:            budget        || null,
      zone:              zone          || null,
      operation:         operation     || null,
      property_type:     property_type || null,
      lead_score:        score         || null,
      property_interest: interest      || null,
      status: 'new',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save lead: ${error.message}`);

  logger.info('leadService', 'Lead saved', { id: data.id, clientId, phone, zone, budget, score });
  return { id: data.id, isUpdate: false, leadData };
}

async function getLeads(clientId, { status, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('leads')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch leads: ${error.message}`);
  return data || [];
}

async function updateLeadStatus(clientId, leadId, status) {
  const VALID_STATUSES = ['new', 'contacted', 'qualified', 'closed'];
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId)
    .eq('client_id', clientId) // enforce tenant isolation
    .select('id, status')
    .single();

  if (error || !data) throw new Error('Lead not found or access denied');

  logger.info('leadService', 'Lead status updated', { leadId, status, clientId });
  return data;
}

async function getLeadStats(clientId) {
  const { data, error } = await supabase
    .from('leads')
    .select('status')
    .eq('client_id', clientId);

  if (error) throw new Error(`Failed to fetch lead stats: ${error.message}`);

  const stats = { total: 0, new: 0, contacted: 0, qualified: 0, closed: 0 };
  (data || []).forEach(({ status }) => {
    stats.total++;
    if (stats[status] !== undefined) stats[status]++;
  });

  return stats;
}

module.exports = { saveLead, getLeads, updateLeadStatus, getLeadStats };
