import { LitElement, html, css } from 'lit';
import { Router } from '@lit-labs/router';
import storage from '/src/storage.js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    CapacitorApp.exitApp();
  }
});

// 앱 시작 시 시스템 바 및 테마 설정 로직
(async () => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.hide();
    await NavigationBar.hide();
  }

  const THEME_KEY = 'ArticleReaderTheme'; // 'light' | 'dark' | 'system'

  function getSavedTheme() {
    try {
      const v = storage.getItem(THEME_KEY);
      return v || 'system';
    } catch (e) {
      return 'system';
    }
  }

  function getSystemTheme() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) { }
    return 'light';
  }

  function mergeTheme(saved, system) {
    if (saved === 'light' || saved === 'dark') return saved;
    return system;
  }

  async function applyTheme(theme) {
    // Document level 적용 (CSS에서 [data-theme]로 스타일 분기 사용 가능)
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) { }
  }

  // 초기 적용
  const saved = getSavedTheme();
  const system = getSystemTheme();
  const merged = mergeTheme(saved, system);
  await applyTheme(merged);

  // 시스템 테마 변경 감지
  try {
    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = async (e) => {
        const sys = e.matches ? 'dark' : 'light';
        const mergedNow = mergeTheme(getSavedTheme(), sys);
        await applyTheme(mergedNow);
      };
      if (mql.addEventListener) mql.addEventListener('change', handler);
      else if (mql.addListener) mql.addListener(handler);
    }
  } catch (e) { }

})();

import placeholderpng from './assets/placeholder.png';

export class Launcher extends LitElement {
  static properties = {
    books: { type: Array },
    currentPage: { type: Number },
    bookmarks: { type: Set },
    selectMode: { type: Boolean },
    selectedKeys: { type: Object },
    gotoType: { type: String },
  };

  constructor() {
    super();
    this.books = [];
    this.currentPage = 0;
    this.pageSize = 9;
    this.bookmarks = new Set();
    this.selectMode = false;
    this.selectedKeys = new Set();
    this.gotoType = 'dc';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadBookmarks();
    this.loadBooks();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

  }

  getRecentBooks() {
    try {
      return JSON.parse(storage.ArticleReaderRecentBooks || "[]");
    } catch (e) {
      return [];
    }
  }

  getBookmarkKey(item) {
    if (item.type === 'text') return `text_${item.textId}`;
    if (item.isListItem) return `${item.boardId || item.channelId}_list`;
    return `${item.boardId || item.channelId}_${item.articleNo}`;
  }

  loadBookmarks() {
    try {
      const bookmarksList = JSON.parse(storage.ArticleReaderBookmarks || "[]");
      this.bookmarks = new Set(bookmarksList);
    } catch (e) {
      this.bookmarks = new Set();
    }
  }

  saveBookmarks() {
    storage.ArticleReaderBookmarks = JSON.stringify(Array.from(this.bookmarks));
  }

  toggleBookmark(item) {
    const key = this.getBookmarkKey(item);
    if (this.bookmarks.has(key)) {
      this.bookmarks.delete(key);
      if (item.type === 'text') {
        this.saveBookmarks();
        this.deleteCard(item);
        return;
      }
    } else {
      this.bookmarks.add(key);
    }
    this.saveBookmarks();
    this.loadBooks();
  }

  loadBooks() {
    let books = this.getRecentBooks();

    // 즐겨찾기된 항목과 일반 항목 분리
    const bookmarked = [];
    const normal = [];

    books.forEach(book => {
      if (this.bookmarks.has(this.getBookmarkKey(book))) {
        bookmarked.push(book);
      } else {
        normal.push(book);
      }
    });

    // 즐겨찾기 -> 일반 책 순서로 병합 (일반 책은 원래 순서 유지)
    this.books = [...bookmarked, ...normal];
    this.currentPage = Math.max(
      0,
      Math.min(this.currentPage, this.getLastPageIndex(this.books))
    );
    this.requestUpdate();
  }

  getLastPageIndex(books = this.books) {
    return Math.max(0, Math.ceil(books.length / this.pageSize) - 1);
  }

  normalizeCurrentPage() {
    const lastPage = this.getLastPageIndex();
    this.currentPage = Math.max(0, Math.min(this.currentPage, lastPage));
    return this.currentPage;
  }

