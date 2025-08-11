// server.js (Node/Express) - simple verify endpoint
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const IS_SANDBOX = process.env.PAYPAL_ENV !== 'production';
const PAYPAL_OAUTH = IS_SANDBOX ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token' : 'https://api-m.paypal.com/v1/oauth2/token';
const PAYPAL_ORDER = IS_SANDBOX ? 'https://api-m.sandbox.paypal.com/v2/checkout/orders' : 'https://api-m.paypal.com/v2/checkout/orders';

async function getAccessToken() {
  const creds = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(PAYPAL_OAUTH, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

app.post('/verify-order', async (req, res) => {
  const { orderID } = req.body;
  if (!orderID) return res.status(400).json({ error: 'orderID required' });
  try {
    const token = await getAccessToken();
    const r = await fetch(`${PAYPAL_ORDER}/${orderID}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const order = await r.json();
    // check status
    if (order.status === 'COMPLETED' || order.status === 'APPROVED') {
      // (optionally) capture payment here if not auto-captured
      return res.json({ ok: true, order });
    } else {
      return res.json({ ok: false, order });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'verification failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
