// 쿠키 기반 스토리지 유틸리티 (localStorage 대체)
// 값이 3000자를 넘으면 자동으로 청크 쿠키로 분할 저장합니다.

const CHUNK_SIZE = 3000;
const MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10년

function _getRaw(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function _setRaw(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${MAX_AGE}`;
}

function _delRaw(name) {
  document.cookie = `${name}=;path=/;max-age=0`;
}

export function getItem(key) {
  const countStr = _getRaw(`${key}__n`);
  if (countStr !== null) {
    const count = parseInt(countStr, 10);
    let result = '';
    for (let i = 0; i < count; i++) result += _getRaw(`${key}__${i}`) || '';
    return result || null;
  }
  return _getRaw(key);
}

export function setItem(key, value) {
  const str = String(value);
  // 기존 청크 삭제
  const oldCount = _getRaw(`${key}__n`);
  if (oldCount !== null) {
    for (let i = 0; i < parseInt(oldCount, 10); i++) _delRaw(`${key}__${i}`);
    _delRaw(`${key}__n`);
  }
  _delRaw(key);

  if (str.length <= CHUNK_SIZE) {
    _setRaw(key, str);
  } else {
    let i = 0;
    for (let pos = 0; pos < str.length; pos += CHUNK_SIZE, i++) {
      _setRaw(`${key}__${i}`, str.slice(pos, pos + CHUNK_SIZE));
    }
    _setRaw(`${key}__n`, String(i));
  }
}

export function removeItem(key) {
  const countStr = _getRaw(`${key}__n`);
  if (countStr !== null) {
    for (let i = 0; i < parseInt(countStr, 10); i++) _delRaw(`${key}__${i}`);
    _delRaw(`${key}__n`);
  }
  _delRaw(key);
}

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
