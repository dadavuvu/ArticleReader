// localStorage 기반 스토리지. 기존 쿠키 데이터는 모듈 초기화 시 자동 이전합니다.

const MIGRATION_KEYS = [
  'ArticleReaderRecentBooks',
  'ArticleReaderBookmarks',
  'ArticleReaderVisitedLinks',
  'ArticleReaderBookPageRestore',
  'ArticleReaderTheme',
  'theme',
];

function _getRaw(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function _delRaw(name) {
  document.cookie = `${name}=;path=/;max-age=0`;
}

function _getLocal(name) {
  try {
    return window.localStorage.getItem(name);
  } catch (e) {
    return null;
  }
}

function _setLocal(name, value) {
  try {
    window.localStorage.setItem(name, value);
    return true;
  } catch (e) {
    return false;
  }
}

function _delLocal(name) {
  try {
    window.localStorage.removeItem(name);
  } catch (e) {}
}

export function getItem(key) {
  return _getLocal(key);
}

export function setItem(key, value) {
  _setLocal(key, String(value));
}

export function removeItem(key) {
  _delLocal(key);
}

function _readCookieValue(key) {
  const countStr = _getRaw(`${key}__n`);
  if (countStr !== null) {
    const count = parseInt(countStr, 10);
    if (!Number.isFinite(count) || count < 0) return null;
    let result = '';
    for (let i = 0; i < count; i++) result += _getRaw(`${key}__${i}`) || '';
    return result || null;
  }
  return _getRaw(key);
}

function _removeCookieValue(key) {
  const countStr = _getRaw(`${key}__n`);
  if (countStr !== null) {
    const count = parseInt(countStr, 10);
    if (Number.isFinite(count) && count >= 0) {
      for (let i = 0; i < count; i++) _delRaw(`${key}__${i}`);
    }
    _delRaw(`${key}__n`);
  }
  _delRaw(key);
}

function migrateCookies() {
  for (const key of MIGRATION_KEYS) {
    let migrated = _getLocal(key) !== null;
    if (!migrated) {
      const value = _readCookieValue(key);
      if (value !== null) migrated = _setLocal(key, value);
    }
    if (migrated) _removeCookieValue(key);
  }
}

migrateCookies();

const storage = new Proxy(
  { getItem, setItem, removeItem },
  {
    get(target, prop) {
      if (prop in target) return Reflect.get(target, prop);
      return getItem(prop);
    },
    set(target, prop, value) {
      setItem(prop, String(value));
      return true;
    },
  }
);

export default storage;
