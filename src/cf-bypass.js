/**
 * CloudFlare 우회 유틸리티
 *
 * 웹(dev): Vite 프록시 플러그인(/proxy/)에서 Puppeteer로 처리
 * Android: CapacitorHttp로 요청 후 CF 챌린지 감지 시,
 *   @capgo/inappbrowser의 숨겨진 네이티브 WebView(CookieManager 공유)로
 *   CF 챌린지를 자동 해결하고 cf_clearance 쿠키를 획득한 뒤 재시도
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

export function looksLikeCloudflareChallenge(status, headers, body) {
  const server = (headers?.['server'] || headers?.['Server'] || '').toLowerCase();
  const lower = (body || '').toLowerCase();
  if ((status === 403 || status === 503) && server.includes('cloudflare')) return true;
  if (lower.includes('attention required! | cloudflare')) return true;
  if (lower.includes('checking your browser before accessing')) return true;
  if (lower.includes('just a moment')) return true;
  if (lower.includes('enable javascript and cookies to continue')) return true;
  if (lower.includes('cf-browser-verification')) return true;
  if (lower.includes('cf-chl-bypass')) return true;
  return false;
}

/**
 * @capgo/inappbrowser의 숨겨진 WebView를 이용해 CF 챌린지를 해결한다.
 * openWebView는 앱의 WebView와 동일한 android.webkit.CookieManager를 공유하므로
 * 해결된 cf_clearance 쿠키가 이후 CapacitorHttp 요청에도 자동 적용된다.
 */
async function bypassCFWithWebView(url) {
  const { InAppBrowser } = await import('@capgo/inappbrowser');

  // FAKE_VISIBLE: CF JS 챌린지가 window.innerWidth/Height를 확인할 경우
  // 전체 화면 크기를 보고하도록 해 자동 해결 성공률을 높인다
  const { id } = await InAppBrowser.openWebView({
    url,
    hidden: true,
    invisibilityMode: 'FAKE_VISIBLE',
    toolbarType: 'blank',
    preventDeeplink: true,
  });

  await new Promise((resolve) => {
    let loadCount = 0;
    let timer = null;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      handlePromise.then((h) => h.remove()).catch(() => {});
      resolve();
    };

    // browserPageLoaded 이벤트 흐름:
    //   loadCount=1 → CF 챌린지 페이지 로드 완료
    //                 CF JS가 자동 실행되어 cf_clearance 쿠키 설정 후 리다이렉트
    //   loadCount=2 → 실제 페이지 로드 완료 (CF 해결됨)
    const handlePromise = InAppBrowser.addListener('browserPageLoaded', (event) => {
      if (done || (event.id && event.id !== id)) return;
      loadCount++;
      if (timer) clearTimeout(timer);
      // 1차 로드: 챌린지 자동 해결 + 리다이렉트 대기(최대 8초)
      // 2차 이후: 실제 페이지 → 쿠키 확보 완료, 빠르게 종료
      timer = setTimeout(finish, loadCount === 1 ? 8000 : 1500);
    });

    // 전체 타임아웃: 25초 후 포기하고 가진 쿠키로 재시도
    setTimeout(finish, 25000);
  });

  try {
    await InAppBrowser.close({ id });
  } catch {
    // ignore
  }
}

/**
 * 지정한 URL에서 HTML을 가져온다.
 * - 웹(dev): /proxy/ 경유 (Vite 프록시 → Puppeteer 폴백)
 * - Android: CapacitorHttp 직접 요청, CF 감지 시 숨겨진 WebView로 자동 우회 후 재시도
 *
 * @param {string} targetUrl  절대 URL (e.g. "https://arca.live/b/channel/123")
 * @returns {Promise<string>} HTML 문자열
 */
export async function fetchHtml(targetUrl) {
  const isNative = Capacitor.isNativePlatform();
  const fetchUrl = isNative ? targetUrl : `/proxy/${targetUrl}`;
  const headers = {
    'User-Agent': isNative ? MOBILE_UA : DESKTOP_UA,
    ...DEFAULT_HEADERS,
  };

  const response = await CapacitorHttp.get({ url: fetchUrl, headers });

  if (isNative && looksLikeCloudflareChallenge(response.status, response.headers, response.data)) {
    await bypassCFWithWebView(targetUrl);
    const retried = await CapacitorHttp.get({ url: fetchUrl, headers });
    return typeof retried.data === 'string' ? retried.data : JSON.stringify(retried.data);
  }

  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}
