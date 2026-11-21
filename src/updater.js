import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import storage from '/src/storage.js';

const OWNER = 'dadavuvu';
const REPOSITORY = 'ArticleReader';
const CHANNEL_KEY = 'ArticleReaderUpdateChannel';

function parts(version) {
  const match = String(version).match(/\d+(?:\.\d+)*/);
  return match ? match[0].split('.').map(Number) : null;
}

export function isNewerVersion(latest, current) {
  const latestParts = parts(latest);
  const currentParts = parts(current);
  if (!latestParts || !currentParts) return latest !== current && latest !== 'TESTBUILD';

  const length = Math.max(latestParts.length, currentParts.length);
  for (let i = 0; i < length; i++) {
    const difference = (latestParts[i] || 0) - (currentParts[i] || 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

export function getUpdateChannel() {
  return storage.getItem(CHANNEL_KEY) === 'test' ? 'test' : 'stable';
}

export function setUpdateChannel(channel) {
  storage.setItem(CHANNEL_KEY, channel === 'test' ? 'test' : 'stable');
}

export async function checkForUpdate(channel = getUpdateChannel()) {
  const url = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/releases?per_page=100`;
  let releases;

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({
      url,
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' },
      responseType: 'json',
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`GITHUB_${response.status}`);
    }
    releases = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
  } else {
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error(`GITHUB_${response.status}`);
    releases = await response.json();
  }
  const release = releases.find(item =>
    !item.draft && (channel === 'test' || !item.prerelease),
  );
  if (!release) throw new Error('NO_RELEASE');

  const info = await App.getInfo();
  return {
    currentVersion: info.version,
    latestVersion: release.tag_name,
    available: isNewerVersion(release.tag_name, info.version),
    prerelease: Boolean(release.prerelease),
    name: release.name || release.tag_name,
    notes: release.body || '',
    pageUrl: release.html_url,
    apkUrl: release.assets.find(asset =>
      asset.name.endsWith('.apk') && !asset.name.includes('unsigned'),
    )?.browser_download_url || '',
  };
}
