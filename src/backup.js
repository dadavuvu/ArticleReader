const BACKUP_APP = 'ArticleReader';
const BACKUP_VERSION = 1;

function isAppKey(key) {
  return key === 'theme'
    || key.startsWith('ArticleReader');
}

export function createBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isAppKey(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function downloadBackup() {
  const backup = createBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ArticleReader-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function restoreBackup(text) {
  const backup = JSON.parse(text);
  if (
    backup.app !== BACKUP_APP
    || backup.version !== BACKUP_VERSION
    || !backup.data
    || typeof backup.data !== 'object'
    || Array.isArray(backup.data)
  ) {
    throw new Error('INVALID_BACKUP');
  }

  for (const key of Object.keys(backup.data)) {
    if (!isAppKey(key) || typeof backup.data[key] !== 'string') {
      throw new Error('INVALID_BACKUP_DATA');
    }
  }

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isAppKey(key)) keysToRemove.push(key);
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  for (const [key, value] of Object.entries(backup.data)) {
    localStorage.setItem(key, value);
  }
}
