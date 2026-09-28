import { LitElement, html } from 'lit';
import storage from '/src/storage.js';

export class TextArticle extends LitElement {
  static properties = {
    textId: { type: String },
    loading: { type: Boolean },
    error: { type: String },
    contentHTML: { type: String },
    title: { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.textId = '';
    this.loading = true;
    this.error = null;
    this.contentHTML = '';
    this.title = '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadText();
  }

  loadText() {
    try {
      const books = JSON.parse(storage.ArticleReaderRecentBooks || '[]');
      const item = books.find(book => book.type === 'text' && book.textId === this.textId);
      if (!item) throw new Error('TEXT_NOT_FOUND');

      this.title = item.title;
      this.contentHTML = `<pre class="text-content">${this.escapeHTML(item.content)}</pre>`;
      document.title = this.title;
      this.error = null;
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  escapeHTML(value) {
    const element = document.createElement('div');
    element.textContent = value;
    return element.innerHTML;
  }

  render() {
    return html`
      <article-view
        .contentHTML=${this.contentHTML}
        .loading=${this.loading}
        .error=${this.error}
      ></article-view>
    `;
  }
}

customElements.define('text-article', TextArticle);
