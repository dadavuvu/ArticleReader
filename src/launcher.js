import { LitElement, html, css } from 'lit';
import { Router } from '@lit-labs/router';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

// 앱 시작 시 시스템 바 및 테마 설정 로직
(async () => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.hide();
    await NavigationBar.hide();
  }

  const THEME_KEY = 'ArticleReaderTheme'; // 'light' | 'dark' | 'system'

  function getSavedTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
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

  // 로컬스토리지에서 테마가 변경되면 적용
  window.addEventListener('storage', (ev) => {
    if (ev.key === THEME_KEY) {
      const sys = getSystemTheme();
      const mergedNow = mergeTheme(getSavedTheme(), sys);
      applyTheme(mergedNow);
    }
  });
})();

import placeholderpng from './assets/placeholder.png';

export class Launcher extends LitElement {
  static properties = {
    books: { type: Array },
    currentPage: { type: Number },
    bookmarks: { type: Set }
  };

  constructor() {
    super();
    this.books = [];
    this.currentPage = 0;
    this.pageSize = 6;
    this.bookmarks = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadBookmarks();
    this.loadBooks();
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }

  getRecentBooks() {
    try {
      return JSON.parse(localStorage.ArticleReaderRecentBooks || "[]");
    } catch (e) {
      return [];
    }
  }

  getBookmarkKey(item) {
    return `${item.boardId || item.channelId}_${item.articleNo}`;
  }

  loadBookmarks() {
    try {
      const bookmarksList = JSON.parse(localStorage.ArticleReaderBookmarks || "[]");
      this.bookmarks = new Set(bookmarksList);
    } catch (e) {
      this.bookmarks = new Set();
    }
  }

  saveBookmarks() {
    localStorage.ArticleReaderBookmarks = JSON.stringify(Array.from(this.bookmarks));
  }

  toggleBookmark(item) {
    const key = this.getBookmarkKey(item);
    if (this.bookmarks.has(key)) {
      this.bookmarks.delete(key);
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
    this.requestUpdate();
  }

  handleStorageChange(ev) {
    if (ev.key === 'ArticleReaderRecentBooks') {
      this.loadBooks();
    }
  }

  deleteCard(item) {
    const books = this.getRecentBooks();
    const index = books.findIndex(b => (b.boardId === item.boardId && b.articleNo === item.articleNo) ||
      (b.channelId === item.channelId && b.articleNo === item.articleNo));
    if (index === -1) return;
    books.splice(index, 1);
    localStorage.ArticleReaderRecentBooks = JSON.stringify(books);
    this.loadBooks();
  }

  handleCardClick(item) {
    if (!item) return;
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
    if (this.currentPage > 0) {
      this.currentPage--;
      this.requestUpdate();
    }
  }

  handleNextPage() {
    if ((this.currentPage + 1) * this.pageSize < this.books.length) {
      this.currentPage++;
      this.requestUpdate();
    }
  }

  createRenderRoot() {
    return this;
  }

  render() {
    const start = this.currentPage * this.pageSize;
    const displayBooks = this.books.slice(start, start + this.pageSize);
    const prevDisabled = this.currentPage === 0;
    const nextDisabled = (this.currentPage + 1) * this.pageSize >= this.books.length;
    const prevOpacity = prevDisabled ? 0.2 : 0.4;
    const nextOpacity = nextDisabled ? 0.2 : 0.4;

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

      const isBookmarked = this.bookmarks.has(this.getBookmarkKey(item));

      return html`
        <div class="book-card" role="listitem"
          @click=${(e) => {
          e.stopPropagation();
          this.handleCardClick(item);
        }}
          @contextmenu=${(e) => e.preventDefault()}
        >
          <div class="cover">
            <img src="${item.thumbnail || placeholderpng}">
            <div class="card-buttons">
              <button class="card-btn bookmark-btn" @click=${(e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleBookmark(item);
        }}>
                <span class="material-icons ${isBookmarked ? 'bookmarked' : ''}">star</span>
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
          </div>
          <div class="meta">
            <div class="title">${item.title || ''}</div>
            <div class="author">${item.author || ''}</div>
          </div>
        </div>
      `;
    };

    return html`  <h1>ArticleReader</h1>
  <div class="list-frame" id="listFrame">
    <div class="book-grid" id="bookGrid" role="list">
      ${[...Array(this.pageSize)].map((_, i) => renderCard(displayBooks[i], i))}
    </div>

    <div class="banner-controls">
      <button id="prevBtn" class="banner-btn banner-left"
        ?disabled=${prevDisabled}
        @click=${() => this.handlePrevPage()}
        style="opacity: ${prevOpacity}"
      >
        <span class="material-icons banner-icon">chevron_left</span>
      </button>
      <button id="nextBtn" class="banner-btn banner-right"
        ?disabled=${nextDisabled}
        @click=${() => this.handleNextPage()}
        style="opacity: ${nextOpacity}"
      >
        <span class="material-icons banner-icon">chevron_right</span>
      </button>
    </div>
  </div>

  <form class="goto-section" @submit=${(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const type = formData.get('type');
        const id = formData.get('id');
        const no = formData.get('articleNo');
        const url = `/${type}?boardId=${encodeURIComponent(id)}&articleNo=${encodeURIComponent(no)}`;
        this.navigate(url);
      }}>
    <div class="form-group">
      <h2>GoTo:</h2>
      <select name="type">
        <option value="dc">DCInside</option>
        <option value="arcalive">Arcalive</option>
      </select>
    </div>
    <div class="form-group">
      <input type="text" name="id" placeholder="BoardID" required size="1">
      <input type="text" name="articleNo" placeholder="ArticleNumber" required size="1">
      <button type="submit" class="submit-btn">Go</button>
    </div>
  </form>`;
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
          if (!query.has('articleNo')) {
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
          if (!query.has('articleNo')) {
            window.history.replaceState({}, '', '/arcalive/list' + window.location.search);
          }
          else {
            window.history.replaceState({}, '', '/arcalive/article' + window.location.search);
          }
          return false;
        }
      },
      {
        path: '/arcalive/list',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          const boardId = query.get('boardId');
          return html`<arcalive-list .boardId=${boardId}></arcalive-list>`;
        }
      },
      {
        path: '/arcalive/article',
        render: () => {
          const query = new URLSearchParams(window.location.search);
          const boardId = query.get('boardId');
          const articleNo = query.get('articleNo');
          return html`<arcalive-article .boardId=${boardId} .articleNo=${articleNo}></arcalive-article>`;
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