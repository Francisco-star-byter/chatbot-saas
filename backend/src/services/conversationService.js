const supabase = require('../config/supabase');
const logger = require('../utils/logger');

async function getOrCreateConversation(clientId, conversationId, userIdentifier) {
  if (conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, client_id')
      .eq('id', conversationId)
      .eq('client_id', clientId)  // enforce tenant isolation
      .single();

    if (!error && data) return data.id;

    logger.warn('conversationService', 'Conversation not found or tenant mismatch, creating new', {
      conversationId,
      clientId,
    });
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ client_id: clientId, user_identifier: userIdentifier })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);

  logger.info('conversationService', 'New conversation created', { id: data.id, clientId });
  return data.id;
}

async function getRecentMessages(conversationId, limit = 10) {
  const { data, error } = await supabase
    .from('messages')
    .select('sender, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`);

  // Return in chronological order
  return (data || []).reverse();
}

async function saveMessage(conversationId, sender, content) {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender, content });

  if (error) throw new Error(`Failed to save message: ${error.message}`);
}

module.exports = { getOrCreateConversation, getRecentMessages, saveMessage };
