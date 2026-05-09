import { LitElement, html, css } from 'lit';
import storage from '/src/storage.js';

export class NavBar extends LitElement {
  static properties = {
    navbarOpen: { type: Boolean }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.setTheme();
  }

  setTheme() {
    document.body.className = '';
    document.body.classList.add(storage.getItem('theme') || 'white');
  }

  handleSetting() {
    const currentTheme = storage.getItem('theme');
    const newTheme = currentTheme === 'white' ? 'black' : 'white';
    storage.setItem('theme', newTheme);
    this.setTheme();
  }

  handleGoRoot() {
    window.history.pushState({}, '', "/");
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handlePrevWeb() {
    window.history.back();
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handleNextWeb() {
    window.history.forward();
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  handleRefresh() {
    window.location.reload();
  }

  createRenderRoot() {
    return this;
  }
  
  render() {
    return html`
      <div id="navbar">
        <button id="refresh" @click=${() => this.handleRefresh()}>
          <span class="material-symbols-rounded">refresh</span>
        </button>
        <button id="go-root" @click=${() => this.handleGoRoot()}>
          <span class="material-symbols-rounded">home</span>
        </button>
        <button id="prev-web" @click=${() => this.handlePrevWeb()}>
          <span class="material-symbols-rounded">arrow_back_ios_new</span>
        </button>
        <button id="next-web" @click=${() => this.handleNextWeb()}>
          <span class="material-symbols-rounded">arrow_forward_ios</span>
        </button>
        <button id="setting" @click=${() => this.handleSetting()}>
          <span class="material-symbols-rounded">format_paint</span>
        </button>
      </div>`;
  }
}
customElements.define('nav-bar', NavBar);