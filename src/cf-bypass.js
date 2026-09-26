import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const ARTICLE_READER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';

export async function fetchHtml(targetUrl) {
  const isNative = Capacitor.isNativePlatform();
  const response = await CapacitorHttp.get({
    url: `${!isNative ? '/proxy/' : ''}${targetUrl}`,
    headers: {
      'User-Agent': ARTICLE_READER_USER_AGENT,
    },
  });
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}
