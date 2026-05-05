const logger = require('../utils/logger');

async function sendTelegramAlert(lead, clientName) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn('notificationService', 'Telegram credentials not configured');
    return;
  }

  const lines = [
    `🏠 *Nuevo lead — ${clientName}*`,
    lead.nombre ? `👤 Nombre: ${lead.nombre}` : null,
    lead.phone  ? `📱 WhatsApp: ${lead.phone}`  : null,
    lead.zone   ? `📍 Zona: ${lead.zone}`       : null,
    lead.budget ? `💰 Presupuesto: ${lead.budget}` : null,
  ].filter(Boolean);

  const text = lines.join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    if (!data.ok) logger.warn('notificationService', 'Telegram rejected message', data);
  } catch (err) {
    logger.error('notificationService', 'Failed to send Telegram alert', { message: err.message });
  }
}

module.exports = { sendTelegramAlert };
