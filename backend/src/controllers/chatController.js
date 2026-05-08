const { getClientWithConfig } = require('../services/clientService');
const { getOrCreateConversation, getRecentMessages, saveMessage } = require('../services/conversationService');
const { saveLead } = require('../services/leadService');
const { buildSystemPrompt, generateReply, extractShowTag } = require('../services/claudeService');
const { checkLimit, incrementUsage } = require('../services/usageService');
const supabase = require('../config/supabase');
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
    const { cleanText: rawReply, lead } = await generateReply(systemPrompt, history, message);

    // 7. Extract [SHOW:N] tag and resolve matching properties
    const { cleanText: reply, indices } = extractShowTag(rawReply);
    const showProperties = indices
      .map(i => client.properties[i])
      .filter(Boolean)
      .map(p => ({
        title: p.title,
        price: p.price,
        operation_type: p.operation_type,
        zone: p.zone,
        city: p.city,
        bedrooms: p.bedrooms,
        area_sqm: p.area_sqm,
        images: p.images,
      }));

    // 8. Save user message and bot reply
    await saveMessage(convId, 'user', message);
    await saveMessage(convId, 'bot', reply);

    // 9. Increment usage counter (fire and forget)
    incrementUsage(client_id).catch(() => {});

    // 10. Save lead if detected
    let leadDetected = false;
    if (lead) {
      const { isUpdate } = await saveLead(client_id, lead, convId);
      leadDetected = true;
      logger.info('chatController', 'Lead detected and saved', { client_id, convId, isUpdate });
    }

    logger.info('chatController', 'Response sent', { client_id, convId, leadDetected, cards: showProperties.length });

    res.json({
      reply,
      conversation_id: convId,
      lead_detected: leadDetected,
      show_properties: showProperties.length ? showProperties : undefined,
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

    const cfg = client.config;
    const name = cfg.business_name || 'nosotros';
    const agentName = cfg.agent_name || 'Asesor Inmobiliario';
    const city = cfg.location ? ` en ${cfg.location}` : '';
    const greeting = `¡Hola! Soy ${agentName}, el asistente virtual de ${name}${city}. ¿Estás buscando comprar o arrendar una propiedad?`;

    res.json({
      greeting,
      agent_name: agentName,
      widget_color: cfg.widget_color || '#2563eb',
      widget_position: cfg.widget_position || 'right',
      whatsapp_number: cfg.whatsapp_number || '',
    });
  } catch (err) {
    res.json({ greeting: '¡Hola! ¿Estás buscando comprar o arrendar una propiedad?' });
  }
}

async function publicPropertiesController(req, res) {
  const { client_id } = req.query;
  if (!client_id) return res.status(400).json({ error: 'Missing client_id' });

  try {
    const { data } = await supabase
      .from('properties')
      .select('id, title, operation_type, price, zone, city, bedrooms, bathrooms, area_sqm, images, featured')
      .eq('client_id', client_id)
      .eq('status', 'available')
      .order('featured', { ascending: false })
      .limit(6);

    res.json(data || []);
  } catch {
    res.json([]);
  }
}

module.exports = { chatController, greetingController, publicPropertiesController };
