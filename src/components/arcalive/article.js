import { LitElement, html } from 'lit';
import { Capacitor } from '@capacitor/core';
import { fetchHtml } from '/src/cf-bypass.js';
import storage from '/src/storage.js';

/**
 * <arcalive-article> — ArcaLive 글 상세 데이터 프로바이더
 *
 * 역할: 데이터 fetch + HTML 처리 + localStorage 연동
 * 뷰 렌더링: <article-view> 위임
 * 링크 클릭 처리: article-view 의 위임 핸들러가 담당
 */
export class ArcaliveArticle extends LitElement {
  static properties = {
    channelId:   { type: String },
    articleNo:   { type: String },
    loading:     { type: Boolean },
    error:       { type: String },
    contentHTML: { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.channelId = '';
    this.articleNo = '';
    this.loading = true;
    this.error = null;
    this.contentHTML = '';
    this._title = '';
    this._author = '';
    this._thumbnail = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.channelId && this.articleNo) {
      this.loadArticle();
    }
  }

  willUpdate(changed) {
    if ((changed.has('channelId') || changed.has('articleNo')) &&
        this.channelId && this.articleNo) {
      this.loadArticle();
    }
  }

  async loadArticle() {
    this.loading = true;
    this.error = null;
    this.contentHTML = '';
    this.requestUpdate();
    try {
      const baseUrl = `https://arca.live/b/${this.channelId}/${this.articleNo}`;
      const htmlText = await fetchHtml(baseUrl);
      const parser = new DOMParser();
      const data = parser.parseFromString(htmlText, 'text/html');

      if (data.querySelector('.error-code')) throw new Error('ARTICLE_NOT_FOUND');

      const content = data.querySelector('.article-content');
      if (!content) throw new Error('CONTENT_NOT_FOUND');

      const titleEl = data.querySelector('.article-head .title-row .title');
      titleEl?.querySelector('.badge')?.remove();
      this._title = titleEl?.textContent?.trim() || '';
      this._author = data.querySelector('.member-info .user-info a')?.textContent?.trim() || '';

      const firstImg = content.querySelector('img');
      if (firstImg) {
        let src = firstImg.getAttribute('data-src') || firstImg.getAttribute('src') || '';
        src = this._makeAbsoluteUrl(src);
        this._thumbnail = (src && !Capacitor.isNativePlatform()) ? '/proxy/' + src : src;
      }

      this._saveToRecent();

      this.processImages(content);
      this.processLinks(content);
      this.normalizeFontSizes(content);

      this.contentHTML = content.innerHTML;
      document.title = this._title;
      this.loading = false;
      this.requestUpdate();
    } catch (error) {
      this.error = error.message;
      this.loading = false;
      this.requestUpdate();
    }
  }

  _makeAbsoluteUrl(src) {
    if (!src) return '';
    if (src.startsWith('//')) return 'https:' + src;
    if (src.startsWith('/')) return 'https://arca.live' + src;
    return src;
  }

  _saveToRecent() {
    try {
      let recentBooks = JSON.parse(storage.ArticleReaderRecentBooks || '[]');
      recentBooks.unshift({
        type: 'arcalive',
        channelId: this.channelId,
        articleNo: this.articleNo,
        title: this._title,
        author: this._author,
        thumbnail: this._thumbnail,
        source: '/arcalive/article',
      });
      recentBooks = recentBooks.filter(
        (item, index, self) =>
          index === self.findIndex(
            el => el.channelId === item.channelId && el.articleNo === item.articleNo
          )
      );
      storage.ArticleReaderRecentBooks = JSON.stringify(recentBooks);
    } catch (e) {}
  }

  processImages(content) {
    const isNative = Capacitor.isNativePlatform();
    for (const element of content.querySelectorAll('img')) {
      element.style.cssText = '';
      element.setAttribute('onclick', '');
      element.setAttribute('onerror', '');
      element.setAttribute('alt', '');
      let src = element.getAttribute('data-src') || element.getAttribute('src') || '';
      src = this._makeAbsoluteUrl(src);
      if (src && !isNative) src = '/proxy/' + src;
      if (src) element.src = src;
      const div = document.createElement('div');
      div.classList.add('image-container');
      element.parentNode.insertBefore(div, element.nextSibling);
      div.appendChild(element);
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
      const href = element.getAttribute('href') || '';

      // ArcaLive 내부 링크
      const arcaMatch = href.match(/\/b\/([\w-]+)\/(\d+)/);
      if (arcaMatch && (href.startsWith('/b/') || href.includes('arca.live/b/'))) {
        const newUrl = `/arcalive?channelId=${arcaMatch[1]}&articleNo=${arcaMatch[2]}`;
        element.setAttribute('target', '');
        element.href = newUrl;
        if (visitedLinks.has(newUrl)) element.classList.add('visited');
        continue;
      }

      // DC Inside 링크
      if (element.href.indexOf('gall.dcinside.com/mgallery/board/view') !== -1) {
        element.setAttribute('target', '');
        const params = new URL(element.href).searchParams;
        const newUrl = `/dc?boardId=${params.get('id')}&articleNo=${params.get('no')}`;
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
        .boardId=${this.channelId}
        .articleNo=${this.articleNo}
      ></article-view>
    `;
  }
}

customElements.define('arcalive-article', ArcaliveArticle);