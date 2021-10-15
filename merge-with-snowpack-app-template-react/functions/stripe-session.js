require('dotenv').config();
const faunadb = require('faunadb');
const serverless = require('serverless-http');
const fastify = require('fastify')({ logger: true });
const { Magic } = require('@magic-sdk/admin');

const q = faunadb.query;

const { MAGIC_SECRET, FAUNA_SECRET, STRIPE_SECRET } = process.env;
const magic = new Magic(MAGIC_SECRET);

const stripe = require('stripe')(STRIPE_SECRET);

const client = new faunadb.Client({ secret: FAUNA_SECRET });

fastify.post('/api/stripe-session', async ({ body: token }) => {
  const [, { iat }] = magic.token.decode(token);

  magic.token.validate(token);
  if (iat + 15 < Date.now() / 1000) {
    throw 'token too old';
  }
  const { issuer: magic_id, email } = await magic.users.getMetadataByToken(
    token,
  );

  const {
    data: { stripe_id },
  } = await client.query(q.Get(q.Match(q.Index('user_by_magic_id'), magic_id)));
  const { url } = await stripe.billingPortal.sessions.create({
    customer: stripe_id,
    return_url: 'http://localhost:8888',
  });
  return { url };
});

module.exports.handler = serverless(fastify);
