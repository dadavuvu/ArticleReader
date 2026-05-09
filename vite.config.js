import { defineConfig } from 'vite';
import express from 'express';
import puppeteer from 'puppeteer-core';
import cors from 'cors';
import { query } from 'lit/decorators.js';
import { existsSync } from 'fs';

function findChromePath() {
  const candidates = process.platform === 'win32' ? [
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.ProgramFiles + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.ProgramFiles + '\\Microsoft\\Edge\\Application\\msedge.exe',
  ] : process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ] : [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
  return candidates.find(p => p && existsSync(p)) || null;
}

function proxyPlugin() {
  return {
    name: 'proxy',
    configureServer(server) {
      const app = express();

      function looksLikeCloudflareChallenge(status, headers, body) {
        const server = headers && headers.get ? headers.get('server') : (headers && headers['server']);
        const lower = (body || '').toLowerCase();
        if (status === 403 && typeof server === 'string' && server.toLowerCase().includes('cloudflare')) return true;
        if (status === 503) return true;
        if (lower.indexOf('attention required! | cloudflare') !== -1) return true;
        if (lower.indexOf('cf-chl-bypass') !== -1) return true;
        if (lower.indexOf('checking your browser before accessing') !== -1) return true;
        if (lower.indexOf('just a moment') !== -1) return true;
        if (lower.indexOf('enable javascript and cookies to continue') !== -1) return true;
        return false;
      }

      async function renderWithPuppeteer(url) {
        try {
          const executablePath = findChromePath();
          if (!executablePath) throw new Error('Chrome/Edge/Chromium 실행 파일을 찾을 수 없습니다. Chrome을 설치하세요.');
          const browser = await puppeteer.launch({
            headless: true, executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/  58.0.3029.110 Safari/537.3');
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
          const content = await page.content();
          const cookies = await page.cookies();
          await browser.close();
          return { content, cookies };
        } catch (err) {
          throw err;
        }
      }

      app.get('/proxy/*', async (req, res) => {
        try {
          const response = await fetch(req.url.replace('/proxy/', ''), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/  58.0.3029.110 Safari/537.3'
            },
            redirect: 'follow'
          })

          const textData = await response.text();

          if (looksLikeCloudflareChallenge(response.status, response.headers, textData)) {
            try {
              const result = await renderWithPuppeteer(req.url.replace('/proxy/', ''));
              return res.send(result.content);
            } catch (puppErr) {
              console.warn('Puppeteer fallback failed or unavailable:', puppErr && puppErr.message);
              return res.status(425).json({ error: 'cloudflare_challenge', message: 'Cloudflare challenge detected. Enable Puppeteer (ARCA_USE_PUPPETEER=1) to attempt automatic rendering or provide session cookies.', snippet: textData.slice(0, 200) });
            }
          }

          res.send(textData)
        } catch (err) {
          console.error(err)
          res.status(500).send('ERROR')
        }
      })

      server.middlewares.use(app)
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    command === 'serve' && proxyPlugin()
  ]
}));