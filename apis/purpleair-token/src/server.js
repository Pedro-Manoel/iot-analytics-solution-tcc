import Fastify from 'fastify';


import { ENV } from './config/env.js';
import { getToken } from './scripts/get-token.js';
import log from './libs/logger.js';

const app = Fastify()

let token = null;

app.get('/', async (_, reply) => {
  try {
    token = await getToken(token);

    log.Info(`Token: ${token}`);

    reply.code(200).send({ token });
  } catch (error) {
    log.Error('Internal server error', 'GET /token', 'app.get', error);
    console.error('Error:', error);
    reply.status(500).json({ error: 'Internal server error' });
  }
});

const bootstrap = async () => {
  try {
    app.listen({ 
      port: ENV.app.port, 
      host: '0.0.0.0' 
    }, () => {
      log.Info(`🚀 Server is running on port ${ENV.app.port}`);
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()

