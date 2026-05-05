const { getLeads, updateLeadStatus, getLeadStats } = require('../services/leadService');
const { getClientWithConfig } = require('../services/clientService');
const logger = require('../utils/logger');

async function listLeads(req, res, next) {
  try {
    const { client_id, status, limit, offset } = req.query;

    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await getClientWithConfig(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const leads = await getLeads(client_id, {
      status,
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
    });

    logger.info('leadsController', 'Leads fetched', { client_id, count: leads.length });
    res.json({ leads, count: leads.length });
  } catch (err) {
    next(err);
  }
}

async function leadStats(req, res, next) {
  try {
    const { client_id } = req.query;
    if (!client_id) return res.status(400).json({ error: 'client_id is required' });

    const client = await getClientWithConfig(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const stats = await getLeadStats(client_id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function patchLeadStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { client_id, status } = req.body;

    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!status) return res.status(400).json({ error: 'status is required' });

    const client = await getClientWithConfig(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const updated = await updateLeadStatus(client_id, id, status);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('Invalid status') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { listLeads, leadStats, patchLeadStatus };
