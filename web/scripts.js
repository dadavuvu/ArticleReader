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
        document.querySelector('main').style.paddingBottom = 2+Number(urlParams.get("addbottom"))+"lh"
    };

    // 이미지 컨테이너 크기 위치 조절
    const vh = document.body.clientHeight
    const lh = vh / 30

    document.querySelectorAll(".image-container").forEach(element => {
        element.style.height = `${Math.ceil(element.querySelector("img").height / lh)}lh`
        let startBasedLine = Math.floor(element.offsetTop / lh)-2
        let startBasedPageLine = startBasedLine%26
        let endBasedLine = startBasedLine + Math.ceil(element.querySelector("img").height / lh)
        let endBasedPageLine = endBasedLine%26

        if (startBasedPageLine > endBasedPageLine) {
            element.style.marginTop = startBasedPageLine+endBasedPageLine-26 + "lh"
        }
        else if (Math.ceil(element.querySelector("img").height / lh) >= 26) {
            element.style.marginTop = 25-startBasedPageLine + "lh"
        }
        console.log(startBasedLine, endBasedLine, startBasedPageLine, endBasedPageLine, startBasedLine+Math.ceil(element.querySelector("img").height / lh))
    });

    // 현재 페이지 인덱스
    let currentPage = 0;

    // 페이지 넘김 함수
    function goToPage(pageIndex) {
        const lineHeight = Number(window.getComputedStyle(content).lineHeight.replace("px", ""))
        const totalPages = Math.ceil(content.scrollHeight / content.clientHeight);
        if (pageIndex < 0 || pageIndex >= totalPages) return;
        currentPage = pageIndex;
        content.scrollTo({
            top: currentPage * lineHeight * (30 - Number(urlParams.get("addbottom")))
        });
    }

    // 버튼 클릭 이벤트 핸들러
    document.querySelector('#prev-page').addEventListener('click', function () {
        goToPage(currentPage - 1);
    });

    document.querySelector('#next-page').addEventListener('click', function () {
        goToPage(currentPage + 1);
    });

    document.querySelector('#prev-web').addEventListener('click', function () {
        history.back();
    });

    document.querySelector('#next-web').addEventListener('click', function () {
        history.forward();
    });

    document.querySelector('#go-root').addEventListener('click', function () {
        location.href = "/"
    });

    let clickable = false
    document.querySelector('#click').addEventListener('click', function () {
        clickable = !clickable
        document.querySelector('#next-page').style.display = clickable && "none" || ""
        document.querySelector('#prev-page').style.display = clickable && "none" || ""
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
}