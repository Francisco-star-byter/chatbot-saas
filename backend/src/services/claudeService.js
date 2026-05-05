const anthropic = require('../config/claude');
const logger = require('../utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 500;
const MAX_HISTORY_MESSAGES = 8;

function buildSystemPrompt(clientConfig) {
  const zones = Array.isArray(clientConfig.zones)
    ? clientConfig.zones.join(', ')
    : clientConfig.zones || 'consultar con el asesor';

  const services = Array.isArray(clientConfig.services)
    ? clientConfig.services.join(', ')
    : clientConfig.services || 'venta y arriendo de propiedades';

  return `Eres un asesor inmobiliario virtual ${clientConfig.tone || 'profesional y cercano'}.

CONTEXTO DEL NEGOCIO:
${clientConfig.custom_prompt || ''}
Zonas disponibles: ${zones}
Servicios: ${services}

TU MISIÓN:
- Ayudar al usuario a encontrar la propiedad ideal
- Hacer preguntas progresivas y naturales (máximo una pregunta a la vez)
- Detectar intención real de compra o arriendo
- Capturar datos de contacto de forma natural cuando el usuario muestre interés claro

FLUJO DE CONVERSACIÓN:
1. Saluda brevemente y pregunta qué tipo de propiedad busca (compra o arriendo)
2. Pregunta por la zona de interés
3. Pregunta por el presupuesto aproximado
4. Cuando tenga zona + presupuesto + tipo, solicita nombre y WhatsApp para conectarlo con un asesor

REGLAS DE RESPUESTA:
- Responde SIEMPRE en español
- Máximo 2-3 oraciones por respuesta
- Sé natural, cálido y persuasivo — nunca insistente
- Si el usuario da su WhatsApp, confirma que un asesor lo contactará pronto
- Si preguntan algo fuera del ámbito inmobiliario, redirige amablemente

CAPTURA DE DATOS — cuando el usuario proporcione datos de contacto o haya alta intención, añade al FINAL de tu respuesta (en línea nueva) exactamente este formato:
[LEAD:nombre=VALOR,phone=VALOR,budget=VALOR,zone=VALOR]

Reglas del tag:
- Solo incluye campos que el usuario haya mencionado explícitamente
- Si no mencionó un campo, omítelo completamente del tag
- Para phone: incluir solo si el usuario dio un número real
- No incluyas el tag si no hay datos reales del usuario
- Ejemplo: [LEAD:phone=3001234567,budget=200000,zone=Miraflores]`;
}

function extractLeadTag(text) {
  const match = text.match(/\[LEAD:([^\]]+)\]/);
  if (!match) return { cleanText: text.trim(), lead: null };

  const leadRaw = match[1];
  const lead = {};

  leadRaw.split(',').forEach(pair => {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) return;
    const key = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    const placeholders = ['VALOR', 'NOMBRE', 'TELEFONO', 'PRESUPUESTO', 'ZONA', '', 'null', 'undefined'];
    if (key && value && !placeholders.includes(value.toUpperCase()) && !placeholders.includes(value)) {
      lead[key] = value;
    }
  });

  const cleanText = text.replace(/\[LEAD:[^\]]+\]/, '').trim();

  // Lead is only valid if it has a phone OR both budget and zone
  const hasPhone = !!lead.phone;
  const hasBudgetAndZone = !!(lead.budget && lead.zone);
  const isValid = hasPhone || hasBudgetAndZone;

  return {
    cleanText,
    lead: isValid ? lead : null,
  };
}

async function generateReply(systemPrompt, history, userMessage) {
  const messages = [
    ...history.slice(-MAX_HISTORY_MESSAGES).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  logger.info('claudeService', 'Calling Claude', {
    model: MODEL,
    historyMessages: messages.length,
  });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  });

  const rawText = response.content[0].text;

  logger.info('claudeService', 'Claude responded', {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    estimatedCostUSD: ((response.usage.input_tokens * 0.00000025) + (response.usage.output_tokens * 0.00000125)).toFixed(6),
  });

  return extractLeadTag(rawText);
}

module.exports = { buildSystemPrompt, generateReply };