  handleStorageChange(ev) {
    if (ev.key === 'ArticleReaderRecentBooks') {
      this.loadBooks();
    }
  }

  deleteCard(item) {
    const books = this.getRecentBooks();
    const key = this.getBookmarkKey(item);
    const index = books.findIndex(b => this.getBookmarkKey(b) === key);
    if (index === -1) return;
    books.splice(index, 1);
    storage.ArticleReaderRecentBooks = JSON.stringify(books);
    this.loadBooks();
  }

  handleCardClick(item) {
    if (!item) return;
    if (item.type === 'text') {
      this.navigate(`${item.source}?textId=${encodeURIComponent(item.textId)}`);
      return;
    }
    if (item.isListItem) {
      const paramKey = item.channelId ? 'channelId' : 'boardId';
      const paramVal = item.channelId || item.boardId;
      this.navigate(`${item.source}?${paramKey}=${encodeURIComponent(paramVal)}`);
      return;
    }
    const url = `${item.source}?${item.channelId
      ? `channelId=${encodeURIComponent(item.channelId)}`
      : `boardId=${encodeURIComponent(item.boardId)}`
      }&articleNo=${encodeURIComponent(item.articleNo)}`;
    this.navigate(url);
  }

  navigate(url) {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handlePrevPage() {
    const currentPage = this.normalizeCurrentPage();
    if (currentPage > 0) {
      this.currentPage = currentPage - 1;
      this.requestUpdate();
    }
  }

  handleNextPage() {
    const currentPage = this.normalizeCurrentPage();
    if (currentPage < this.getLastPageIndex()) {
      this.currentPage = currentPage + 1;
      this.requestUpdate();
    }
  }

  // --- Select mode ---
  enterSelectMode() {
    this.selectMode = true;
    this.selectedKeys = new Set();
    this.requestUpdate();
  }

  exitSelectMode() {
    this.selectMode = false;
    this.selectedKeys = new Set();
    this.requestUpdate();
  }

  toggleSelect(key) {
    const s = new Set(this.selectedKeys);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    this.selectedKeys = s;
    this.requestUpdate();
  }

  deleteSelected() {
    const books = this.getRecentBooks().filter(b => !this.selectedKeys.has(this.getBookmarkKey(b)));
    storage.ArticleReaderRecentBooks = JSON.stringify(books);
    this.exitSelectMode();
    this.loadBooks();
  }

  clearAll() {
    if (!confirm('북마크를 제외한 모든 항목을 삭제하시겠습니까?')) return;
    const books = this.getRecentBooks().filter(b => this.bookmarks.has(this.getBookmarkKey(b)));
    storage.ArticleReaderRecentBooks = JSON.stringify(books);
    this.loadBooks();
  }

  async importTextFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      let content = new TextDecoder('utf-8').decode(buffer);
      if (content.includes('\ufffd')) content = new TextDecoder('euc-kr').decode(buffer);
      const textId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const books = this.getRecentBooks();
      books.unshift({
        type: 'text',
        textId,
        title: file.name.replace(/\.txt$/i, '') || file.name,
        author: 'TXT',
        content,
        source: '/text/article',
      });
      storage.ArticleReaderRecentBooks = JSON.stringify(books);
      this.bookmarks.add(`text_${textId}`);
      this.saveBookmarks();
      this.loadBooks();
    } catch (error) {
      console.error('TXT 파일을 가져오지 못했습니다.', error);
    }
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const currentPage = this.normalizeCurrentPage();
    const start = currentPage * this.pageSize;
    const displayBooks = this.books.slice(start, start + this.pageSize);
    const prevDisabled = currentPage === 0;
    const nextDisabled = currentPage >= this.getLastPageIndex();

    const SITE_LABELS = { dcinside: 'DC', arcalive: 'Arc' };

