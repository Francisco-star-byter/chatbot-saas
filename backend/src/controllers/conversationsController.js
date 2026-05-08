const supabase = require('../config/supabase');

async function resolveClientId(userId) {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id || null;
}

async function listConversations(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.id);
    if (!clientId) return res.status(404).json({ error: 'Account not set up' });

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, created_at, user_identifier')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(150);

    if (error) throw error;
    if (!conversations?.length) return res.json([]);

    const convIds = conversations.map(c => c.id);

    // All messages for these conversations in one query
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, sender, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    // Leads linked to conversations
    const { data: leads } = await supabase
      .from('leads')
      .select('conversation_id, name, phone, lead_score, status')
      .eq('client_id', clientId)
      .in('conversation_id', convIds);

    // Build lookup maps
    const lastMsgMap  = {};
    const countMap    = {};
    const leadMap     = {};

    (messages || []).forEach(m => {
      countMap[m.conversation_id] = (countMap[m.conversation_id] || 0) + 1;
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
    });

    (leads || []).forEach(l => {
      if (l.conversation_id) leadMap[l.conversation_id] = l;
    });

    const result = conversations.map(c => ({
      ...c,
      message_count: countMap[c.id] || 0,
      last_message:  lastMsgMap[c.id] || null,
      lead:          leadMap[c.id]    || null,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getConversationDetail(req, res, next) {
  try {
    const clientId = await resolveClientId(req.user.id);
    if (!clientId) return res.status(404).json({ error: 'Account not set up' });

    const { id } = req.params;

    const { data: conv, error } = await supabase
      .from('conversations')
      .select('id, created_at, user_identifier')
      .eq('id', id)
      .eq('client_id', clientId)
      .single();

    if (error || !conv) return res.status(404).json({ error: 'Conversación no encontrada' });

    const [{ data: messages }, { data: lead }] = await Promise.all([
      supabase
        .from('messages')
        .select('sender, content, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('leads')
        .select('id, name, phone, lead_score, status, property_interest, budget, zone')
        .eq('client_id', clientId)
        .eq('conversation_id', id)
        .single(),
    ]);

    res.json({
      conversation: conv,
      messages: messages || [],
      lead: lead || null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listConversations, getConversationDetail };
