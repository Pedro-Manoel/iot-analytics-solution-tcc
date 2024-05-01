import csv from 'csvtojson';
import { fileURLToPath } from 'url';
import path from 'path';

import { ENV } from '../config/env.js';
import log from '../libs/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loadCsvData = async () => {
  log.Info('Loading CSV data...');

  try {
    const csvFilePath = path.join(__dirname, '..', '..','data', ENV.data.historical_csv_file_name);
    
    let data = await csv().fromFile(csvFilePath);
    data = data
      .map((item) => {
        return {
          municipality: item.municipio,
          pm2_5: Number(parseFloat(item.pm2_5).toFixed(2)),
          date: new Date(`${item.date} UTC`).toISOString(),
        };
      });

    log.Info(`CSV data loaded successfully, ${data.length} lines`);
    return data;
  } catch (error) {
    log.Error('Internal server error', 'loadCsvData', 'loadCsvData', error);
    console.error('\nError loading CSV data:', error);
  }
};