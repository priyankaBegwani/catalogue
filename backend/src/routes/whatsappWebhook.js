import express from 'express';

const router = express.Router();

// Send a text reply via Meta WhatsApp Cloud API
async function sendReply(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  );

  const result = await res.json();
  console.log('[WhatsApp] Reply result:', JSON.stringify(result));
}

// GET /webhook/whatsapp — Meta verification challenge
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

// POST /webhook/whatsapp — incoming messages from Meta
router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value?.messages?.length) return;

    const message = value.messages[0];
    const from    = message.from;
    const text    = message.text?.body || '';

    console.log(`[WhatsApp] Message from ${from}: "${text}"`);

    await sendReply(from, `You said: "${text}". This is a test reply from Whollio! 🎉`);
  } catch (err) {
    console.error('[WhatsApp] Error:', err.message);
  }
});

export default router;
