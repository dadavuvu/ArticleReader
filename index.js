var fetch = require('node-fetch');
var express = require('express')
var puppeteer = require('puppeteer-core');
var app = express();

app.use(express.static('web'))

function looksLikeCloudflareChallenge(status, headers, body) {
  const server = headers && headers.get ? headers.get('server') : (headers && headers['server']);
  const lower = (body || '').toLowerCase();
  if (status === 503) return true;
  if (server && typeof server === 'string' && server.toLowerCase().includes('cloudflare')) return true;
  if (lower.indexOf('attention required! | cloudflare') !== -1) return true;
  if (lower.indexOf('cf-chl-bypass') !== -1) return true;
  if (lower.indexOf('checking your browser before accessing') !== -1) return true;
  return false;
}

async function renderWithPuppeteer(url) {
  try {
    const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser' });
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

app.get('/proxy/dc/*', async (req, res) => {
  const url = req.url.replaceAll("/proxy/dc", "")
  const data = await fetch("https://gall.dcinside.com" + url)
  const textData = await data.text()
  res.send(textData)
})

app.get('/proxy/arcalive/*', async (req, res) => {
  try {
    const url = req.url.replaceAll("/proxy/arcalive", "")
    const fullUrl = "https://arca.live/b" + url
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/  58.0.3029.110 Safari/537.3'
      },
      redirect: 'follow'
    })

    const textData = await response.text()

    if (looksLikeCloudflareChallenge(response.status, response.headers, textData)) {
      // If user enabled Puppeteer, try rendering to pass challenge
      try {
        const result = await renderWithPuppeteer(fullUrl);
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

app.get('/proxy/arcalivecdn/*', async (req, res) => {
  try {
    let url = req.url.replaceAll("/proxy/arcalivecdn/", "");
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/  58.0.3029.110 Safari/537.3'
      },
      redirect: 'follow'
    })

    const buffer = await response.buffer();
    // 원본 Content-Type 전달
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    return res.send(buffer);
  } catch (err) {
    console.error(err)
    res.status(500).send('ERROR')
  }
})

app.listen(5050, () => {
  console.log(`http://127.0.0.1:5050`)
})