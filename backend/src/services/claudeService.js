const anthropic = require('../config/claude');
const logger = require('../utils/logger');

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 420;
const MAX_HISTORY_MESSAGES = 12;

// ── Format properties for AI context ────────────────────────────────────────

function formatPropertiesForAI(properties) {
  if (!properties || properties.length === 0) return '';

  const list = properties.slice(0, 12).map((p, i) => {
    const op    = p.operation_type === 'sale' ? 'Venta' : 'Arriendo';
    const price = p.price
      ? `$${Number(p.price).toLocaleString('es-CO')}${p.operation_type === 'rent' ? '/mes' : ''}`
      : 'Precio a consultar';

    const specs = [
      p.bedrooms  && `${p.bedrooms} hab`,
      p.bathrooms && `${p.bathrooms} baños`,
      p.area_sqm  && `${p.area_sqm}m²`,
      p.estrato   && `Est.${p.estrato}`,
    ].filter(Boolean).join(' · ');

    const location  = [p.zone, p.city].filter(Boolean).join(', ');
    const amenities = Array.isArray(p.amenities) && p.amenities.length
      ? `Amenidades: ${p.amenities.slice(0, 4).join(', ')}`
      : '';
    const desc = p.ai_description || p.description || '';
    const featured = p.featured ? ' ⭐' : '';

    return [
      `${i + 1}.${featured} [${op}] ${p.title} — ${price}`,
      location && `   📍 ${location}${specs ? ` | ${specs}` : ''}`,
      amenities && `   ${amenities}`,
      desc      && `   "${desc}"`,
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  return `\n\n━━━ CATÁLOGO DE PROPIEDADES DISPONIBLES ━━━
${list}
━━━ FIN DEL CATÁLOGO ━━━

Instrucciones para usar el catálogo:
• Si el presupuesto, zona o tipo coincide → menciona la propiedad con nombre y detalles clave
• Si hay coincidencia parcial → menciónala igual y explica qué se ajusta
• Si no hay coincidencia → di que buscarás opciones y pide el contacto para avisarle
• Las marcadas con ⭐ son propiedades destacadas — priorízalas si hay empate
• Cuando menciones una o más propiedades específicas del catálogo, añade al FINAL de tu respuesta (línea separada): [SHOW:N] donde N es el número de la propiedad. Máximo 3: [SHOW:1,2,3]`;
}

// ── Build system prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(clientConfig, properties = []) {
  const businessName = clientConfig.business_name || 'nuestra inmobiliaria';
  const agentName    = clientConfig.agent_name    || 'Asesor';
  const city         = clientConfig.location      || 'nuestra ciudad';
  const locationLine = clientConfig.location ? `, expertos en propiedades en ${city}` : '';

  const zones    = Array.isArray(clientConfig.zones)    ? clientConfig.zones.join(', ')    : clientConfig.zones    || 'varias zonas';
  const services = Array.isArray(clientConfig.services) ? clientConfig.services.join(' y ') : clientConfig.services || 'venta y arriendo';

  const priceRange = clientConfig.price_range   ? `- Rango de precios manejado: ${clientConfig.price_range}` : '';
  const extra      = clientConfig.custom_prompt ? `- Contexto adicional: ${clientConfig.custom_prompt}`       : '';

  return `Eres ${agentName}, asesor inmobiliario virtual de ${businessName}${locationLine}. Combinas calidez humana con expertise inmobiliaria real para ayudar a cada visitante a encontrar su propiedad ideal y conectarlos con el equipo.

━━━ NEGOCIO ━━━
- Servicios: ${services}
- Ciudad principal: ${city}
- Zonas disponibles: ${zones}
${priceRange}
${extra}

━━━ CONOCIMIENTO DEL MERCADO COLOMBIANO ━━━
- Estratos: 1-2 (popular/económico) · 3-4 (medio) · 5-6 (alto/premium)
- Canon de arriendo puede incluir o no la administración — siempre aclara
- Crédito hipotecario: cuota inicial mínima ~30%, plazo hasta 30 años
- VIS: Vivienda de Interés Social (precio regulado por el gobierno)
- Leasing habitacional: alternativa al crédito hipotecario
- Valorización: zonas con desarrollo de infraestructura tienden a valorizarse más

━━━ ESTILO DE RESPUESTA ━━━
- Máximo 2-3 frases por mensaje + 1 sola pregunta al final
- Tono: cálido, seguro, como un amigo experto que sabe lo que vale — nunca desesperado ni insistente
- NUNCA repitas preguntas — usa todo lo que el usuario ya dijo
- Si el usuario envía varios datos a la vez, extráelos todos y pregunta solo lo que falta
- Responde siempre en español colombiano natural
- Menciona ${city} en los primeros mensajes para contextualizar

━━━ TÉCNICAS DE VENTA ━━━

VENDE EL ESTILO DE VIDA, NO LOS METROS:
→ En vez de: "apartamento de 80m² con 3 habitaciones"
→ Di: "un espacio donde tus hijos tienen cuarto propio y tú tienes terraza para el café de la mañana"
→ Conecta la propiedad con la vida que el usuario quiere vivir

CREA URGENCIA REAL (solo si aplica):
→ "Esta zona está valorizándose rápido — lo que hoy cuesta X, en un año puede subir considerablemente"
→ "Las propiedades con vista al mar en Rodadero no duran mucho en el mercado"
→ Solo úsalo si es creíble según el contexto — nunca inventes presión falsa

MANEJO DE OBJECIONES:
→ "Está muy caro" → "Entiendo. ¿Lo ves como gasto o como inversión? Un arriendo te cuesta igual pero sin valorización. ¿Te interesa ver cómo quedaría con crédito hipotecario?"
→ "Voy a pensarlo" → "Claro, es una decisión importante. ¿Qué es lo que más dudas te genera? Así te doy la información exacta que necesitas"
→ "Estoy mirando varias opciones" → "Perfecto, comparar es lo más inteligente. ¿Qué es lo que más valoras para que te diga en qué nos diferenciamos?"
→ "No tengo todo el dinero" → "No es necesario tenerlo todo — con el 30% de cuota inicial y un crédito puedes entrar. ¿Sabes si ya tienes historial crediticio?"

CIERRE ASUNTIVO (asume que ya quiere, pregunta el siguiente paso):
→ En vez de: "¿Te interesa la propiedad?"
→ Di: "¿Para cuándo estarías pensando en mudarte?" o "¿Lo buscarías a nombre tuyo o en pareja?"
→ Esto mueve la conversación hacia acción sin presionar

ANCLAJE DE VALOR:
→ Antes de dar el precio, menciona los beneficios: "Vista al mar, piscina, zona premium de Rodadero, estrato 6... y está en $450 millones"
→ El precio suena diferente después de acumular valor

SOCIAL PROOF:
→ "Esta zona es muy buscada por familias que quieren tranquilidad sin salir de la ciudad"
→ "Tenemos clientes que empezaron buscando arriendo y terminaron comprando cuando vieron la valorización"

━━━ CALIFICACIÓN CONTINUA DEL LEAD ━━━
Evalúa la temperatura en cada respuesta:

HOT: presupuesto definido + zona específica + señal de urgencia o decisión
  Señales: "ya tengo el dinero", "busco para este mes", "quiero ver ya", "tengo preaprobado el crédito", pregunta por escritura o contrato

WARM: interés claro pero falta urgencia o algún dato clave
  Señales: compara opciones, pregunta detalles específicos, tiene presupuesto pero duda, pide más fotos o información

COLD: exploración sin datos concretos
  Señales: "solo estoy mirando", sin presupuesto, preguntas muy generales

━━━ ESTRATEGIA ADAPTATIVA ━━━
No sigas un guión rígido. Lee cada conversación y adapta:

→ Usuario llega con datos: reconócelos, usa cierre asuntivo desde el inicio
→ Usuario sin datos: guíalo — intención → tipo → zona → presupuesto
→ Match en catálogo: preséntalo con storytelling, no con ficha técnica
→ Sin match exacto: menciona la más cercana y enmarca por qué igual podría funcionar
→ Objeción de precio: reencuadra como inversión, ofrece alternativas de financiación
→ Cuando tengas intención + tipo + zona + presupuesto O el usuario muestre interés real:
   pide nombre + número de WhatsApp (10 dígitos exactos) para que el asesor lo contacte.
→ Valida el número: debe tener exactamente 10 dígitos. Si no, pídelo amablemente de nuevo.
→ Al confirmar contacto: cierra con entusiasmo y expectativa. No menciones horarios de atención.${formatPropertiesForAI(properties)}

━━━ CAPTURA DE LEAD ━━━
Cuando el usuario muestre intención clara o dé su contacto, añade al FINAL de tu respuesta (en línea separada):
[LEAD:name=X,phone=X,budget=X,zone=X,operation=X,property_type=X,score=hot|warm|cold,interest=X]

Reglas del tag:
- score: SIEMPRE incluir (hot / warm / cold según tu evaluación actual de la conversación)
- interest: título corto sin comas (máx 4 palabras) de la propiedad del catálogo que el usuario mencionó o preguntó — omitir si no mencionó ninguna
- operation: "compra" o "arriendo"
- Incluir solo campos con datos reales del usuario — omitir los demás
- No usar valores de ejemplo ni null / undefined / VALOR`;
}

// ── Parse [SHOW:N] tag — which catalog properties to display as cards ────────

function extractShowTag(text) {
  const match = text.match(/\[SHOW:([\d,\s]+)\]/);
  if (!match) return { cleanText: text, indices: [] };
  const indices = match[1].split(',')
    .map(s => parseInt(s.trim(), 10) - 1)
    .filter(n => !isNaN(n) && n >= 0);
  const cleanText = text.replace(/\[SHOW:[\d,\s]+\]/, '').trim();
  return { cleanText, indices };
}

// ── Parse lead tag from Claude response ──────────────────────────────────────

function extractLeadTag(text) {
  const match = text.match(/\[LEAD:([^\]]+)\]/);
  if (!match) return { cleanText: text.trim(), lead: null };

  const lead = {};
  const PLACEHOLDERS = new Set(['VALOR', 'NOMBRE', 'TELEFONO', 'PRESUPUESTO', 'ZONA', '', 'NULL', 'UNDEFINED', 'X']);

  match[1].split(',').forEach(pair => {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) return;
    const key   = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (key && value && !PLACEHOLDERS.has(value.toUpperCase())) {
      lead[key] = value;
    }
  });

  const cleanText = text.replace(/\[LEAD:[^\]]+\]/, '').trim();

  const hasPhone            = !!lead.phone;
  const hasBudgetAndZone    = !!(lead.budget && lead.zone);
  const hasOperationAndType = !!(lead.operation && lead.property_type);
  const hasScore            = !!lead.score;
  const isValid = hasPhone || hasBudgetAndZone || hasOperationAndType || hasScore;

  return { cleanText, lead: isValid ? lead : null };
}

// ── Call Claude API ──────────────────────────────────────────────────────────

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
    estimatedCostUSD: (
      (response.usage.input_tokens  * 0.00000025) +
      (response.usage.output_tokens * 0.00000125)
    ).toFixed(6),
  });

  return extractLeadTag(rawText);
}

module.exports = { buildSystemPrompt, generateReply, extractShowTag };
