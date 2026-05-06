const { getClientWithConfig } = require('../services/clientService');
const { getOrCreateConversation, getRecentMessages, saveMessage } = require('../services/conversationService');
const { saveLead } = require('../services/leadService');
const { buildSystemPrompt, generateReply } = require('../services/claudeService');
const { sendTelegramAlert } = require('../services/notificationService');
const logger = require('../utils/logger');

async function chatController(req, res, next) {
  const { client_id, message, conversation_id } = req.body;

  try {
    // 1. Validate client and get business config
    const client = await getClientWithConfig(client_id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // 2. Get or create conversation (user identified by IP)
    const userIdentifier = req.ip || 'anonymous';
    const convId = await getOrCreateConversation(client_id, conversation_id, userIdentifier);

    // 3. Get recent message history for context
    const history = await getRecentMessages(convId);

    // 4. Build system prompt with business config
    const systemPrompt = buildSystemPrompt(client.config);

    // 5. Call Claude API
    const { cleanText: reply, lead } = await generateReply(systemPrompt, history, message);

    // 6. Save user message and bot reply
    await saveMessage(convId, 'user', message);
    await saveMessage(convId, 'bot', reply);

    // 7. Save lead if detected
    let leadDetected = false;
    if (lead) {
      const { isUpdate } = await saveLead(client_id, lead);
      leadDetected = true;
      logger.info('chatController', 'Lead detected and saved', { client_id, convId, isUpdate });
      sendTelegramAlert(lead, client.config.business_name || client_id, isUpdate).catch(() => {});
    }

    logger.info('chatController', 'Response sent', { client_id, convId, leadDetected });

    res.json({
      reply,
      conversation_id: convId,
      lead_detected: leadDetected,
    });

  } catch (err) {
    logger.error('chatController', 'Unhandled error', { message: err.message });
    next(err);
  }
}

async function greetingController(req, res) {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).json({ error: 'Missing client_id' });

  try {
    const client = await getClientWithConfig(client_id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const name = client.config.business_name || 'nosotros';
    const city = client.config.location ? ` en ${client.config.location}` : '';
    const greeting = `¡Hola! Soy el asistente virtual de ${name}${city}. ¿Estás buscando comprar o arrendar una propiedad?`;
    res.json({ greeting });
  } catch (err) {
    res.json({ greeting: '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?' });
  }
}

module.exports = { chatController, greetingController };
