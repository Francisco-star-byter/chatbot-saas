const anthropic = require('../config/claude');
const logger = require('../utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 280;
const MAX_HISTORY_MESSAGES = 10;

function formatPropertiesForAI(properties) {
  if (!properties || properties.length === 0) return '';

  const list = properties.slice(0, 12).map((p, i) => {
    const op = p.operation_type === 'sale' ? 'Venta' : 'Arriendo';
    const price = p.price
      ? `$${Number(p.price).toLocaleString('es-CO')}${p.operation_type === 'rent' ? '/mes' : ''}`
      : 'Precio a consultar';
    const specs = [
      p.bedrooms && `${p.bedrooms} hab`,
      p.bathrooms && `${p.bathrooms} baños`,
      p.area_sqm && `${p.area_sqm}m²`,
      p.estrato && `Estrato ${p.estrato}`,
    ].filter(Boolean).join(' · ');
    const desc = p.ai_description || p.description || '';
    const location = [p.zone, p.city].filter(Boolean).join(', ');
    const amenities = Array.isArray(p.amenities) && p.amenities.length
      ? `Incluye: ${p.amenities.slice(0, 4).join(', ')}`
      : '';

    return `${i + 1}. [${op}] ${p.title} — ${price}
   ${location ? `📍 ${location}` : ''}${specs ? ` | ${specs}` : ''}${amenities ? `\n   ${amenities}` : ''}${desc ? `\n   "${desc}"` : ''}`;
  }).join('\n\n');

  return `\n\nPROPIEDADES DISPONIBLES EN EL CATÁLOGO:
${list}

Cuando el presupuesto, zona o tipo de propiedad del usuario coincida con alguna del catálogo, menciónala con entusiasmo y sus detalles clave. Si preguntan por algo específico, busca la mejor coincidencia en el catálogo.`;
}

function buildSystemPrompt(clientConfig, properties = []) {
  const zones = Array.isArray(clientConfig.zones)
    ? clientConfig.zones.join(', ')
    : clientConfig.zones || 'varias zonas';

  const services = Array.isArray(clientConfig.services)
    ? clientConfig.services.join(' y ')
    : clientConfig.services || 'venta y arriendo';

  const businessName = clientConfig.business_name || 'nuestra inmobiliaria';
  const location = clientConfig.location ? `, especialistas en propiedades en ${clientConfig.location}` : '';
  const priceRange = clientConfig.price_range ? `- Rango de precios: ${clientConfig.price_range}` : '';
  const agentName = clientConfig.agent_name || 'un asesor';
  const hours = clientConfig.working_hours ? `- Horario de atención: ${clientConfig.working_hours}` : '';
  const extra = clientConfig.custom_prompt ? `- Contexto adicional: ${clientConfig.custom_prompt}` : '';

  return `Eres ${agentName}, el asistente virtual de ${businessName}${location}. Tu objetivo es entender qué busca el visitante, recomendar propiedades del catálogo cuando coincidan, y conectarlo con un asesor cuando esté listo.

NEGOCIO:
- Servicios: ${services}
- Ciudad: ${clientConfig.location || 'nuestra ciudad'}
- Zonas disponibles: ${zones}
${priceRange}
${hours}
${extra}

CÓMO RESPONDER:
- Máximo 2 frases por mensaje + una sola pregunta al final
- Tono: cálido y directo, como un amigo experto en finca raíz
- Nunca repitas algo que el usuario ya respondió
- Si el tema no es inmobiliario, redirige con naturalidad
- Responde siempre en español
- Desde el primer mensaje menciona la ciudad donde operamos para que el usuario sepa dónde estamos

ESTRATEGIA (sigue este orden, saltando lo que ya conoces del usuario):
1. Identifica si busca comprar o arrendar
2. Pregunta si busca apartamento o casa
3. Pregunta por zona mencionando algunas de las zonas disponibles como ejemplo
4. Pregunta el presupuesto aproximado
5. Con esos 4 datos: di que tienes opciones y pide nombre + WhatsApp para conectarlo con ${agentName}
6. Cuando dé su número: verifica que tenga exactamente 10 dígitos. Si no, dile amablemente que parece incompleto y pídele que lo escriba de nuevo. No guardes el contacto hasta tener un número válido.
7. Cuando dé contacto válido: confirma con entusiasmo y cierra la conversación. No menciones el horario de atención.

CAPTURA DE LEAD — cuando el usuario muestre intención clara o dé su contacto, añade al FINAL de tu respuesta en línea separada:
[LEAD:name=X,phone=X,budget=X,zone=X,operation=X,property_type=X]

Reglas del tag:
- Solo incluye los campos que el usuario mencionó explícitamente
- operation: usar "compra" o "arriendo" según lo que dijo
- property_type: usar "apartamento" o "casa" según lo que dijo
- Omite los campos que no mencionó
- No uses valores de ejemplo ni texto literal como VALOR, null o undefined
- No incluyas el tag si no hay datos reales del usuario${formatPropertiesForAI(properties)}`;
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
  const hasOperationAndProperty = !!(lead.operation && lead.property_type);
  const isValid = hasPhone || hasBudgetAndZone || hasOperationAndProperty;

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
