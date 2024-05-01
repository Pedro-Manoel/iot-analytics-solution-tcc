import Fastify from 'fastify';

import { ENV } from './config/env.js';

import { randomNumberInRange } from './scripts/random-number-in-range.js';
import { dateInTimestamp } from './scripts/date-in-timestamp.js';

const app = Fastify()

const sensors = [
  13609, 25499, 25501, 25503, 25521, 25531, 25541, 25549, 25551, 25891,
  27841, 31089, 31091, 31095, 31097, 31099, 31101, 31103, 31105, 31107,
  31109, 31111, 31115, 31117, 56663, 56879, 57171, 57177, 57309, 151650
]

app.get('/', (_, reply) => {
  try {
    const data = sensors.map(sensor_index => {
      const last_seen = dateInTimestamp(randomNumberInRange(0, 50))
      const rssi = Math.floor(randomNumberInRange(-100, 0))
      const channel_flags = Math.floor(randomNumberInRange(-1, 2))
      const confidence = Math.floor(randomNumberInRange(0, 100))
      const humidity = Math.floor(randomNumberInRange(50, 100))
      const temperature = +(randomNumberInRange(59, 95)).toFixed(2)
      const pressure = +(randomNumberInRange(950, 1050)).toFixed(2)
      const pm2_5 = +(randomNumberInRange(0, 35)).toFixed(2)
      
      return [
        sensor_index,
        last_seen,
        rssi,
        channel_flags,
        confidence,
        humidity,
        temperature,
        pressure,
        pm2_5
      ]
    })
    
    const response = {
        "api_version": "V0.0.00-0.0.00",
        "time_stamp": dateInTimestamp(),
        "data_time_stamp": dateInTimestamp(),
        "max_age": 604800,
        "firmware_default_version": "0.00",
        "fields": [
          "sensor_index",
          "last_seen",
          "rssi",
          "channel_flags",
          "confidence",
          "humidity",
          "temperature",
          "pressure",
          "pm2.5"
        ],
        "channel_flags": [
          "Normal",
          "A-Downgraded",
          "B-Downgraded",
          "A+B-Downgraded"
        ],
        "data": data
    };

    return response;
  } catch (error) {
    console.error('Error:', error);
    reply.code(500).json({ error: '\nError processing the request.' });
  }
});

const bootstrap = async () => {
  try {
    app.listen({ 
      port: ENV.app.port, 
      host: '0.0.0.0' 
    }, () => {
      console.log(`\n🚀 Server is running on port ${ENV.app.port}\n`);
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()
