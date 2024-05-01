export const ENV = {
  app : {
    port: process.env.APP_PORT,
    mock: process.env.APP_MOCK === 'true' ? true : false
  },
  scraper: {
    url: process.env.SCRAPER_URL,
    timeout: Number(process.env.SCRAPER_TIMEOUT),
  },
  token: {
    verifyUrl: process.env.TOKEN_VERIFY_URL,
    mustReuse: process.env.TOKEN_MUST_REUSE === 'true' ? true : false,
  }
};