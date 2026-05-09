import { LitElement, html } from 'lit';
import storage from '/src/storage.js';

/**
 * <list-view> — 순수 뷰 컴포넌트
 *
 * Props (데이터 프로바이더에서 전달):
 *   articles        Array<{no, title, author, badge?}> — 누적 아이템 버퍼 전체
 *   boardTitle      String — 갤러리/채널명
 *   hasMore         Boolean — API에서 더 가져올 페이지 존재 여부
 *   loading         Boolean
 *   error           String
 *   initialOffset   Number — 복원할 버퍼 시작 인덱스 (기본 0)
 *   articleBasePath String — e.g. "/dc/article?boardId=xxx"
 *
 * 내부 상태:
 *   _offset     — 현재 표시 시작 인덱스 (버퍼 기준)
 *   _pageSize   — ResizeObserver로 동적 계산
 *   visitedUrls — localStorage에서 로드
 *
 * 페이지 이동 로직:
 *   다음: 버퍼에 다음 슬라이스가 있으면 즉시 이동,
 *         없으면 load-more 이벤트 → 데이터 프로바이더가 API 호출 후 버퍼 추가
 *   이전: 버퍼 내 이전 슬라이스로 이동 (버퍼는 누적이므로 항상 가능)
 *
 * Events:
 *   load-more       {} — 더 가져올 아이템이 필요할 때
 *   offset-changed  {offset: number} — 페이지 이동 시 (저장용)
 *   navigate-article {url: string} — 글 클릭 시
 */
