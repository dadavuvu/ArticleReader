import { LitElement, html, css } from 'lit';
import storage from '/src/storage.js';
import { checkForUpdate, getUpdateChannel, setUpdateChannel } from '/src/updater.js';
import { downloadBackup, restoreBackup } from '/src/backup.js';

export class NavBar extends LitElement {
  static properties = {
    navbarOpen: { type: Boolean },
    updateOpen: { type: Boolean },
    updateLoading: { type: Boolean },
    updateChannel: { type: String },
    updateResult: { type: Object },
    updateError: { type: String },
    backupOpen: { type: Boolean },
    backupMessage: { type: String },
  };

  constructor() {
    super();
    this.updateOpen = false;
    this.updateLoading = false;
    this.updateChannel = getUpdateChannel();
    this.updateResult = null;
    this.updateError = '';
    this.backupOpen = false;
    this.backupMessage = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.setTheme();
  }

  setTheme() {
    document.body.className = '';
    document.body.classList.add(storage.getItem('theme') || 'white');
  }

  handleSetting() {
    const currentTheme = storage.getItem('theme');
    const newTheme = currentTheme === 'white' ? 'black' : 'white';
    storage.setItem('theme', newTheme);
    this.setTheme();
  }

  handleGoRoot() {
    window.history.pushState({}, '', "/");
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handlePrevWeb() {
    window.history.back();
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handleNextWeb() {
    window.history.forward();
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handleRefresh() {
    window.location.reload();
  }

  async checkUpdate() {
    this.updateOpen = true;
    this.updateLoading = true;
    this.updateError = '';
    this.updateResult = null;
    this.requestUpdate();
    try {
      this.updateResult = await checkForUpdate(this.updateChannel);
    } catch (error) {
      this.updateError = error.message;
    } finally {
      this.updateLoading = false;
      this.requestUpdate();
    }
  }

  changeChannel(channel) {
    this.updateChannel = channel;
    setUpdateChannel(channel);
    this.checkUpdate();
  }

  openRelease() {
    const url = this.updateResult?.apkUrl || this.updateResult?.pageUrl;
    if (url) window.open(url, '_system');
  }

  closeUpdate() {
    this.updateOpen = false;
    this.requestUpdate();
  }

  openBackup() {
    this.backupOpen = true;
    this.backupMessage = '';
    this.requestUpdate();
  }

  closeBackup() {
    this.backupOpen = false;
    this.backupMessage = '';
    this.requestUpdate();
  }

  async restoreFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!confirm('현재 저장된 정보와 설정을 백업 파일로 교체하시겠습니까?')) return;
    try {
      restoreBackup(await file.text());
      this.backupMessage = '복원이 완료되었습니다.';
      this.setTheme();
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ArticleReaderRecentBooks',
      }));
    } catch (error) {
      this.backupMessage = error.message === 'INVALID_BACKUP'
        || error.message === 'INVALID_BACKUP_DATA'
        ? '올바른 ArticleReader 백업 파일이 아닙니다.'
        : `복원에 실패했습니다. (${error.message})`;
    }
    this.requestUpdate();
  }

  createRenderRoot() {
    return this;
  }
  
  render() {
    return html`
      <div id="navbar">
        <button id="refresh" @click=${() => this.handleRefresh()}>
          <span class="material-symbols-rounded">refresh</span>
        </button>
        <button id="go-root" @click=${() => this.handleGoRoot()}>
          <span class="material-symbols-rounded">home</span>
        </button>
        <button id="prev-web" @click=${() => this.handlePrevWeb()}>
          <span class="material-symbols-rounded">arrow_back_ios_new</span>
        </button>
        <button id="next-web" @click=${() => this.handleNextWeb()}>
          <span class="material-symbols-rounded">arrow_forward_ios</span>
        </button>
        <button id="setting" @click=${() => this.handleSetting()}>
          <span class="material-symbols-rounded">format_paint</span>
        </button>
        <button id="update" @click=${() => this.checkUpdate()} title="업데이트 확인">
          <span class="material-symbols-rounded">system_update</span>
        </button>
        <button id="backup" @click=${() => this.openBackup()} title="백업 및 복원">
          <span class="material-symbols-rounded">save</span>
        </button>
        ${this.updateOpen ? html`
          <div class="update-backdrop" @click=${() => this.closeUpdate()}>
            <div class="update-dialog" @click=${event => event.stopPropagation()}>
              <h2>업데이트</h2>
              <div class="update-channel">
                <button class=${this.updateChannel === 'stable' ? 'active' : ''} @click=${() => this.changeChannel('stable')}>일반 릴리스</button>
                <button class=${this.updateChannel === 'test' ? 'active' : ''} @click=${() => this.changeChannel('test')}>테스트 채널</button>
              </div>
              ${this.updateLoading ? html`<p>확인 중...</p>` : ''}
              ${this.updateError ? html`<p>업데이트를 확인하지 못했습니다. (${this.updateError})</p>` : ''}
              ${this.updateResult ? html`
                <p>현재 버전: ${this.updateResult.currentVersion}</p>
                <p>최신 버전: ${this.updateResult.latestVersion}${this.updateResult.prerelease ? ' (테스트)' : ''}</p>
                ${this.updateResult.available
                  ? html`<button class="update-download" @click=${() => this.openRelease()}>새 버전 받기</button>`
                  : html`<p>최신 버전을 사용 중입니다.</p>`}
              ` : ''}
              <button class="update-close" @click=${() => this.closeUpdate()}>닫기</button>
            </div>
          </div>
        ` : ''}
        ${this.backupOpen ? html`
          <div class="update-backdrop" @click=${() => this.closeBackup()}>
            <div class="update-dialog" @click=${event => event.stopPropagation()}>
              <h2>유저정보 백업/복원</h2>
              <button class="update-download" @click=${() => downloadBackup()}>
                백업 파일 다운로드
              </button>
              <label class="restore-button">
                백업 파일에서 복원
                <input type="file" accept=".json,application/json" @change=${event => this.restoreFile(event)}>
              </label>
              ${this.backupMessage ? html`<p>${this.backupMessage}</p>` : ''}
              <button class="update-close" @click=${() => this.closeBackup()}>닫기</button>
            </div>
          </div>
        ` : ''}
      </div>`;
  }
}
customElements.define('nav-bar', NavBar);