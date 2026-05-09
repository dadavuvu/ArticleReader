import { LitElement, html } from 'lit';
import { fetchHtml } from '/src/cf-bypass.js';
import storage from '/src/storage.js';

/**
 * <arcalive-list> — ArcaLive 글 목록 데이터 프로바이더
 *
 * 역할: 데이터 fetch + 누적 버퍼 관리 + localStorage 연동
 * 뷰 렌더링: <list-view> 위임
 *
 * 버퍼 설계:
 *   _buffer       — 지금까지 fetch한 아이템 전체 누적 배열
 *   _nextApiPage  — 다음에 fetch할 API 페이지 번호
 *   _initialOffset — 복원할 버퍼 시작 인덱스 (localStorage에서 로드)
 *
 * 저장 데이터: { buffer, nextApiPage, hasMore, offset }
 */
export class ArcaliveList extends LitElement {
  static properties = {
    channelId:   { type: String },
    articles:    { type: Array },   // _buffer를 그대로 참조 (반응형 prop)
    channelName: { type: String },
    loading:     { type: Boolean },
    error:       { type: String },
    hasMore:     { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.channelId = '';
    this.articles = [];
    this.channelName = '';
    this.loading = true;
    this.error = null;
    this.hasMore = false;
    this._buffer = [];
    this._nextApiPage = 1;
    this._initialOffset = 0;
    this._initKey = ''; // 중복 초기화 방지
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.channelId) this._initBoard();
  }

  willUpdate(changed) {
    if (changed.has('channelId') && this.channelId) {
      this.articles = [];
      this.loading = true;
      this.error = null;
      this.channelName = '';
      this.hasMore = false;
      this._initBoard();
    }
  }

  _initBoard() {
    // 같은 channelId로 중복 호출 방지
    if (this._initKey === this.channelId) return;
    this._initKey = this.channelId;

    this._buffer = [];
    this._nextApiPage = 1;
    this._initialOffset = 0;

    try {
      const books = JSON.parse(storage.ArticleReaderRecentBooks || '[]');
      const saved = books.find(b => b.isListItem && b.channelId === this.channelId);
      if (saved?.offset) {
        this._initialOffset = saved.offset;
      }
    } catch {}

    // 저장 없음 → 첫 API 페이지 fetch
    this._fetchNextPage();
  }

  async _fetchNextPage() {
    if (this._fetching) return;
    this._fetching = true;
    this.loading = true;
    this.error = null;
    this.requestUpdate();
    try {
      while (true) {
        const baseUrl = `https://arca.live/b/${this.channelId}?p=${this._nextApiPage}`;
        const htmlText = await fetchHtml(baseUrl);
        const parser = new DOMParser();
        const data = parser.parseFromString(htmlText, 'text/html');

        this.channelName =
          data.querySelector('.head > .title')?.textContent?.trim() ||
          this.channelId;

        const items = [];
        const rows = data.querySelectorAll('.article-list > .list-table a.vrow.column');
        for (const row of rows) {
          if (row.classList.contains('notice')) continue;
          const badge = row.querySelector('.badge.badge-success')?.textContent?.trim() || '';
          const titleEl =
            row.querySelector('.title') ||
            row.querySelector('.vcol.col-title');
          if (!titleEl) continue;
          const title = titleEl.childNodes[0]?.textContent?.trim() || titleEl.textContent.trim();
          const author =
            row.querySelector('.user-info > span:nth-child(1)')?.textContent?.trim() ||
            row.querySelector('.user-info')?.textContent?.trim() || '';
          const href = row.getAttribute('href') || '';
          const match = href.match(/\/b\/[^/]+\/(\d+)/);
          const no = match ? match[1] : '';
          if (!no) continue;
          items.push({ no, title, author, badge });
        }

        this.hasMore = items.length >= 20;
        this._buffer = [...this._buffer, ...items];
        this._nextApiPage++;
        this.articles = [...this._buffer];
        
        // initialOffset까지 아이템이 채워질 때까지 혹은 더 이상 데이터가 없을 때까지 루프
        if (this._buffer.length > this._initialOffset || !this.hasMore) {
          break;
        }
      }

      this.loading = false;
      this._saveToRecent(this._initialOffset);
      this.requestUpdate();
    } catch (error) {
      this.error = error.message;
      this.loading = false;
      this.requestUpdate();
    } finally {
      this._fetching = false;
    }
  }

  _saveToRecent(offset) {
    try {
      let books = JSON.parse(storage.ArticleReaderRecentBooks || '[]');
      books = books.filter(b => !(b.isListItem && b.channelId === this.channelId));
      
      // buffer에서 offset 위치의 아이템 정보를 기반으로 정확한 위치를 복구하도록 설계
      books.unshift({
        type: 'arcalive',
        channelId: this.channelId,
        articleNo: '',
        title: this.channelName,
        isListItem: true,
        source: '/arcalive/list',
        offset, // 정확한 아이템 시작 인덱스
      });
      storage.ArticleReaderRecentBooks = JSON.stringify(books);
    } catch (e) {}
  }

  _onOffsetChanged(e) {
    this._saveToRecent(e.detail.offset);
  }

  _navigate(url) {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  render() {
    return html`
      <list-view
        .articles=${this.articles}
        .boardTitle=${this.channelName}
        .hasMore=${this.hasMore}
        .loading=${this.loading}
        .error=${this.error}
        .initialOffset=${this._initialOffset}
        .articleBasePath=${`/arcalive/article?channelId=${encodeURIComponent(this.channelId)}`}
        @load-more=${() => this._fetchNextPage()}
        @offset-changed=${(e) => this._onOffsetChanged(e)}
        @navigate-article=${(e) => this._navigate(e.detail.url)}
      ></list-view>
    `;
  }
}

customElements.define('arcalive-list', ArcaliveList);