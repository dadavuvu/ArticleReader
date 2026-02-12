import { LitElement, html, css } from 'lit';

export class NavBar extends LitElement {
  static properties = {
    navbarOpen: { type: Boolean }
  };

  constructor() {
    super();
    this.navbarOpen = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setTheme();
  }

  setTheme() {
    document.body.className = '';
    document.body.classList.add(window.localStorage.getItem('theme') || 'white');
  }

  handleSetting() {
    const currentTheme = window.localStorage.getItem('theme');
    const newTheme = currentTheme === 'white' ? 'black' : 'white';
    window.localStorage.setItem('theme', newTheme);
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

  handleToggleNavbar() {
    this.navbarOpen = !this.navbarOpen;
    document.body.classList[this.navbarOpen ? 'add' : 'remove']('no-scroll');
    this.requestUpdate();
  }

  handleUntoggleNavbar() {
    this.navbarOpen = false;
    document.body.classList[this.navbarOpen ? 'add' : 'remove']('no-scroll');
    this.requestUpdate();
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div id="navbar" class="${this.navbarOpen ? 'show' : ''}">
        <button id="go-root" @click=${() => this.handleGoRoot()}>
          <span class="material-symbols-rounded">logout</span>
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
        <button id="refresh" @click=${() => this.handleRefresh()}>
          <span class="material-symbols-rounded">refresh</span>
        </button>
      </div>
      <button id="toggleButton" class="floatingButton" @click=${() => this.handleToggleNavbar()}>
        <span class="material-symbols-rounded">more_horiz</span>
      </button>
      <button id="untoggleButton" class="${this.navbarOpen ? '' : 'unshow'}" @click=${() => this.handleUntoggleNavbar()}></button>
    `;
  }
}
customElements.define('nav-bar', NavBar);