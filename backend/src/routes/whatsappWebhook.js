import express from 'express';
import { supabaseAdmin } from '../config.js';

const router = express.Router();

// ─── Patterns ────────────────────────────────────────────────────────────────

const GREETING_RE  = /^\s*(hi+|hello|hey|hlo|hii|helo|namaste|namaskar|hy|good\s*(morning|evening|afternoon))\b/i;
const ORDER_NO_RE  = /\bORD-\d{6,8}-\d+\b/i;
const MENU_WORD_RE = /^\s*menu\s*$/i;

const STATUS_LABELS = {
  pending:             '🕐 Pending',
  picked:              '📦 Picked',
  ironed:              '✅ Ironed',
  'ready to dispatch': '📬 Ready to Dispatch',
  dispatched:          '🚚 Dispatched',
  'part picked':       '📦 Part Picked',
  'part dispatched':   '🚚 Part Dispatched',
};

// ─── Meta API ─────────────────────────────────────────────────────────────────

async function callMeta(payload) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    return;
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    }
  );
  const json = await res.json();
  if (!res.ok) console.error('[WhatsApp] Meta API error:', JSON.stringify(json));
  return json;
}

async function sendText(to, body) {
  return callMeta({ to, type: 'text', text: { body } });
}

// Interactive list — works for session messages (user initiated), no template needed.
// title max 24 chars, description max 72 chars, button label max 20 chars.
async function sendMenu(to) {
  return callMeta({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: '👋 Hi! How can I help you today?' },
      action: {
        button: 'See Options',
        sections: [
          {
            title: 'Choose an option',
            rows: [
              { id: 'view_catalog',    title: '🛍️ View Catalog',    description: 'Browse our latest designs'      },
              { id: 'track_order',     title: '📦 Track My Order',   description: 'Check the status of your order' },
              { id: 'place_order',     title: '🛒 Place an Order',   description: 'Start a new order'              },
              { id: 'talk_to_someone', title: '💬 Talk to Someone',  description: 'Our team will reach out'        },
            ],
          },
        ],
      },
    },
  });
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function resolvePhoneToPartyAndTenant(phone) {
  const last10 = phone.replace(/\D/g, '').slice(-10);

  // 1. Search party_phone_numbers
  const { data: ppn } = await supabaseAdmin
    .from('party_phone_numbers')
    .select('party_id, parties(id, name)')
    .ilike('phone_number', `%${last10}%`)
    .limit(1)
    .maybeSingle();

  let partyId   = ppn?.party_id   ?? null;
  let partyName = ppn?.parties?.name ?? null;

  // 2. Fallback: parties.phone_number directly
  if (!partyId) {
    const { data: party } = await supabaseAdmin
      .from('parties')
      .select('id, name')
      .ilike('phone_number', `%${last10}%`)
      .limit(1)
      .maybeSingle();
    partyId   = party?.id   ?? null;
    partyName = party?.name ?? null;
  }

  if (!partyId) return { partyId: null, tenantId: null, partyName: null };

  // 3. Resolve tenant via user_profiles.party_id → tenant_id
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id')
    .eq('party_id', partyId)
    .limit(1)
    .maybeSingle();

  return { partyId, tenantId: profile?.tenant_id ?? null, partyName };
}

// Find or create a whatsapp_contacts row. Tenant resolution only runs on first contact.
async function upsertContact(phone) {
  const { data: existing } = await supabaseAdmin
    .from('whatsapp_contacts')
    .select('id, party_id, tenant_id, bot_state, display_name')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('whatsapp_contacts')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing;
  }

  const { partyId, tenantId, partyName } = await resolvePhoneToPartyAndTenant(phone);

  const { data: inserted } = await supabaseAdmin
    .from('whatsapp_contacts')
    .insert({ phone, party_id: partyId, tenant_id: tenantId, display_name: partyName })
    .select('id, party_id, tenant_id, bot_state, display_name')
    .single();

  return inserted;
}

async function saveMessage({ contactId, tenantId, direction, body, metaMessageId = null, isBotReply = false }) {
  const { error } = await supabaseAdmin.from('whatsapp_messages').insert({
    contact_id:      contactId,
    tenant_id:       tenantId    ?? null,
    direction,
    body:            body        ?? '',
    meta_message_id: metaMessageId,
    is_bot_reply:    isBotReply,
  });
  if (error) console.error('[WhatsApp] saveMessage error:', error.message);
}

async function setContactState(contactId, state) {
  await supabaseAdmin
    .from('whatsapp_contacts')
    .update({ bot_state: state ?? null })
    .eq('id', contactId);
}

async function getTenantSlug(tenantId) {
  if (!tenantId) return null;
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle();
  return data?.slug ?? null;
}

// ─── Bot handlers ─────────────────────────────────────────────────────────────

async function handleGreeting(to, contact) {
  const menuBody = '👋 Hi! How can I help you today?';
  await sendMenu(to);
  await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body: menuBody, isBotReply: true });
  await setContactState(contact.id, null);
}

