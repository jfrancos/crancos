require('dotenv').config();
const faunadb = require('faunadb');
const serverless = require('serverless-http');
const { Magic } = require('@magic-sdk/admin');
const fastify = require('fastify')({ logger: true });
const q = faunadb.query;

const { FAUNA_SECRET, MAGIC_SECRET } = process.env;
const magic = new Magic(MAGIC_SECRET);

const client = new faunadb.Client({ secret: FAUNA_SECRET });

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getFaunaSecret = async (token) => {
  //   await sleep(2000);
  const [, { iat }] = magic.token.decode(token);
  magic.token.validate(token);
  if (iat + 15 < Date.now() / 1000) {
    throw 'token too old';
  }
  const { issuer: magic_id, email } = await magic.users.getMetadataByToken(
    token,
  );
  return await client.query(
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
          ttl: q.TimeAdd(q.Now(), 8, 'hours'),
          // for testing:
          // ttl: q.TimeAdd(q.Now(), 15, 'minutes'),
          // ttl: q.TimeAdd(q.Now(), 15, 'seconds'),
        }),
      },
      {
        secret: q.Select(['secret'], q.Var('token')),
        expires: q.ToMillis(q.Select(['ttl'], q.Var('token'))),
        // ref: q.Select(['ref', 'id'], q.Var('user')),
        // email: q.Select(['data', 'email'], q.Var('user')),
        // created: q.Not(q.Var('alreadyExists')),
      },
    ),
  );
};

fastify.post('/api/token', async ({ body }) => {
  // console.log(body)
  const info = await getFaunaSecret(body);
  console.log(info);
  return info;
  // return await getFaunaSecret(body);
});

module.exports.handler = serverless(fastify);
