import puppeteer from 'puppeteer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

import { ENV } from '../config/env.js';
import { verifyToken } from './verify-token.js';


const scrapeToken = async () => {
  const BROWSER_PATH = '/usr/bin/google-chrome';
  let token = null;

  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: fs.existsSync(BROWSER_PATH) ? BROWSER_PATH : undefined, 
    args: [
        "--no-sandbox",
        "--disable-gpu",
    ] 
  });
  
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', (request) => {
    if (request.url().includes('token=')) {
      const url = new URL(request.url());

      token = encodeURIComponent(url.searchParams.get('token'));
      
      browser.close();
    }
    request.continue();
  });

  await page.goto(ENV.scraper.url);
  
  await new Promise(resolve => setTimeout(resolve, ENV.scraper.timeout));

  await browser.close();

  return token;
};

export const getToken = async (token) => {
  if (ENV.app.mock) {
    return encodeURIComponent(randomUUID());
  }
  try {
    if (ENV.token.mustReuse) {
      const tokenIsValid = await verifyToken(token);
  
      return tokenIsValid ? token : await scrapeToken();
    } else {
      return await scrapeToken();
    }
  } catch (err) {
    console.error(`\ngetToken ${err}\n`)
    return null
  }
};


