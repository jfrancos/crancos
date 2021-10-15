#!/usr/bin/env node

import dotenv from 'dotenv';
import _stripe from 'stripe';
import fs from 'fs';
import { execSync } from 'child_process';
import { join, basename } from 'path';
import { parse, stringify } from 'ini';

dotenv.config();

const { STRIPE_SECRET } = process.env;
const stripe = _stripe(STRIPE_SECRET);

(async () => {
  const { id: basicProductId } = await stripe.products.create({
    name: 'Todo Basic',
  });

  const { id: basicPriceId } = await stripe.prices.create({
    unit_amount: 0,
    currency: 'usd',
    recurring: { interval: 'month' },
    product: basicProductId,
  });

  const { id: premiumProductId } = await stripe.products.create({
    name: 'Todo Premium',
  });

  const premiumPrices = [
    {
      unit_amount: 400,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: premiumProductId,
    },
    {
      unit_amount: 1900,
      currency: 'usd',
      recurring: { interval: 'month', interval_count: 6 },
      product: premiumProductId,
    },
    {
      unit_amount: 3400,
      currency: 'usd',
      recurring: { interval: 'year' },
      product: premiumProductId,
    },
  ];

  const premiumPriceIds = [];

  for (const price of premiumPrices) {
    const { id } = await stripe.prices.create(price);
    premiumPriceIds.push(id);
  }

  const topLevel = execSync('git rev-parse --show-toplevel', {
    encoding: 'utf-8',
  }).trim();
  const envPath = join(topLevel, '.env');

  const envFile = fs.readFileSync(envPath, 'utf-8');
  const env = parse(envFile);
  env.STRIPE_DEFAULT_PRICE = basicPriceId;
  const configuration = await stripe.billingPortal.configurations.create({
    features: {
      subscription_update: {
        default_allowed_updates: ['price'],
        enabled: true,
        products: [
          {
            product: basicProductId,
            prices: [basicPriceId],
          },
          {
            product: premiumProductId,
            prices: premiumPriceIds,
          },
        ],
      },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
    },
    business_profile: {
      privacy_policy_url: 'http://localhost:8888/privacy',
      terms_of_service_url: 'http://localhost:8888/terms',
    },
  });

  fs.writeFileSync(envPath, stringify(env));
  console.log(configuration);
})();
