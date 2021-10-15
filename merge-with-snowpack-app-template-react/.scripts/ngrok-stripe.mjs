#!/usr/bin/env node

import ngrok from 'ngrok';
import dotenv from 'dotenv';
import _stripe from 'stripe';

dotenv.config();

const { STRIPE_SECRET } = process.env;
const stripe = _stripe(STRIPE_SECRET);
(async () => {
  await ngrok.connect({ addr: 8888, proto: 'http' });
  const api = ngrok.getApi();
  const { tunnels } = await api.listTunnels();
  const http = tunnels.find((item) => item.proto === 'http').public_url;
  const https = tunnels.find((item) => item.proto === 'https').public_url;
  console.log(http);
  const { id } = await stripe.webhookEndpoints.create({
    url: https + '/api/stripe-endpoint',
    enabled_events: ['customer.subscription.updated'],
  });
  process.on('SIGINT', async () => {
    await stripe.webhookEndpoints.del(id);
    process.exit();
  });
})();
