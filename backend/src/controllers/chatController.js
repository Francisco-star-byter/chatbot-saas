const { getClientWithConfig } = require('../services/clientService');
const { getOrCreateConversation, getRecentMessages, saveMessage } = require('../services/conversationService');
const { saveLead } = require('../services/leadService');
const { buildSystemPrompt, generateReply } = require('../services/claudeService');
const { checkLimit, incrementUsage } = require('../services/usageService');
const logger = require('../utils/logger');

async function chatController(req, res, next) {
  const { client_id, message, conversation_id } = req.body;

  try {
    // 1. Validate client and get business config + plan
    const client = await getClientWithConfig(client_id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // 2. Check plan limit
    const { allowed, count } = await checkLimit(client_id, client.plan.max_conversations_per_month);
    if (!allowed) {
      logger.warn('chatController', 'Plan limit reached', { client_id, count });
      return res.status(429).json({ error: 'plan_limit_reached' });
    }

    // 3. Get or create conversation (user identified by IP)
    const userIdentifier = req.ip || 'anonymous';
    const convId = await getOrCreateConversation(client_id, conversation_id, userIdentifier);

    // 4. Get recent message history for context
    const history = await getRecentMessages(convId);

    // 5. Build system prompt with business config + available properties
    const systemPrompt = buildSystemPrompt(client.config, client.properties);

    // 6. Call Claude API
    const { cleanText: reply, lead } = await generateReply(systemPrompt, history, message);

    // 7. Save user message and bot reply
    await saveMessage(convId, 'user', message);
    await saveMessage(convId, 'bot', reply);

    // 8. Increment usage counter (fire and forget)
    incrementUsage(client_id).catch(() => {});

    // 9. Save lead if detected
    let leadDetected = false;
    if (lead) {
      const { isUpdate } = await saveLead(client_id, lead);
      leadDetected = true;
      logger.info('chatController', 'Lead detected and saved', { client_id, convId, isUpdate });
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
    const agentName = client.config.agent_name || 'Asesor Inmobiliario';
    const city = client.config.location ? ` en ${client.config.location}` : '';
    const greeting = `¡Hola! Soy ${agentName}, el asistente virtual de ${name}${city}. ¿Estás buscando comprar o arrendar una propiedad?`;
    res.json({ greeting, agent_name: agentName });
  } catch (err) {
    res.json({ greeting: '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?' });
  }
}

module.exports = { chatController, greetingController };
