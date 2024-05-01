import Fastify from 'fastify';

import { ENV } from './config/env.js';
import log from './libs/logger.js';

import { getNextBlockData } from './scripts/get-next-block-data.js';
import { loadCsvData } from './scripts/load-csv-data.js';

const app = Fastify()

let jsonData = null;
let lastLine = 0; 

app.get('/', async (_, reply) => {
  try {    
    const data = await getNextBlockData(jsonData, lastLine);

    lastLine += data.length;
    
    return data;
  } catch (error) {
    log.Error('Internal server error', 'GET /pm2_5', 'app.get', error);
    console.error('\nError getting data pm2_5:', error);
    reply.status(500).json({ error: 'Internal server error' });
  }
});

const bootstrap = async () => {
  try {
    jsonData = await loadCsvData();
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
