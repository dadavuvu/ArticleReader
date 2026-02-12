import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CapacitorHttp, Capacitor } from '@capacitor/core';

export class DcArticle extends LitElement {
  static properties = {
    boardId: { type: String },
    articleNo: { type: String },
    title: { type: String },
    author: { type: String },
    thumbnail: { type: String },
    loading: { type: Boolean },
    contentHTML: { type: String }
  };

  static styles = css`
    :host {
      --font-batang: 'KoPubWorld Batang', serif;
      --font-dotum: 'KoPubWorld Dotum', sans-serif;
    }

    :host {
      font-family: var(--font-batang);
      overflow: hidden;
    }

    main {
      position: relative;
      padding: 2lh;
      height: 100vh;
      overflow: hidden;
    }

    :host * {
      touch-action: none;
    }

    :host(.white) a {
      color: black;
    }

    :host(.black),
    :host(.black) a {
      color: white;
    }

    .content {
      height: 100%;
      overflow-y: scroll;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .content::-webkit-scrollbar {
      display: none;
    }

    img {
      width: 100%;
      height: auto;
      display: block;
      margin: 20px 0;
    }

    a {
      display: inline-block;
      margin: 0;
      padding: 0;
    }

    .image-container {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-container > img {
      width: 100%;
      height: auto;
      margin: 0;
    }

    a:link {
      font-family: var(--font-dotum);
      text-decoration: underline;
    }

    .content > *:has(a:link) {
      z-index: 10;
    }

    #page-indicator {
      position: absolute;
      bottom: .5lh;
      left: 50%;
      transform: translateX(-50%);
      background-color: none;
      font-size: .5lh;
      font-family: var(--font-dotum);
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    #page-indicator.show {
      opacity: 1;
      transition: none;
    }

    .error {
      padding: 2lh;
      text-align: center;
      font-size: 1.5lh;
    }

    .loading {
      padding: 2lh;
      text-align: center;
      font-size: 1.5lh;
    }
  `;

  constructor() {
    super();
    this.boardId = '';
    this.articleNo = '';
    this.title = '';
    this.author = '';
    this.thumbnail = '';
    this.loading = true;
    this.contentHTML = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.boardId && this.articleNo) {
      this.loadArticle();
    }
  }
  
  willUpdate(changedProperties) {
    if (changedProperties.has('boardId') || changedProperties.has('articleNo')) {
      this.loadArticle();
    }
  }
  
  async loadArticle() {
    try {
      const url = (!Capacitor.isNativePlatform() ? '/proxy/' : '') + `https://gall.dcinside.com/mgallery/board/view/?id=${this.boardId}&no=${this.articleNo}`
      
      let htmlText;
      try {
        // Capacitor 환경에서 HttpClient 사용
        const response = await CapacitorHttp.get({
          url: url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.3'
          }
        });
        htmlText = response.data;
      } catch (capacitorError) {
        throw new Error(capacitorError);
      }

      const parser = new DOMParser();
      const data = parser.parseFromString(htmlText, 'text/html');

      // 에러 체크
      if (data.querySelector('.delet')) {
        throw new Error('UNKNOWN_GALLERY');
      }
      if (data.head.innerHTML.indexOf('alert("해당 갤러리는 존재하지 않습니다.");') !== -1) {
        throw new Error('UNKNOWN_ARTICLE');
      }

      const content = data.querySelector('.write_div');
      if (!content) throw new Error('CONTENT_NOT_FOUND');

      this.title = (data.querySelector('.title_headtext')?.textContent || '') + 
                   ' ' + 
                   (data.querySelector('.title_subject')?.textContent || '');
      this.author = data.querySelector('.nickname')?.getAttribute('title') || '';
      
      const firstImg = content.querySelector('img');
      this.thumbnail = firstImg ? firstImg.src : '';

      // localStorage에 최근 본 책 저장
      this.saveToRecent(content);

      // 콘텐츠 처리
      this.processImages(content);
      this.removeElements(content, ['.og-div', '#spoiler_warning']);
      this.processSeries(content);
      this.processLinks(content);
      this.normalizeFontSizes(content);

      // 콘텐츠 렌더링
      this.contentHTML = content.innerHTML;
      document.title = this.title;
      this.loading = false;
      this.requestUpdate();
    } catch (error) {
      console.error('Error loading article:', error);
      this.error = error.message;
      this.loading = false;
      this.requestUpdate();
    }
  }

  saveToRecent(content) {
    if (!localStorage.ArticleReaderRecentBooks) {
      localStorage.ArticleReaderRecentBooks = JSON.stringify([]);
    }
    
    const boardId = this.boardId;
    const articleNo = this.articleNo;
    let recentBooks = JSON.parse(localStorage.ArticleReaderRecentBooks);

    recentBooks.unshift({
      type: 'dcinside',
      boardId,
      articleNo,
      title: this.title,
      author: this.author,
      thumbnail: this.thumbnail,
      source: '/dc/article'
    });

    // 중복 제거
    recentBooks = recentBooks.filter(
      (item, index, self) =>
        index === self.findIndex(
          (el) => el.boardId === item.boardId && el.articleNo === item.articleNo
        )
    );

    localStorage.ArticleReaderRecentBooks = JSON.stringify(recentBooks);
  }

  processImages(content) {
    for (const element of content.querySelectorAll('img')) {
      element.style.cssText = '';
      element.setAttribute('onclick', '');
      element.setAttribute('onerror', '');
      element.setAttribute('alt', '');
      
      let imageSource = element.getAttribute('data-original') || element.src;
      
      element.src = imageSource;

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
      for (const br of element.querySelectorAll('br')) {
        br.remove();
      }
    }
  }

  processLinks(content) {
    for (const element of content.querySelectorAll('a')) {
      if (element.href.indexOf('gall.dcinside.com/mgallery/board/view') !== -1) {
        element.setAttribute('target', '');
        const params = new URL(element.href).searchParams;
        const newUrl = `/dc?boardId=${params.get('id')}&articleNo=${params.get('no')}`;
        element.href = newUrl;
        element.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigate(newUrl);
        });
      }
      if (
        element.href.indexOf('m.dcinside.com/board') !== -1 ||
        element.href.indexOf('gall.dcinside.com/m') !== -1
      ) {
        element.setAttribute('target', '');
        const path = new URL(element.href).pathname.split('/');
        const newUrl = `/dc?boardId=${path[2]}&articleNo=${path[3]}`;
        element.href = newUrl;
        element.addEventListener('click', (e) => {
          e.preventDefault();
          this.navigate(newUrl);
        });
      }
    }
  }

  navigate(url) {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  normalizeFontSizes(content) {
    for (let i = 0; i < content.querySelectorAll('*').length; i++) {
      const el = content.querySelectorAll('*')[i];
      const fontSize = parseFloat(el.style.fontSize);

      if (fontSize && !isNaN(fontSize)) {
        const newSize = Math.round(fontSize / 14) * 14;
        el.style.fontSize = newSize + 'px';
      }
    }
  }

  render() {
    if (this.loading) {
      return html`
        <main>
          <div class="loading">Loading...</div>
        </main>
      `;
    }

    if (this.error) {
      return html`
        <main>
          <div class="error">Error: ${this.error}</div>
        </main>
      `;
    }

    window.scrollTo({ top: 0 });

    return html`
      <main>
        <div class="content">${unsafeHTML(this.contentHTML || '')}</div>
        <div id="page-indicator"></div>
      </main>
    `;
  }
}
customElements.define('dc-article', DcArticle);
