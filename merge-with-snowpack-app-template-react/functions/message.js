const serverless = require('serverless-http');
const fastify = require('fastify')();
fastify.post('/api/message', async () => ({ message: 'Hello Crancos' }));
module.exports.handler = serverless(fastify);
