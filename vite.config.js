import { defineConfig } from 'vite';
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

let browser = null;

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({ headless: 'new' });
  }
  return browser;
}

function proxyPlugin() {
  return {
    name: 'proxy',
    configureServer(server) {
      const app = express();
      app.use(cors());

      app.get('/proxy/*', async (req, res) => {
        const targetUrl = req.url.replace('/proxy/', '');
        let page = null;
        try {
          const b = await getBrowser();
          page = await b.newPage();
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          );
          const response = await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // CloudFlare Challenge 대기
          const cloudflareChecks = [
            '#turnstile-wrapper',
            '#challenge-running',
            '#cf-please-wait',
            '.ray_id'
          ];
          for (const selector of cloudflareChecks) {
            if (await page.$(selector)) {
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
              break;
            }
          }

          const html = await page.content();
          res.status(response?.status() ?? 200).send(html);
        } catch (err) {
          console.error(err);
          res.status(500).send('ERROR');
        } finally {
          if (page) await page.close().catch(() => {});
        }
      });

      server.middlewares.use(app);
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    command === 'serve' && proxyPlugin()
  ]
}));