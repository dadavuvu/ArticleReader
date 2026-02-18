// ebook.js
export function initializeLineHeight(container, component) {
  const updateLineHeight = () => {
    const lineHeight = window.innerHeight / 30;
    container.style.setProperty('line-height', `${lineHeight}px`, 'important');
  };
  window.addEventListener('resize', updateLineHeight);
  updateLineHeight();
  return updateLineHeight;
}

export function initializeImages(contentElement, shadowRoot) {
  const styles = window.getComputedStyle(contentElement);
  const lineHeight = parseFloat(styles.lineHeight);

  const imageInitialize = (element) => {
    const img = element.querySelector("img");
    if (!img) return;
    
    const imgHeightLh = Math.ceil(img.height / lineHeight);
    element.style.height = `${imgHeightLh}lh`;

    const containerTop = contentElement.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top;
    const offset = elementTop - containerTop + contentElement.scrollTop;
    const globalLineIndex = Math.floor(offset / lineHeight);
    const pageLine = (globalLineIndex % 25);

    // 페이지 경계에 걸치는 이미지 처리
    if (pageLine + imgHeightLh > 25) {
      element.style.marginTop = `${25 - pageLine}lh`;
    }
  };

  shadowRoot.querySelectorAll(".image-container").forEach(element => {
    const img = element.querySelector("img");
    if (img.complete) {
      imageInitialize(element);
    } else {
      img.onload = () => imageInitialize(element);
    }
  });
}

export function setupPagination(component, contentElement, indicatorElement) {
  let currentPage = 0;
  let hideTimeout;

  const showIndicator = (text) => {
    if (!indicatorElement) return;
    indicatorElement.innerText = text;
    indicatorElement.classList.add("show");
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => indicatorElement.classList.remove("show"), 1000);
  };

  const goToPage = (pageIndex) => {
    const styles = window.getComputedStyle(contentElement);
    const lineHeight = parseFloat(styles.lineHeight);
    const totalPages = Math.ceil(contentElement.scrollHeight / contentElement.clientHeight);
    
    if (pageIndex < 0 || pageIndex >= totalPages) return;

    currentPage = pageIndex;
    contentElement.scrollTo({
      top: currentPage * lineHeight * 25
    });

    if (component.boardId && component.articleNo) {
      const storageKey = 'ArticleReaderBookPageRestore';
      let restoreData = [];
      try {
        restoreData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      } catch (e) {
        restoreData = [];
      }

      const entry = {
        type: 'dcinside',
        boardId: component.boardId,
        articleNo: component.articleNo,
        pageNo: currentPage
      };

      restoreData = restoreData.filter(item => !(item.boardId === entry.boardId && item.articleNo === entry.articleNo));
      restoreData.unshift(entry);
      localStorage.setItem(storageKey, JSON.stringify(restoreData.slice(0, 100)));
    }

    showIndicator(`${currentPage + 1} / ${totalPages}`);
  };

  const handleResize = () => goToPage(currentPage);
  window.addEventListener("resize", handleResize);

  const handleClick = (e) => {
    // Shadow DOM 내부의 클릭 타겟 확인
    const path = e.composedPath();
    const isInteractive = path.some(el => 
      el.tagName === 'A' || el.tagName === 'BUTTON' || (el.id === 'navbar')
    );
    
    if (isInteractive) return;

    if (e.clientX > window.innerWidth / 2) {
      goToPage(currentPage + 1);
    } else {
      goToPage(currentPage - 1);
    }
  };

  component.addEventListener('click', handleClick);

  return { 
    goToPage, 
    cleanup: () => {
      window.removeEventListener("resize", handleResize);
      component.removeEventListener('click', handleClick);
    }
  };
}

export function Loaded(component) {
  const root = component.shadowRoot;
  const content = root.querySelector('.content');
  const indicator = root.querySelector('#page-indicator');

  if (!content) return;

  // 1. 라인 높이 설정
  initializeLineHeight(content, component);
  
  // 2. 이미지 정렬 (이미지 로딩 완료 후 높이 계산)
  initializeImages(content, root);

  // 3. 페이지네이션 설정
  const pagination = setupPagination(component, content, indicator);

  // 4. 저장된 페이지 복구
  const storageKey = 'ArticleReaderBookPageRestore';
  try {
    const restoreData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const entry = restoreData.find(item => 
      item.boardId === component.boardId && 
      item.articleNo === component.articleNo
    );
    if (entry && entry.pageNo > 0) {
      pagination.goToPage(entry.pageNo);
    }
  } catch (e) {}
}

export default { Loaded };