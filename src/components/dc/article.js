import { LitElement, html } from 'lit';
import { fetchHtml } from '/src/cf-bypass.js';
import storage from '/src/storage.js';

/**
 * <dc-article> — DC Inside 글 상세 데이터 프로바이더
 *
 * 역할: 데이터 fetch + HTML 처리 + localStorage 연동
 * 뷰 렌더링: <article-view> 위임
 * 링크 클릭 처리: article-view 의 위임 핸들러가 담당
 */
export class DcArticle extends LitElement {
  static properties = {
    boardId:     { type: String },
    articleNo:   { type: String },
    loading:     { type: Boolean },
    error:       { type: String },
    contentHTML: { type: String },
    errorHTML:   { type: String },
    errorURL:    { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.boardId = '';
    this.articleNo = '';
    this.loading = true;
    this.error = null;
    this.contentHTML = '';
    this.errorHTML = '';
    this.errorURL = '';
    this._title = '';
    this._author = '';
    this._thumbnail = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.boardId && this.articleNo) {
      this.loadArticle();
    }
  }

  willUpdate(changed) {
    if ((changed.has('boardId') || changed.has('articleNo')) &&
        this.boardId && this.articleNo) {
      this.loadArticle();
    }
  }

  async loadArticle() {
    this.loading = true;
    this.error = null;
    this.contentHTML = '';
    this.errorHTML = '';
    this.errorURL = '';
    this.requestUpdate();
    const baseUrl = `https://gall.dcinside.com/mgallery/board/view/?id=${this.boardId}&no=${this.articleNo}`;
    let responseHTML = '';
    try {
      responseHTML = await fetchHtml(baseUrl);
      const redirectUrl = this.getDcRedirectUrl(responseHTML);
      if (redirectUrl) {
        responseHTML = await fetchHtml(redirectUrl);
      }
      const parser = new DOMParser();
      const data = parser.parseFromString(responseHTML, 'text/html');

      if (data.querySelector('.delet')) throw new Error('UNKNOWN_GALLERY');
      if (data.head.innerHTML.indexOf('alert("해당 갤러리는 존재하지 않습니다.");') !== -1)
        throw new Error('UNKNOWN_ARTICLE');

      const content = data.querySelector('.write_div');
      if (!content) throw new Error('CONTENT_NOT_FOUND');

      this._title =
        (data.querySelector('.title_headtext')?.textContent || '') + ' ' +
        (data.querySelector('.title_subject')?.textContent || '');
      this._author = data.querySelector('.nickname')?.getAttribute('title') || '';

      const firstImg = content.querySelector('img');
      this._thumbnail = firstImg ? firstImg.src : '';

      this._saveToRecent();

      this.processImages(content);
      this.removeElements(content, ['.og-div', '#spoiler_warning']);
      this.processSeries(content);
      this.processLinks(content);
      this.normalizeFontSizes(content);

      this.contentHTML = content.innerHTML;
      document.title = this._title;
      this.loading = false;
      this.requestUpdate();
    } catch (error) {
      this.error = error.message;
      if (error.message === 'CONTENT_NOT_FOUND') {
        this.errorHTML = responseHTML;
        this.errorURL = baseUrl;
      }
      this.loading = false;
      this.requestUpdate();
    }
  }

  getDcRedirectUrl(responseHTML) {
    const match = responseHTML.match(
      /location\.replace\(\s*["'](https:\/\/gall\.dcinside\.com\/board\/view[^"']*)["']\s*\)/i
    );
    return match ? match[1] : '';
  }

  _saveToRecent() {
    try {
      let recentBooks = JSON.parse(storage.ArticleReaderRecentBooks || '[]');
      recentBooks.unshift({
        type: 'dcinside',
        boardId: this.boardId,
        articleNo: this.articleNo,
        title: this._title,
        author: this._author,
        thumbnail: this._thumbnail,
        source: '/dc/article',
      });
      recentBooks = recentBooks.filter(
        (item, index, self) =>
          index === self.findIndex(
            el => el.boardId === item.boardId && el.articleNo === item.articleNo
          )
      );
      storage.ArticleReaderRecentBooks = JSON.stringify(recentBooks);
    } catch (e) {}
  }

  processImages(content) {
    for (const element of content.querySelectorAll('img')) {
      element.style.cssText = '';
      element.setAttribute('onclick', '');
      element.setAttribute('onerror', '');
      element.setAttribute('alt', '');
      element.src = element.getAttribute('data-original') || element.src;
      const div = document.createElement('div');
      div.classList.add('image-container');
      element.parentNode.insertBefore(div, element.nextSibling);
      div.appendChild(element);
    }
  }

  removeElements(content, selectors) {
    for (const selector of selectors) {
      for (const element of content.querySelectorAll(selector)) {
        element.remove();
      }
    }
  }

  processSeries(content) {
    for (const element of content.querySelectorAll('.dc_series')) {
      element.style = 'box-shadow: inset 0 0 2px;padding:0 .5lh;border-radius:.5lh';
      for (const br of element.querySelectorAll('br')) br.remove();
    }
  }

  getVisitedLinks() {
    try {
      return new Set(JSON.parse(storage.ArticleReaderVisitedLinks || '[]'));
    } catch { return new Set(); }
  }

  // href 변환만 수행. 클릭 처리는 article-view 위임 핸들러에서 담당.
  processLinks(content) {
    const visitedLinks = this.getVisitedLinks();
    for (const element of content.querySelectorAll('a')) {
      if (element.href.indexOf('gall.dcinside.com/mgallery/board/view') !== -1) {
        element.setAttribute('target', '');
        const params = new URL(element.href).searchParams;
        const newUrl = `/dc?boardId=${params.get('id')}&articleNo=${params.get('no')}`;
        element.href = newUrl;
        if (visitedLinks.has(newUrl)) element.classList.add('visited');
      }
      if (
        element.href.indexOf('m.dcinside.com/board') !== -1 ||
        element.href.indexOf('gall.dcinside.com/m') !== -1
      ) {
        element.setAttribute('target', '');
        const path = new URL(element.href).pathname.split('/');
        const newUrl = `/dc?boardId=${path[2]}&articleNo=${path[3]}`;
        element.href = newUrl;
        if (visitedLinks.has(newUrl)) element.classList.add('visited');
      }
    }
  }

  normalizeFontSizes(content) {
    for (const el of content.querySelectorAll('*')) {
      const fontSize = parseFloat(el.style.fontSize);
      if (fontSize && !isNaN(fontSize)) {
        el.style.fontSize = Math.round(fontSize / 14) * 14 + 'px';
      }
    }
  }

  render() {
    return html`
      <article-view
        .contentHTML=${this.contentHTML}
        .loading=${this.loading}
        .error=${this.error}
        .errorHTML=${this.errorHTML}
        .errorURL=${this.errorURL}
        .boardId=${this.boardId}
        .articleNo=${this.articleNo}
      ></article-view>
    `;
  }
}

customElements.define('dc-article', DcArticle);