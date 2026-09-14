const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const ALLOWED_KINDS = new Set(['sheet', 'inventory', 'money']);
const PARTY_MONEY_KEY = 'norvayne:shared:party-money';
const SHARED_NOTES_KEY = 'norvayne:shared:notes';
const MAX_SHARED_NOTES_LENGTH = 12000;

function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex')); }
  catch (_e) { return false; }
}
function validateInitData(initData) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  if (!initData || typeof initData !== 'string') throw new Error('initData is required');
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw new Error('Telegram hash is missing');
  const pairs = [];
  for (const [key, value] of params.entries()) if (key !== 'hash') pairs.push(`${key}=${value}`);
  pairs.sort();
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(pairs.join('\n')).digest('hex');
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
  return { players: Array.isArray(parsed.players) ? parsed.players : [], admins: Array.isArray(parsed.admins) ? parsed.admins : [] };
}
function normalizeUsername(value) { return String(value || '').trim().replace(/^@/, '').toLowerCase(); }
function identityMatches(entry, user) {
  const id = entry?.telegramId == null ? '' : String(entry.telegramId).trim();
  if (id && id === String(user.id)) return true;
  const a = normalizeUsername(entry?.telegramUsername), b = normalizeUsername(user.username);
  return Boolean(a && b && a === b);
}
function resolveCaller(user, bindings) {
  const admin = bindings.admins.find((entry) => identityMatches(entry, user));
  if (admin) return { role: 'admin', admin };
  const player = bindings.players.find((entry) => identityMatches(entry, user));
  if (player) return { role: 'player', player };
  return { role: 'guest' };
}
function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return url && token ? { url, token } : null;
}
async function redisCommand(command) {
  const cfg = redisConfig();
  if (!cfg) throw new Error('SHARED_STORAGE_NOT_CONFIGURED');
  const response = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error(`Shared storage error ${response.status}`);
  const data = await response.json();
  if (data && data.error) throw new Error(String(data.error));
  return data ? data.result : null;
}
function keyFor(characterId, kind) { return `norvayne:state:${characterId}:${kind}`; }
function validCharacterId(value, players) {
  const id = String(value || '').trim();
  return players.some((p) => String(p?.character?.id || '') === id) ? id : '';
}
function playerByCharacterId(value, players) {
  const id = validCharacterId(value, players);
  return id ? players.find((p) => String(p?.character?.id || '') === id) || null : null;
}
function normalizeEnvelope(value) {
  if (!value || typeof value !== 'object' || value.__norvayneSync !== 1 || !Object.prototype.hasOwnProperty.call(value, 'data')) return null;
  const updatedAt = Number(value.updatedAt);
  return { __norvayneSync: 1, updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(), data: value.data };
}
function makeEnvelope(data, updatedAt = Date.now()) {
  return { __norvayneSync: 1, updatedAt: Number(updatedAt) || Date.now(), data };
}
async function getEnvelope(characterId, kind) {
  const raw = await redisCommand(['GET', keyFor(characterId, kind)]);
  if (!raw) return null;
  try { return normalizeEnvelope(JSON.parse(raw)); } catch (_e) { return null; }
}
async function putEnvelope(characterId, kind, envelope, onlyIfNewer = false) {
  const incoming = normalizeEnvelope(envelope);
  if (!incoming) throw new Error('Invalid state envelope');
  if (onlyIfNewer) {
    const current = await getEnvelope(characterId, kind);
    if (current && Number(current.updatedAt) >= Number(incoming.updatedAt)) return current;
  }
  await redisCommand(['SET', keyFor(characterId, kind), JSON.stringify(incoming)]);
  return incoming;
}
async function putEnvelopePair(first, second) {
  const firstOld = await getEnvelope(first.characterId, first.kind);
  const secondOld = await getEnvelope(second.characterId, second.kind);
  try {
    const firstSaved = await putEnvelope(first.characterId, first.kind, first.envelope, false);
    const secondSaved = await putEnvelope(second.characterId, second.kind, second.envelope, false);
    return [firstSaved, secondSaved];
  } catch (error) {
    try {
      if (firstOld) await putEnvelope(first.characterId, first.kind, firstOld, false);
      else await redisCommand(['DEL', keyFor(first.characterId, first.kind)]);
      if (secondOld) await putEnvelope(second.characterId, second.kind, secondOld, false);
      else await redisCommand(['DEL', keyFor(second.characterId, second.kind)]);
    } catch (_rollbackError) {}
    throw error;
  }
}
function emptyInventory() { return []; }
function emptyMoney() { return { eagles: 0, sikels: 0 }; }
function safeMoneyValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
function normalizePersonalMoney(raw) {
  return { eagles: safeMoneyValue(raw?.eagles), sikels: safeMoneyValue(raw?.sikels) };
}
function safeInventory(raw) {
  return Array.isArray(raw) ? raw.map((item) => ({ ...item, quantity: Math.max(0, Math.floor(Number(item?.quantity) || 0)) })) : [];
}
function initialInventory(entry) {
  const direct = Array.isArray(entry?.character?.inventory) ? entry.character.inventory : [];
  const equipment = (Array.isArray(entry?.character?.equipment) ? entry.character.equipment : []).flatMap((group) => Array.isArray(group?.items) ? group.items : []);
  return safeInventory([...direct, ...equipment]);
}
function redisHashToObject(raw) {
  if (!raw) return {};
  if (!Array.isArray(raw) && typeof raw === 'object') return raw;
  const obj = {};
  if (Array.isArray(raw)) {
    for (let i = 0; i + 1 < raw.length; i += 2) obj[String(raw[i])] = raw[i + 1];
  }
  return obj;
}
async function getPartyMoney() {
  const raw = await redisCommand(['HGETALL', PARTY_MONEY_KEY]);
  const data = redisHashToObject(raw);
  return {
    eagles: safeMoneyValue(data.eagles),
    sikels: safeMoneyValue(data.sikels),
    updatedAt: Number(data.updatedAt) || 0,
    updatedBy: String(data.updatedBy || '')
  };
}
async function changePartyMoney(code, operation, amount, actor) {
  if (!['eagles', 'sikels'].includes(code)) throw new Error('Invalid currency');
  if (!['add', 'subtract', 'set'].includes(operation)) throw new Error('Invalid money operation');
  const safeAmount = safeMoneyValue(amount);
  const now = Date.now();
  const script = `
local current = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '0')
local action = ARGV[2]
local amount = tonumber(ARGV[3]) or 0
local nextValue = current
if action == 'add' then
  nextValue = current + amount
elseif action == 'subtract' then
  if amount > current then return -1 end
  nextValue = current - amount
elseif action == 'set' then
  nextValue = amount
else
  return -2
end
if nextValue < 0 then nextValue = 0 end
nextValue = math.floor(nextValue)
redis.call('HSET', KEYS[1], ARGV[1], tostring(nextValue), 'updatedAt', ARGV[4], 'updatedBy', ARGV[5])
return nextValue
`;
  const result = Number(await redisCommand(['EVAL', script, '1', PARTY_MONEY_KEY, code, operation, String(safeAmount), String(now), String(actor || '')]));
  if (result === -1) return { applied: false, reason: 'INSUFFICIENT_FUNDS', money: await getPartyMoney() };
  if (result === -2) throw new Error('Invalid money operation');
  return { applied: true, money: await getPartyMoney() };
}
function normalizeSharedNotes(raw) {
  const text = String(raw?.text || '').slice(0, MAX_SHARED_NOTES_LENGTH);
  return { text, updatedAt: Number(raw?.updatedAt) || 0, updatedBy: String(raw?.updatedBy || '') };
}
async function getSharedNotes() {
  const raw = await redisCommand(['GET', SHARED_NOTES_KEY]);
  if (!raw) return normalizeSharedNotes({});
  try { return normalizeSharedNotes(JSON.parse(raw)); } catch (_e) { return normalizeSharedNotes({}); }
}
async function setSharedNotes(text, actor) {
  const clean = normalizeSharedNotes({ text, updatedAt: Date.now(), updatedBy: actor });
  await redisCommand(['SET', SHARED_NOTES_KEY, JSON.stringify(clean)]);
  return clean;
}
function publicPlayerList(bindings, ownId = '') {
  return bindings.players.map((entry) => ({
    id: String(entry?.character?.id || ''),
    name: String(entry?.character?.name || 'Персонаж'),
    title: String(entry?.character?.title || ''),
    avatar: String(entry?.character?.avatar || ''),
    telegramUsername: String(entry?.telegramUsername || '')
  })).filter((row) => row.id && row.id !== ownId);
}
function actorName(caller, user) {
  return caller.player?.character?.name || caller.admin?.name || caller.player?.telegramUsername || user.username || String(user.id);
}
async function transferPersonalMoney(bindings, caller, targetId, code, amount) {
  if (caller.role !== 'player') return { applied: false, reason: 'PLAYER_ONLY' };
  if (!['eagles', 'sikels'].includes(code)) return { applied: false, reason: 'INVALID_CURRENCY' };
  const safeAmount = safeMoneyValue(amount);
  if (safeAmount <= 0) return { applied: false, reason: 'INVALID_AMOUNT' };
  const senderId = String(caller.player?.character?.id || '');
  const recipient = playerByCharacterId(targetId, bindings.players);
  if (!recipient || targetId === senderId) return { applied: false, reason: 'INVALID_RECIPIENT' };

  const [senderEnvelope, receiverEnvelope] = await Promise.all([getEnvelope(senderId, 'money'), getEnvelope(targetId, 'money')]);
  const senderMoney = normalizePersonalMoney(senderEnvelope?.data || caller.player?.character?.money || emptyMoney());
  const receiverMoney = normalizePersonalMoney(receiverEnvelope?.data || recipient?.character?.money || emptyMoney());
  if (safeAmount > senderMoney[code]) return { applied: false, reason: 'INSUFFICIENT_FUNDS', senderMoney };

  senderMoney[code] -= safeAmount;
  receiverMoney[code] += safeAmount;
  const now = Date.now();
  const [senderSaved, receiverSaved] = await putEnvelopePair(
    { characterId: senderId, kind: 'money', envelope: makeEnvelope(senderMoney, now) },
    { characterId: targetId, kind: 'money', envelope: makeEnvelope(receiverMoney, now + 1) }
  );
  return {
    applied: true,
    senderEnvelope: senderSaved,
    receiverEnvelope: receiverSaved,
    senderMoney,
    receiverMoney,
    recipient: { id: targetId, name: String(recipient?.character?.name || 'Персонаж') }
  };
}
function inventoryMergeKey(item) {
  const catalogId = String(item?.catalogId || '').trim();
  if (catalogId) return `catalog:${catalogId}`;
  return `custom:${String(item?.name || '').trim().toLowerCase()}|${String(item?.price ?? '')}|${String(item?.weight ?? '')}|${String(item?.notes || '').trim().toLowerCase()}`;
}
async function transferInventoryItem(bindings, caller, targetId, itemId, amount) {
  if (caller.role !== 'player') return { applied: false, reason: 'PLAYER_ONLY' };
  const safeAmount = safeMoneyValue(amount);
  if (safeAmount <= 0) return { applied: false, reason: 'INVALID_AMOUNT' };
  const senderId = String(caller.player?.character?.id || '');
  const recipient = playerByCharacterId(targetId, bindings.players);
  if (!recipient || targetId === senderId) return { applied: false, reason: 'INVALID_RECIPIENT' };

  const [senderEnvelope, receiverEnvelope] = await Promise.all([getEnvelope(senderId, 'inventory'), getEnvelope(targetId, 'inventory')]);
  const senderInventory = safeInventory(senderEnvelope?.data || initialInventory(caller.player));
  const receiverInventory = safeInventory(receiverEnvelope?.data || initialInventory(recipient));
  const source = senderInventory.find((item) => String(item?.id || '') === String(itemId || ''));
  if (!source) return { applied: false, reason: 'ITEM_NOT_FOUND' };
  if (safeAmount > Math.max(0, Number(source.quantity) || 0)) return { applied: false, reason: 'INSUFFICIENT_ITEMS' };

  source.quantity = Math.max(0, Number(source.quantity) - safeAmount);
  const key = inventoryMergeKey(source);
  const existing = receiverInventory.find((item) => inventoryMergeKey(item) === key);
  if (existing) existing.quantity = Math.max(0, Number(existing.quantity) || 0) + safeAmount;
  else receiverInventory.push({
    ...source,
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    quantity: safeAmount,
    equipped: false
  });

  const now = Date.now();
  const [senderSaved, receiverSaved] = await putEnvelopePair(
    { characterId: senderId, kind: 'inventory', envelope: makeEnvelope(senderInventory, now) },
    { characterId: targetId, kind: 'inventory', envelope: makeEnvelope(receiverInventory, now + 1) }
  );
  return {
    applied: true,
    senderEnvelope: senderSaved,
    receiverEnvelope: receiverSaved,
    senderInventory,
    receiverInventory,
    item: { id: String(source.id || ''), name: String(source.name || 'Предмет'), quantity: safeAmount },
    recipient: { id: targetId, name: String(recipient?.character?.name || 'Персонаж') }
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    const user = validateInitData(req.body && req.body.initData);
    const bindings = loadBindings();
    const caller = resolveCaller(user, bindings);
    if (caller.role === 'guest') return res.status(403).json({ ok: false, error: 'User is not bound' });
    if (!redisConfig()) return res.status(503).json({ ok: false, storageAvailable: false, error: 'Shared storage is not configured' });

    const action = String(req.body?.action || '');
    const kind = String(req.body?.kind || '');
    const characterId = validCharacterId(req.body?.characterId, bindings.players);
    const ownId = caller.role === 'player' ? String(caller.player?.character?.id || '') : '';

    if (action === 'party-money-get') {
      const money = await getPartyMoney();
      return res.status(200).json({ ok: true, storageAvailable: true, money });
    }

    if (action === 'party-money-change') {
      if (caller.role !== 'player') return res.status(403).json({ ok: false, error: 'Only players can edit the shared treasury' });
      const code = String(req.body?.currency || '');
      const operation = String(req.body?.operation || '');
      const amount = safeMoneyValue(req.body?.amount);
      const result = await changePartyMoney(code, operation, amount, actorName(caller, user));
      return res.status(200).json({ ok: true, storageAvailable: true, ...result });
    }

    if (action === 'party-context') {
      const [partyMoney, notes] = await Promise.all([getPartyMoney(), getSharedNotes()]);
      return res.status(200).json({
        ok: true,
        storageAvailable: true,
        players: publicPlayerList(bindings, ownId),
        partyMoney,
        notes
      });
    }

    if (action === 'live-sync') {
      const [partyMoney, notes] = await Promise.all([getPartyMoney(), getSharedNotes()]);
      if (caller.role !== 'player') return res.status(200).json({ ok: true, storageAvailable: true, partyMoney, notes });
      const [moneyEnvelope, inventoryEnvelope] = await Promise.all([getEnvelope(ownId, 'money'), getEnvelope(ownId, 'inventory')]);
      return res.status(200).json({ ok: true, storageAvailable: true, partyMoney, notes, moneyEnvelope, inventoryEnvelope });
    }

    if (action === 'shared-notes-get') {
      const notes = await getSharedNotes();
      return res.status(200).json({ ok: true, storageAvailable: true, notes });
    }

    if (action === 'shared-notes-set') {
      if (caller.role !== 'player') return res.status(403).json({ ok: false, error: 'Only players can edit shared notes' });
      const text = String(req.body?.text || '').slice(0, MAX_SHARED_NOTES_LENGTH);
      const notes = await setSharedNotes(text, actorName(caller, user));
      return res.status(200).json({ ok: true, storageAvailable: true, notes });
    }

    if (action === 'transfer-money') {
      const targetId = validCharacterId(req.body?.targetCharacterId, bindings.players);
      const code = String(req.body?.currency || '');
      const amount = safeMoneyValue(req.body?.amount);
      const result = await transferPersonalMoney(bindings, caller, targetId, code, amount);
      return res.status(200).json({ ok: true, storageAvailable: true, ...result });
    }

    if (action === 'transfer-item') {
      const targetId = validCharacterId(req.body?.targetCharacterId, bindings.players);
      const itemId = String(req.body?.itemId || '');
      const amount = safeMoneyValue(req.body?.amount);
      const result = await transferInventoryItem(bindings, caller, targetId, itemId, amount);
      return res.status(200).json({ ok: true, storageAvailable: true, ...result });
    }

    if (action === 'get') {
      if (!characterId || !ALLOWED_KINDS.has(kind)) return res.status(400).json({ ok: false, error: 'Invalid character or state kind' });
      if (caller.role === 'player' && ownId !== characterId) return res.status(403).json({ ok: false, error: 'Forbidden' });
      const envelope = await getEnvelope(characterId, kind);
      return res.status(200).json({ ok: true, storageAvailable: true, envelope });
    }

    if (action === 'set') {
      if (caller.role !== 'player') return res.status(403).json({ ok: false, error: 'Only the character owner can edit this state' });
      if (!characterId || characterId !== ownId || !ALLOWED_KINDS.has(kind)) return res.status(403).json({ ok: false, error: 'Forbidden' });
      const envelope = await putEnvelope(characterId, kind, req.body?.envelope, false);
      return res.status(200).json({ ok: true, storageAvailable: true, envelope });
    }

    if (action === 'admin-seed') {
      if (caller.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' });
      if (!characterId || !ALLOWED_KINDS.has(kind)) return res.status(400).json({ ok: false, error: 'Invalid character or state kind' });
      const envelope = await putEnvelope(characterId, kind, req.body?.envelope, true);
      return res.status(200).json({ ok: true, storageAvailable: true, envelope });
    }

    if (action === 'admin-list') {
      if (caller.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin only' });
      const [partyMoney, notes] = await Promise.all([getPartyMoney(), getSharedNotes()]);
      const rows = await Promise.all(bindings.players.map(async (entry) => {
        const id = String(entry?.character?.id || '');
        const [sheetEnvelope, inventoryEnvelope, moneyEnvelope] = await Promise.all([
          getEnvelope(id, 'sheet'),
          getEnvelope(id, 'inventory'),
          getEnvelope(id, 'money')
        ]);
        return {
          character: entry.character,
          telegramUsername: entry.telegramUsername || '',
          sheet: sheetEnvelope?.data && typeof sheetEnvelope.data === 'object' ? sheetEnvelope.data : null,
          inventory: Array.isArray(inventoryEnvelope?.data) ? inventoryEnvelope.data : emptyInventory(),
          money: moneyEnvelope?.data && typeof moneyEnvelope.data === 'object' ? moneyEnvelope.data : emptyMoney(),
          updatedAt: Math.max(Number(sheetEnvelope?.updatedAt)||0, Number(inventoryEnvelope?.updatedAt)||0, Number(moneyEnvelope?.updatedAt)||0)
        };
      }));
      return res.status(200).json({ ok: true, storageAvailable: true, partyMoney, notes, players: rows });
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (error) {
    const code = error && error.message === 'SHARED_STORAGE_NOT_CONFIGURED' ? 503 : 401;
    return res.status(code).json({ ok: false, storageAvailable: code !== 503, error: error.message });
  }
};
