import puppeteer from 'puppeteer';
import { randomUUID } from 'node:crypto';
import fs from 'fs';

import { ENV } from '../config/env.js';
import { verifyToken } from './verify-token.js';
import log from '../libs/logger.js';


export const scrapeToken = async () => {
  const BROWSER_PATH = '/usr/bin/google-chrome';
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: fs.existsSync(BROWSER_PATH) ? BROWSER_PATH : undefined,
    args: ["--no-sandbox", "--disable-gpu"]
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  let token = null;

  const tokenPromise = new Promise(resolve => {
    page.on('request', request => {
      try {
        const headers = request.headers();
        if (headers['x-api-token']) {
          token = headers['x-api-token'];
          log.Info(`Token found in header x-api-token: ${token}`);
          resolve(token);
        }
      } catch (err) {
        log.Error(`Error in request handler: ${err}`);
      } finally {
        request.continue().catch(err => {
          log.Warn(`Failed to continue intercepted request: ${err}`);
        });
      }
    });
  });

  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => {
      resolve(null);
    }, ENV.scraper.timeout);
  });

  try {
    await page.goto(ENV.scraper.url, {
      waitUntil: 'networkidle2',
      timeout: ENV.scraper.timeout
    });
  } catch (err) {
    log.Error(`Error navigating to URL ${ENV.scraper.url}: ${err}`);
  }

  const result = await Promise.race([ tokenPromise, timeoutPromise ]);

  await browser.close();

  if (result) {
    log.Info(`Token successfully captured: ${result}`);
  } else {
    log.Warn(`Timeout reached (${ENV.scraper.timeout}ms) without capturing the token.`);
  }

  return result;
};

export const getToken = async (existingToken) => {
  if (ENV.app.mock) {
    const mockToken = encodeURIComponent(randomUUID());
    log.Info(`Using mock token: ${mockToken}`);
    return mockToken;
  }
  try {
    if (ENV.token.mustReuse) {
      const tokenIsValid = await verifyToken(existingToken);
      if (tokenIsValid) {
        log.Info(`Existing token is valid, reusing it.`);
        return existingToken;
      } else {
        log.Info(`Existing token is invalid, extracting a new token.`);
        return await scrapeToken();
      }
    } else {
      log.Info(`Token reuse not allowed (mustReuse=false), extracting a new token.`);
      return await scrapeToken();
    }
  } catch (err) {
    log.Error(`getToken error: ${err}`);
    return null;
  }
};
