import { Capacitor, CapacitorHttp } from '@capacitor/core';

export async function fetchHtml(targetUrl) {
  const isNative = Capacitor.isNativePlatform();
  const response = await CapacitorHttp.get({
    url: `${!isNative ? '/proxy/' : ''}${targetUrl}`
  });
  console.log(`fetchHtml: ${targetUrl} => ${response.status}`);
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}