    const renderCard = (item, index) => {
      if (!item) {
        return html`
          <div class="book-card" role="listitem">
            <div class="cover">
              <img src=${placeholderpng}>
            </div>
            <div class="meta">
              <div class="title"></div>
              <div class="author"></div>
            </div>
          </div>
        `;
      }

      const key = this.getBookmarkKey(item);
      const isBookmarked = this.bookmarks.has(key);
      const isSelected = this.selectMode && this.selectedKeys.has(key);
      const siteLabel = item.type === 'text' ? 'TXT' : SITE_LABELS[item.type] || '';

      if (item.isListItem) {
        return html`
          <div class="book-card ${isSelected ? 'selected' : ''}" role="listitem"
            @click=${(e) => {
            e.stopPropagation();
            if (this.selectMode) this.toggleSelect(key);
            else this.handleCardClick(item);
          }}
          >
            <div class="cover list-cover">
              <span class="material-icons list-cover-icon">format_list_bulleted</span>
              ${this.selectMode ? html`
                <div class="select-overlay">
                  <span class="material-icons select-check">${isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
                </div>
              ` : html`
                <div class="card-buttons">
                  <button class="card-btn bookmark-btn" @click=${(e) => { e.preventDefault(); e.stopPropagation(); this.toggleBookmark(item); }}>
                    <span class="material-icons">${isBookmarked ? 'star' : 'star_border'}</span>
                  </button>
                  ${!isBookmarked ? html`
                    <button class="card-btn" @click=${(e) => { e.preventDefault(); e.stopPropagation(); this.deleteCard(item); }}>
                      <span class="material-icons delete-btn">delete</span>
                    </button>
                  ` : ''}
                </div>
              `}
            </div>
            <div class="meta">
              <div class="title">${item.title}</div>
              <div class="author">
                ${siteLabel ? html`<span class="site-badge site-${item.type}">${siteLabel}</span>` : ''}
                ${item.boardId || item.channelId}
              </div>
            </div>
          </div>
        `;
      }

      return html`
        <div class="book-card ${isSelected ? 'selected' : ''}" role="listitem"
          @click=${(e) => {
          e.stopPropagation();
          if (this.selectMode) {
            this.toggleSelect(key);
          } else {
            this.handleCardClick(item);
          }
        }}
          @contextmenu=${(e) => e.preventDefault()}
        >
          <div class="cover">
            <img src="${item.thumbnail || placeholderpng}">
            ${this.selectMode ? html`
              <div class="select-overlay">
                <span class="material-icons select-check">${isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
              </div>
            ` : html`
              <div class="card-buttons">
                <button class="card-btn bookmark-btn" @click=${(e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleBookmark(item);
          }}>
                  <span class="material-icons">${isBookmarked ? 'star' : 'star_border'}</span>
                </button>
                ${!isBookmarked ? html`
                  <button class="card-btn" @click=${(e) => {
              e.preventDefault();
              e.stopPropagation();
              this.deleteCard(item);
            }} title="삭제">
                    <span class="material-icons delete-btn">delete</span>
                  </button>
                ` : ''}
              </div>
            `}
          </div>
          <div class="meta">
            <div class="title">${item.title || ''}</div>
            <div class="author">
              ${siteLabel ? html`<span class="site-badge site-${item.type}">${siteLabel}</span>` : ''}
              ${item.author || ''}
            </div>
          </div>
        </div>
      `;
    };

    return html`  <h1>ArticleReader</h1>
  <div class="bottom-section">
    <form class="goto-section" @submit=${(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const type = formData.get('type');
        const id = formData.get('id');
        const no = formData.get('articleNo');
        const paramKey = type === 'dc' ? 'boardId' : 'channelId';
        const url = `/${type}?${paramKey}=${encodeURIComponent(id)}&articleNo=${encodeURIComponent(no)}`;
        this.navigate(url);
      }}>
      <div class="form-group">
        <h2>GoTo:</h2>
        <select name="type" @change=${(e) => { this.gotoType = e.target.value; }}>
          <option value="dc">DCInside</option>
          <option value="arcalive">Arcalive</option>
        </select>
      </div>
      <div class="form-group">
        <input type="text" name="id" placeholder=${this.gotoType === 'dc' ? 'BoardID' : 'ChannelID'} required size="1" autocomplete="off">
        <input type="text" name="articleNo" placeholder="ArticleNumber" size="1">
        <button type="submit" class="submit-btn">Go</button>
      </div>
    </form>
  </div>
  <div class="list-toolbar">
    <label class="toolbar-btn import-text-btn" title="TXT 파일 가져오기">
      <span class="material-icons">upload_file</span>
      <input type="file" accept=".txt,text/plain" @change=${(e) => this.importTextFile(e)}>
    </label>
    ${!this.selectMode ? html`
      <button class="toolbar-btn" @click=${() => this.enterSelectMode()} title="선택 모드">
        <span class="material-icons">checklist</span>
      </button>
      <button class="toolbar-btn" @click=${() => this.clearAll()} title="전체 삭제 (북마크 제외)">
        <span class="material-icons">delete_sweep</span>
      </button>
    ` : html`
      <button class="toolbar-btn" @click=${() => this.exitSelectMode()}>
        <span class="material-icons">close</span><span class="toolbar-label">취소</span>
      </button>
      <button class="toolbar-btn delete-selected-btn" @click=${() => this.deleteSelected()} ?disabled=${this.selectedKeys.size === 0}>
        <span class="material-icons">delete</span><span class="toolbar-label">${this.selectedKeys.size}개 삭제</span>
      </button>
    `}
  </div>
  <div class="list-frame" id="listFrame">
    <div class="book-grid" id="bookGrid" role="list">
      ${displayBooks.map((item, i) => renderCard(item, i))}
    </div>

    <div class="banner-controls">
      <button id="prevBtn" class="banner-btn banner-left"
        ?disabled=${prevDisabled}
        @click=${() => this.handlePrevPage()}
      >
        <span class="material-icons banner-icon">chevron_left</span>
      </button>
      <button id="nextBtn" class="banner-btn banner-right"
        ?disabled=${nextDisabled}
        @click=${() => this.handleNextPage()}
      >
        <span class="material-icons banner-icon">chevron_right</span>
      </button>
    </div>
  </div>`;
  }
}
customElements.define('article-launcher', Launcher);

export class NotFoundPage extends LitElement {
  static styles = css`
    section { padding: 4rem 2rem; text-align: center; }
    h1 { font-size: 2.5rem; }
  `;
  render() {
    return html`
      <section>
        <h1>404</h1>
        <p>페이지를 찾을 수 없습니다.</p>
      </section>
    `;
  }
}
customElements.define('not-found', NotFoundPage);

export class ArticleReader extends LitElement {
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this._router = new Router(this, [
      {
        path: '/',
        render: () => html`<article-launcher></article-launcher>`
      },
      {
        path: '/dc',
        enter: async () => {
          const query = new URLSearchParams(window.location.search);
          if (!query.has('articleNo') || query.get('articleNo') === "") {
            window.history.replaceState({}, '', '/dc/list' + window.location.search);
          }
          else {
            window.history.replaceState({}, '', '/dc/article' + window.location.search);
          }
          window.dispatchEvent(new PopStateEvent('popstate'));
          return false;
        }
      },
      {
        path: '/dc/list',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          const boardId = query.get('boardId');
          return html`<dc-list .boardId=${boardId}></dc-list>`;
        }
      },
      {
        path: '/dc/article',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          const boardId = query.get('boardId');
          const articleNo = query.get('articleNo');
          return html`<dc-article .boardId=${boardId} .articleNo=${articleNo}></dc-article>`;
        }
      },
      {
        path: '/arcalive',
        enter: async () => {
          const query = new URLSearchParams(window.location.search);
          if (!query.has('articleNo') || query.get('articleNo') === "") {
            window.history.replaceState({}, '', '/arcalive/list' + window.location.search);
          }
          else {
            window.history.replaceState({}, '', '/arcalive/article' + window.location.search);
          }
          window.dispatchEvent(new PopStateEvent('popstate'));
          return false;
        }
      },
      {
        path: '/arcalive/list',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          const channelId = query.get('channelId');
          return html`<arcalive-list .channelId=${channelId}></arcalive-list>`;
        }
      },
      {
        path: '/arcalive/article',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          const channelId = query.get('channelId');
          const articleNo = query.get('articleNo');
          return html`<arcalive-article .channelId=${channelId} .articleNo=${articleNo}></arcalive-article>`;
        }
      },
      {
        path: '/text/article',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          return html`<text-article .textId=${query.get('textId')}></text-article>`;
        }
      },
      {
        path: '/*',
        render: () => html`<not-found></not-found>`
      }
    ]);
  }

  render() {
    return html`${this._router.outlet()}`;
  }
}
customElements.define('article-reader', ArticleReader);