const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch (_e) {
    return false;
  }
}

function validateInitData(initData) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  if (!initData || typeof initData !== 'string') throw new Error('initData is required');

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw new Error('Telegram hash is missing');

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqualHex(calculatedHash, receivedHash)) throw new Error('Telegram authorization data is invalid');

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) throw new Error('auth_date is invalid');
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (age < -60 || age > MAX_AUTH_AGE_SECONDS) throw new Error('Telegram authorization data is expired');

  let user;
  try { user = JSON.parse(params.get('user') || 'null'); }
  catch (_e) { throw new Error('Telegram user data is invalid'); }
  if (!user || user.id == null) throw new Error('Telegram user is missing');
  return user;
}

function loadBindings() {
  const file = path.join(process.cwd(), 'data', 'players.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    players: Array.isArray(parsed.players) ? parsed.players : [],
    admins: Array.isArray(parsed.admins) ? parsed.admins : []
  };
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@/, '').toLowerCase();
}

function identityMatches(entry, user) {
  const configuredId = entry?.telegramId == null ? '' : String(entry.telegramId).trim();
  const userId = String(user.id);
  if (configuredId && configuredId === userId) return true;
  const configuredUsername = normalizeUsername(entry?.telegramUsername);
  const username = normalizeUsername(user.username);
  return Boolean(configuredUsername && username && configuredUsername === username);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const user = validateInitData(req.body && req.body.initData);
    const { players, admins } = loadBindings();
    const admin = admins.find((entry) => identityMatches(entry, user));
    const match = admin ? null : players.find((entry) => identityMatches(entry, user));

    return res.status(200).json({
      ok: true,
      bound: Boolean(admin || match),
      role: admin ? 'admin' : (match ? 'player' : 'guest'),
      admin: admin ? { name: admin.name || 'Мастер' } : null,
      telegram: {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        photo_url: user.photo_url || ''
      },
      character: match ? match.character : null
    });
  } catch (error) {
    return res.status(401).json({ ok: false, error: error.message });
  }
};