export class ListView extends LitElement {
  static properties = {
    articles:        { type: Array },
    boardTitle:      { type: String },
    hasMore:         { type: Boolean },
    loading:         { type: Boolean },
    error:           { type: String },
    initialOffset:   { type: Number },
    articleBasePath: { type: String },
    // 내부 상태 (state: true → 렌더 트리거, 외부 노출 안 함)
    _offset:     { type: Number, state: true },
    _pageSize:   { type: Number, state: true },
    visitedUrls: { type: Object, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.articles = [];
    this.boardTitle = '';
    this.hasMore = false;
    this.loading = false;
    this.error = null;
    this.initialOffset = 0;
    this.articleBasePath = '';
    this._offset = 0;
    this._pageSize = 15;
    this._pendingNext = false; // load-more 요청 후 오프셋 전진 대기 플래그 (비반응형)
    this.visitedUrls = new Set();
    this._resizeObserver = null;
  }

  // initialOffset 변경 시 내부 오프셋 동기화 (게시판 변경 시 데이터 프로바이더가 새 값 전달)
  willUpdate(changed) {
    if (changed.has('initialOffset')) {
      this._offset = this.initialOffset || 0;
      this._pendingNext = false;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadVisited();
    this._setupResizeObserver();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(() => this._calcPageSize());
    this._resizeObserver.observe(this);
    this._calcPageSize();
  }

  _calcPageSize() {
    const totalH = this.offsetHeight;
    if (!totalH) return;
    const lh = parseFloat(getComputedStyle(this).lineHeight) || 14;
    const header = this.querySelector('.list-header');
    const pagination = this.querySelector('.pagination');
    const usedH = (header?.offsetHeight ?? lh * 2) + (pagination?.offsetHeight ?? lh * 4.5);
    const itemH = lh * 3;
    const size = Math.max(5, Math.floor((totalH - usedH) / itemH));
    if (size !== this._pageSize) this._pageSize = size;
  }

  _loadVisited() {
    try {
      this.visitedUrls = new Set(JSON.parse(storage.ArticleReaderVisitedLinks || '[]'));
    } catch {
      this.visitedUrls = new Set();
    }
  }

  _saveVisited(url) {
    this.visitedUrls.add(url);
    storage.ArticleReaderVisitedLinks = JSON.stringify([...this.visitedUrls]);
    this.visitedUrls = new Set(this.visitedUrls); // 참조 교체로 리렌더 트리거
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  _goToArticle(no) {
    const url = `${this.articleBasePath}&articleNo=${encodeURIComponent(no)}`;
    this._saveVisited(url);
    this._emit('navigate-article', { url });
  }

  prevPage() {
    if (this.loading || this._pendingNext || this._offset === 0) return;
    this._offset = Math.max(0, this._offset - this._pageSize);
    this._emit('offset-changed', { offset: this._offset });
  }

  nextPage() {
    if (this.loading || this._pendingNext) return;
    const articles = this.articles || [];
    const nextOffset = this._offset + this._pageSize;
    if (nextOffset < articles.length) {
      // 버퍼에 다음 슬라이스 존재 → 즉시 이동
      this._offset = nextOffset;
      this._emit('offset-changed', { offset: this._offset });
    } else if (this.hasMore) {
      // 버퍼 부족 → API 추가 호출 요청, 완료 후 updated()에서 오프셋 전진
      this._pendingNext = true;
      this._emit('load-more', {});
    }
  }

  // 렌더 후 처리: 대기 중인 다음 페이지 이동 + 잘린 아이템 처리 + 부족한 아이템 채우기
  updated() {
    if (this._pendingNext && !this.loading) {
      const articles = this.articles || [];
      const nextOffset = this._offset + this._pageSize;
      if (nextOffset < articles.length) {
        // 새 아이템이 버퍼에 추가됨 → 오프셋 전진
        this._pendingNext = false;
        this._offset = nextOffset;
        this._emit('offset-changed', { offset: this._offset });
      } else {
        // 더 이상 아이템 없음 (오류 등)
        this._pendingNext = false;
      }
    }
    this._trimClippedItems();
    this._autoFillIfNeeded();
  }

  // 표시할 아이템 수가 pageSize보다 적으면 자동으로 다음 API 페이지 호출
  _autoFillIfNeeded() {
    if (this.loading || !this.hasMore || this._pendingNext) return;
    const articles = this.articles || [];
    const displayedCount = Math.min(this._pageSize, articles.length - this._offset);
    
    // 현재 표시되는 아이템이 부족하고 가져올 데이터가 더 있으면 호출
    if (displayedCount < this._pageSize && this.hasMore) {
      this._emit('load-more', {});
    }
  }

  _trimClippedItems() {
    const container = this.querySelector('.articles');
    if (!container) return;
    const items = container.querySelectorAll('.article-item');
    if (!items.length) return;
    const lastItem = items[items.length - 1];
    const containerBottom = container.getBoundingClientRect().bottom;
    const lastItemBottom = lastItem.getBoundingClientRect().bottom;
    // 1px 이상 잘리면 pageSize 축소 (sub-pixel 오차 허용)
    if (lastItemBottom > containerBottom + 1) {
      this._pageSize = Math.max(1, this._pageSize - 1);
    }
  }

  get _prevDisabled() { return this._offset === 0; }
  get _nextDisabled()  {
    const articles = this.articles || [];
    return this._offset + this._pageSize >= articles.length && !this.hasMore;
  }
  get _uiPage() { 
    if (this._pageSize <= 0) return 1;
    return Math.floor(this._offset / this._pageSize) + 1; 
  }

  render() {
    // 버퍼가 비어 있는 초기 로딩만 전체 화면 스피너 표시
    // load-more 대기 중(_pendingNext)에는 현재 아이템을 유지하며 버튼만 비활성화
    if (this.loading && (this.articles || []).length === 0) {
      return html`<div class="list-page"></div>`;
    }
    if (this.error) {
      return html`<div class="list-page"><div class="status">Error: ${this.error}</div></div>`;
    }

    const displayItems = (this.articles || []).slice(this._offset, this._offset + this._pageSize);

    return html`
      <div class="list-page">
        <div class="list-header">
          <div class="board-title">${this.boardTitle}</div>
        </div>
        <div class="articles">
          ${displayItems.map(item => {
            const url = `${this.articleBasePath}&articleNo=${encodeURIComponent(item.no)}`;
            const visited = this.visitedUrls.has(url);
            return html`
              <div class="article-item ${visited ? 'visited' : ''}"
                   @click=${() => this._goToArticle(item.no)}>
                <div class="article-title">
                  ${item.badge ? html`<span class="badge">${item.badge}</span> ` : ''}${item.title}
                </div>
                <div class="article-meta">
                  <span class="article-no">#${item.no}</span>
                  <span class="article-author">${item.author}</span>
                </div>
              </div>`;
          })}
          ${displayItems.length === 0
            ? html`<div class="status">글이 없습니다.</div>`
            : ''}
        </div>
        <div class="pagination">
          <button class="page-btn" ?disabled=${this._prevDisabled}
                  @click=${() => this.prevPage()}><span class="material-symbols-rounded">chevron_left</span></button>
          <span class="page-info">${this._uiPage}</span>
          <button class="page-btn" ?disabled=${this._nextDisabled || this._pendingNext}
                  @click=${() => this.nextPage()}><span class="material-symbols-rounded">chevron_right</span></button>
        </div>
      </div>
    `;
  }
}

customElements.define('list-view', ListView);
