const faunadb = require('faunadb');
const serverless = require('serverless-http');
const fastify = require('fastify')({ logger: false });
const q = faunadb.query;
require('dotenv').config();

const client = new faunadb.Client({ secret: process.env.FAUNA_SECRET });
const getFaunaSecret = async ({ issuer: magic_id, email }) => {
  const { secret } = await client.query(
    q.Let(
      {
        existingUser: q.Match(q.Index('user_by_magic_id'), magic_id),
        alreadyExists: q.Exists(q.Var('existingUser')),
        user: q.If(
          q.Var('alreadyExists'),
          q.Get(q.Var('existingUser')),
          q.Create(q.Collection('User'), {
            data: {
              magic_id,
              email,
            },
          }),
        ),
        ref: q.Select(['ref'], q.Var('user')),
        token: q.Create(q.Tokens(), {
          instance: q.Var('ref'),
          ttl: q.TimeAdd(q.Now(), 2, 'minutes'),
        }),
      },
      {
        secret: q.Select(['secret'], q.Var('token')),
        // ref: q.Select(['ref'], q.Var('user')),
        // email: q.Select(['data', 'email'], q.Var('user')),
        // created: q.Not(q.Var('alreadyExists')),
      },
    ),
  );
  return secret;
};

fastify.post('/api/auth', async ({ body }) => {
  return {
    secret: await getFaunaSecret(body),
  };
});

module.exports.handler = serverless(fastify);
