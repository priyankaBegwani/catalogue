import express from 'express';

const router = express.Router();

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
router.post('/', (req, res) => {
  // Always acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  console.log('[WhatsApp] Incoming payload:', JSON.stringify(req.body, null, 2));

  const entry   = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value   = changes?.value;

  if (!value?.messages?.length) return;

  const message = value.messages[0];
  const from    = message.from;
  const text    = message.text?.body || '';

  console.log(`[WhatsApp] Message from ${from}: "${text}"`);
});

export default router;
