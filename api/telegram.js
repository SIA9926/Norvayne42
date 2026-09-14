const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'Norvayne_bot';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://norvayne.vercel.app/api/telegram';
const MINI_APP_LINK = process.env.MINI_APP_LINK || `https://t.me/${BOT_USERNAME}?startapp=map`;

function miniAppLink(tab) {
  try {
    const link = new URL(MINI_APP_LINK);
    // For Telegram bot deep links use startapp, for a direct web URL use tab.
    if (/(^|\.)t\.me$/i.test(link.hostname)) {
      link.searchParams.set('startapp', tab);
    } else {
      link.searchParams.set('tab', tab);
    }
    return link.toString();
  } catch (_error) {
    const joiner = MINI_APP_LINK.includes('?') ? '&' : '?';
    return `${MINI_APP_LINK}${joiner}tab=${encodeURIComponent(tab)}`;
  }
}

async function telegram(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API error: ${response.status}`);
  }
  return data;
}

module.exports = async (req, res) => {
  if (!BOT_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured in Vercel.'
    });
  }

  // Open this URL once after every token/domain change.
  if (req.method === 'GET') {
    try {
      const setResult = await telegram('setWebhook', {
        url: WEBHOOK_URL,
        allowed_updates: ['message'],
        drop_pending_updates: false
      });
      const info = await telegram('getWebhookInfo');
      return res.status(200).json({
        ok: true,
        message: 'Webhook is configured. Open @Norvayne_bot and press Start.',
        webhook: WEBHOOK_URL,
        telegram: setResult.result,
        webhook_info: info.result
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const update = req.body || {};
    const message = update.message;

    if (!message || !message.chat) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const text = (message.text || '').trim();
    const command = text.split(/\s+/)[0].split('@')[0];

    if (command !== '/start') {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const firstName = message.from && message.from.first_name
      ? `, ${message.from.first_name}`
      : '';

    const payload = {
      chat_id: message.chat.id,
      text: `Добро пожаловать${firstName} в Norvayne!\n\nВыбери раздел:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '👤 Персонаж', url: miniAppLink('character') }],
          [{ text: '🗺 Карта', url: miniAppLink('map') }],
          [{ text: '📅 Календарь', url: miniAppLink('calendar') }]
        ]
      }
    };

    // Important for Vercel: wait for Telegram to accept sendMessage BEFORE replying 200.
    if (message.message_thread_id) {
      payload.message_thread_id = message.message_thread_id;
    }

    const sent = await telegram('sendMessage', payload);
    return res.status(200).json({ ok: true, sent: true, message_id: sent.result.message_id });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    // Return 500 so Telegram can retry instead of silently losing the update.
    return res.status(500).json({ ok: false, error: error.message });
  }
};
