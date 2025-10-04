function Loaded() {
  const content = document.querySelector('.content');

  function updateLineHeight() {
    const element = document.querySelector('body');
    const lineHeight = window.innerHeight / 30;
    element.style.lineHeight = `${lineHeight}px`;
  }

  window.addEventListener('resize', updateLineHeight);
  updateLineHeight();

  const urlParams = new URL(window.location.href).searchParams;
  if (urlParams.has('addbottom')) {
    document.querySelector('main').style.paddingBottom = 2 + Number(urlParams.get("addbottom")) + "lh"
    document.querySelector('#page-indicator').style.bottom = .5 + Number(urlParams.get("addbottom")) + "lh"
  };

  // 현재 페이지 인덱스
  let currentPage = 0;
  let lineHeight = Number(window.getComputedStyle(content).lineHeight.replace("px", ""))

  document.querySelectorAll(".image-container").forEach(element => {
    const img = element.querySelector("img");
    if (img.complete) {
      imageInitalize(element)
    } else {
      img.onload = () => {
        imageInitalize(element)
      }
    }
  });

  function imageInitalize(element) {
    const img = element.querySelector("img");
    const imgHeightLh = Math.ceil(img.height / lineHeight);

    element.style.height = `${imgHeightLh}lh`;
    // const startLine = Math.floor((element.offsetTop - 2 * lineHeight) / lineHeight);

    const containerTop = content.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top;

    const offset = elementTop - containerTop + content.scrollTop;
    const globalLineIndex = Math.floor(offset / lineHeight);

    const pageLine = (globalLineIndex % 26);
    const endPageLine = pageLine + imgHeightLh;
    console.log(element, endPageLine, pageLine)

    if (endPageLine > 26) {
      element.style.marginTop = `${26 - pageLine}lh`;
    }
  }

  // 페이지 넘김 함수
  function goToPage(pageIndex) {
    lineHeight = Number(window.getComputedStyle(content).lineHeight.replace("px", ""))
    const totalPages = Math.ceil(content.scrollHeight / content.clientHeight);
    if (pageIndex < 0 || pageIndex >= totalPages) return;
    currentPage = pageIndex;
    content.scrollTo({
      top: currentPage * lineHeight * 26
    });
    showIndicator(currentPage + 1 + " / " + totalPages)
  }

  window.addEventListener("resize", function () {
    goToPage(currentPage);
  })

  document.querySelector(".loading").remove()

  const pageIndicator = document.querySelector('#page-indicator');

  let hideTimeout;

  const showIndicator = (text) => {
    pageIndicator.innerText = text;
    pageIndicator.classList.add("show")
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => pageIndicator.classList.remove("show"), 1000);
  };

  document.body.addEventListener('click', (e) => {
    let linkClicked = e.target.closest('a') || e.target.closest('button') || e.target.closest('#navbar');
    if (linkClicked) return;

    if (e.clientX > window.innerWidth / 2) {
      goToPage(currentPage + 1);
    } else {
      goToPage(currentPage - 1);
    }
  });
  
  document.querySelector('#nextPage').addEventListener('click', function () {
      goToPage(currentPage + 1);
  });

  document.querySelector('#prevPage').addEventListener('click', function () {
      goToPage(currentPage - 1);
  });
}