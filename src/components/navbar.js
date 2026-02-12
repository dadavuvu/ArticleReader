import { LitElement, html, css } from 'lit';

export class NavBar extends LitElement {
  static properties = {
    navbarOpen: { type: Boolean }
  };

  static styles = css`
    #navbar {
      position: fixed;
      left: 0;
      bottom: -90px;
      width: 100%;
      color: black;
      display: flex;
      justify-content: center;
      padding: 15px 0;
      transition: bottom 0.3s ease-in-out;
      z-index: 10;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(5.1px);
      -webkit-backdrop-filter: blur(5.1px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    #navbar.show {
      bottom: 0;
    }

    #navbar button {
      margin: 0 20px;
      font-size: max-width;
      transition: transform .5s ease, background-color .5s ease;
      background: none;
      border: none;
      cursor: default;
      z-index: 10;
    }

    .black #navbar button {
      color: white;
    }

    .floatingButton {
      position: fixed;
      bottom: 1lh;
      right: 1lh;
      padding: .3lh;
      font-size: 12px;
      cursor: pointer;
      width: 3lh;
      height: 3lh;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(5.1px);
      -webkit-backdrop-filter: blur(5.1px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      z-index: 8;
    }

    .black .floatingButton {
      color: white;
    }

    #untoggleButton {
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.5);
      position: fixed;
      top: 0;
      left: 0;
      border: none;
      z-index: 900;
      overflow: hidden;
    }

    .black #untoggleButton {
      background-color: rgba(0, 0, 0, 0.5);
    }

    #untoggleButton.unshow {
      display: none;
      pointer-events: none;
    }
  `;

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