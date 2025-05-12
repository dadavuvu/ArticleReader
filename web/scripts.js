document.addEventListener('DOMContentLoaded', async function () {
  function setTheme() {
    document.body.className = ""
    document.body.classList.add(window.localStorage.getItem("theme"))
  }

  document.querySelector('#setting').addEventListener('click', function () {
    window.localStorage.setItem("theme", (window.localStorage.getItem("theme") == "white" && "black") || (window.localStorage.getItem("theme") == "black" && "backlight") || "white");
    setTheme()
  });

  setTheme()
});

function Loaded() {
  const content = document.querySelector('.content');

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

  document.querySelector('#prev-web').addEventListener('click', function () {
    history.back();
  });

  document.querySelector('#next-web').addEventListener('click', function () {
    history.forward();
  });

  document.querySelector('#go-root').addEventListener('click', function () {
    location.href = "/"
  });

  document.querySelector(".loading").remove()

  const toggleButton = document.querySelector("#toggleButton");
  const navbar = document.querySelector("#navbar");
  const closeNavbar = document.querySelector("#untoggleButton");
  const main = document.querySelector("main");

  toggleButton.addEventListener("click", () => {
    navbar.classList.toggle("show");
    closeNavbar.classList.toggle("unshow");
    main.classList.toggle("navi");
  });

  closeNavbar.addEventListener("click", () => {
    navbar.classList.remove("show");
    closeNavbar.classList.add("unshow");
    main.classList.remove("navi");
  });

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
}