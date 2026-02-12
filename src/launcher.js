import { LitElement, html, css } from 'lit';
import { Router } from '@lit-labs/router';
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