async function handleMenuSelection(selectionId, to, contact) {
  if (selectionId === 'view_catalog' || selectionId === 'place_order') {
    const slug      = await getTenantSlug(contact.tenant_id);
    const appDomain = process.env.APP_DOMAIN;
    const catalogUrl = slug && appDomain ? `https://${slug}.${appDomain}` : null;

    const body = selectionId === 'view_catalog'
      ? `🛍️ Here's your catalog link:\n${catalogUrl ?? 'Contact us for the link'}\n\nBrowse our latest designs and add items to your cart.`
      : `🛒 To place an order, start by browsing the catalog:\n${catalogUrl ?? 'Contact us for the link'}\n\nAdd items to your cart and we'll confirm your order.`;

    await sendText(to, body);
    await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body, isBotReply: true });
    await setContactState(contact.id, null);
    return;
  }

  if (selectionId === 'track_order') {
    const body = '📦 Please send your order number (e.g. *ORD-20250607-12345*) and I\'ll look it up for you.';
    await sendText(to, body);
    await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body, isBotReply: true });
    await setContactState(contact.id, 'awaiting_order_number');
    return;
  }

  if (selectionId === 'talk_to_someone') {
    const body = '👍 Noted! One of our team members will reach out to you on WhatsApp shortly.\n\nYou can also reply *menu* at any time to see all options.';
    await sendText(to, body);
    await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body, isBotReply: true });
    await setContactState(contact.id, null);
  }
}

async function handleOrderLookup(rawInput, to, contact) {
  const match = rawInput.match(ORDER_NO_RE);
  if (!match) {
    const body = '❓ That doesn\'t look like a valid order number.\n\nPlease send it in the format *ORD-20250607-12345*, or reply *menu* to go back.';
    await sendText(to, body);
    await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body, isBotReply: true });
    return;
  }

  const orderNumber = match[0].toUpperCase();

  let query = supabaseAdmin
    .from('orders')
    .select('order_number, status, created_at, party_name')
    .ilike('order_number', orderNumber)
    .limit(1);

  // Scope to the party if we know who this contact is — prevents leaking another brand's order
  if (contact.party_id) query = query.eq('party_id', contact.party_id);

  const { data: order } = await query.maybeSingle();

  let body;
  if (!order) {
    body = `❌ Couldn't find order *${orderNumber}*.\n\nPlease check the number and try again, or reply *menu* for other options.`;
  } else {
    const statusLabel = STATUS_LABELS[order.status] ?? order.status;
    const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    body = `📦 *Order ${order.order_number}*\nStatus: ${statusLabel}\nDate: ${date}\nParty: ${order.party_name ?? '-'}\n\nReply *menu* to go back to the main menu.`;
  }

  await sendText(to, body);
  await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body, isBotReply: true });
  await setContactState(contact.id, null);
}

// ─── Webhook routes ───────────────────────────────────────────────────────────

// GET — Meta hub verification challenge
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// POST — incoming messages from Meta
router.post('/', async (req, res) => {
  // Always ack immediately — Meta retries if it doesn't get 200 within 20s
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;

    // Ignore delivery receipts, read receipts, etc.
    if (!value?.messages?.length) return;

    const message = value.messages[0];
    const from    = message.from;   // "919876543210"
    const msgType = message.type;   // text | interactive | image | audio | ...

    // Only handle text and interactive — ignore media
    if (msgType !== 'text' && msgType !== 'interactive') {
      console.log(`[WhatsApp] Ignored type=${msgType} from ${from}`);
      return;
    }

    // Resolve or create contact, cache party+tenant for future messages
    const contact = await upsertContact(from);

    // Extract body text for storage
    const inboundBody = msgType === 'text'
      ? (message.text?.body ?? '')
      : (message.interactive?.list_reply?.title ?? message.interactive?.button_reply?.title ?? '');

    await saveMessage({
      contactId:     contact.id,
      tenantId:      contact.tenant_id,
      direction:     'inbound',
      body:          inboundBody,
      metaMessageId: message.id,
      isBotReply:    false,
    });

    console.log(`[WhatsApp] from=${from} (${contact.display_name ?? 'unknown'}) state=${contact.bot_state ?? 'none'} msg="${inboundBody}"`);

    // ── Route ─────────────────────────────────────────────────────────────

    // 1. Interactive list/button reply → menu selection
    if (msgType === 'interactive') {
      const selectionId = message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id;
      if (selectionId) await handleMenuSelection(selectionId, from, contact);
      return;
    }

    const text = inboundBody.trim();

    // 2. Waiting for order number
    if (contact.bot_state === 'awaiting_order_number') {
      await handleOrderLookup(text, from, contact);
      return;
    }

    // 3. Explicit "menu" keyword — works from any state
    if (MENU_WORD_RE.test(text)) {
      await handleGreeting(from, contact);
      return;
    }

    // 4. Greeting → welcome + menu
    if (GREETING_RE.test(text)) {
      await handleGreeting(from, contact);
      return;
    }

    // 5. Unrecognized input → gentle nudge
    const fallback = 'I didn\'t quite get that. 😊\n\nReply *menu* to see what I can help you with.';
    await sendText(from, fallback);
    await saveMessage({ contactId: contact.id, tenantId: contact.tenant_id, direction: 'outbound', body: fallback, isBotReply: true });

  } catch (err) {
    console.error('[WhatsApp] Unhandled error:', err.message, err.stack);
  }
});

export default router;
