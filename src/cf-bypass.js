import { Capacitor, CapacitorHttp } from '@capacitor/core';

export async function fetchHtml(targetUrl) {
  const response = await CapacitorHttp.request({
    url: proxyUrl(targetUrl),
    method: 'GET',
    headers: { Accept: 'text/html' },
    responseType: 'text',
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP_${response.status}`);
  }
  if (typeof response.data !== 'string') {
    throw new Error('INVALID_HTML_RESPONSE');
  }
  return response.data;
}

export function proxyUrl(url) {
  if (!url) return '';

  const absoluteUrl = new URL(url, window.location.origin).href;
  return Capacitor.isNativePlatform()
    ? absoluteUrl
    : `/proxy/${absoluteUrl}`;
}
