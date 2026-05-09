import { LitElement, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import ebook from '/src/ebook.js';
import storage from '/src/storage.js';

/**
 * <article-view> — 순수 뷰 컴포넌트
 *
 * Props (데이터 프로바이더에서 전달):
 *   contentHTML  String — 이미 처리된 HTML
 *   loading      Boolean
 *   error        String
 *   boardId      String — ebook.js 페이지 저장용
 *   articleNo    String — ebook.js 페이지 저장용
 *
 * 기능:
 *   - ebook.js 페이지네이션 (좌/우 탭으로 페이지 넘기기)
 *   - 내부 앱 링크(/dc, /arcalive) 클릭 위임 처리
 *   - --vh CSS 변수 업데이트
 */
export class ArticleView extends LitElement {
  static properties = {
    contentHTML: { type: String },
    loading:     { type: Boolean },
    error:       { type: String },
    boardId:     { type: String },
    articleNo:   { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.contentHTML = '';
    this.loading = false;
    this.error = null;
    this.boardId = '';
    this.articleNo = '';
    this._ebookController = null;
  }

  _updateVh = () => {
    const vh = window.innerHeight * 0.01;
    this.style.setProperty('--vh', `${vh}px`);
  };

  connectedCallback() {
    super.connectedCallback();
    this._updateVh();
    window.addEventListener('resize', this._updateVh);
    window.addEventListener('orientationchange', this._updateVh);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this._updateVh);
    window.removeEventListener('orientationchange', this._updateVh);
    if (this._ebookController) this._ebookController.cleanup();
  }

  async updated(changedProperties) {
    if (changedProperties.has('contentHTML') && this.contentHTML && !this.loading) {
      const content = this.querySelector('.content');
      if (content) content.scrollTop = 0;
      if (this._ebookController) this._ebookController.cleanup();
      await this.updateComplete;
      this._ebookController = ebook.Loaded(this);
    }
  }

  // 앱 내부 링크 클릭 위임 처리
  _handleContentClick(e) {
    const anchor = e.composedPath().find(el => el.tagName === 'A');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    // /dc 또는 /arcalive 로 시작하는 앱 내부 링크만 처리
    if (href.startsWith('/dc') || href.startsWith('/arcalive')) {
      e.preventDefault();
      this._saveVisitedLink(href);
      anchor.classList.add('visited');
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  _saveVisitedLink(url) {
    try {
      const visited = new Set(JSON.parse(storage.ArticleReaderVisitedLinks || '[]'));
      visited.add(url);
      storage.ArticleReaderVisitedLinks = JSON.stringify([...visited]);
    } catch (e) {}
  }

  render() {
    if (this.loading) {
      return html`<main></main>`;
    }
    if (this.error) {
      return html`<main><div class="error">Error: ${this.error}</div></main>`;
    }
    return html`
      <main @click=${this._handleContentClick}>
        <div class="content">${unsafeHTML(this.contentHTML || '')}</div>
        <div id="page-indicator"></div>
      </main>
    `;
  }
}

customElements.define('article-view', ArticleView);
