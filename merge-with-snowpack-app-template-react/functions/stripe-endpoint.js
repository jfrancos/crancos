require('dotenv').config();
const faunadb = require('faunadb');
const serverless = require('serverless-http');
const fastify = require('fastify')({ logger: true });

const q = faunadb.query;
const { FAUNA_SECRET, STRIPE_SECRET } = process.env;

// const stripe = require('stripe')(STRIPE_SECRET);
// Should be checking signature

fastify.post(
  '/api/stripe-endpoint',
  async ({
    body: {
      data: { object },
    },
  }) => {
    const client = new faunadb.Client({ secret: FAUNA_SECRET });
    const data = await client.query(
      q.Update(
        q.Select(
          ['ref'],
          q.Get(q.Match(q.Index('user_by_stripe_id'), object.customer)),
        ),
        {
          data: { plan: object.plan.amount > 0 ? 'premium' : 'free' },
        },
      ),
    );
    return 200;
  },
);
module.exports.handler = serverless(fastify);
