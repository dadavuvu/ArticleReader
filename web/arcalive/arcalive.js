document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URL(window.location.href).searchParams;
  if (!urlParams.has('channelId')) return document.write("MISSING_PARAMETERS");
  if (!urlParams.has('articleNo') || urlParams.get('articleNo') == "") location.href = `channel.html?channelId=${urlParams.get("channelId")}`
  let data = await fetch(`/proxy/arcalive/${urlParams.get("channelId")}/${urlParams.get("articleNo")}`)
  const parser = new DOMParser();
  data = parser.parseFromString(await data.text(), 'text/html')

  console.log(data)

  if (data.querySelector(".error-code")) return document.write(data.querySelector(".error-code").textContent);

  const content = data.querySelector(".article-content")
  data.querySelector(".article-head>.title-row>.title>.badge").remove()
  document.title = data.querySelector(".article-head>.title-row>.title").textContent

  for (const element of content.querySelectorAll("img")) {
    element.style.cssText = ""
    element.setAttribute("onclick", "")
    element.setAttribute("onerror", "")
    element.setAttribute("alt", "")
    element.src = "/proxy/arcalivecdn/" + element.src

    var div = document.createElement("div");
    div.classList.add("image-container");
    const parent = element.parentNode
    element.parentNode.parentNode.appendChild(div);
    div.appendChild(element);
    parent.remove()
  }

  if (!localStorage.ArticleReaderRecentBooks) localStorage.ArticleReaderRecentBooks = JSON.stringify([]);
  const channelId = urlParams.get("channelId");
  const articleNo = urlParams.get("articleNo");
  let recentBooks = JSON.parse(localStorage.ArticleReaderRecentBooks);
  recentBooks.unshift({
    type: "arcalive",
    channelId,
    articleNo,
    title: document.title,
    author: data.querySelector(".member-info>.user-info>a").textContent,
    thumbnail: null,
    source: "/arcalive/arcalive.html"
  });
  recentBooks = recentBooks.filter((item, index, self) =>
    index === self.findIndex(el => el.boardId === item.boardId && el.articleNo === item.articleNo)
  );

  localStorage.ArticleReaderRecentBooks = JSON.stringify(recentBooks);

  // 썸네일 이미지를 base64로 변환하여 recentBooks[0].thumbnail에 저장
  (async () => {
    const img = content.querySelector("img");
    if (img) {
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = function() {
          recentBooks[0].thumbnail = reader.result;
          localStorage.ArticleReaderRecentBooks = JSON.stringify(recentBooks);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        recentBooks[0].thumbnail = null;
      }
    }
  })();

  for (const element of content.querySelectorAll("a")) {
    if (element.href.indexOf("https://arca.live/b") != -1) {
      element.setAttribute("target", "")
      element.href = `arcalive.html?channelId=${new URL(element.href).pathname.split("/")[1]}&articleNo=${new URL(element.href).pathname.split("/")[2]}`
    }
    if (element.href.indexOf("gall.dcinside.com/mgallery/board/view") != -1) {
      element.setAttribute("target", "")
      const params = new URL(element.href).searchParams
      element.href = `/dcinside.html?boardId=${params.get("id")}&articleNo=${params.get("no")}`
    }
    if (element.href.indexOf("m.dcinside.com/board") != -1 || element.href.indexOf("gall.dcinside.com/m") != -1) {
      element.setAttribute("target", "")
      element.href = `/dcinside.html?boardId=${new URL(element.href).pathname.split("/")[2]}&articleNo=${new URL(element.href).pathname.split("/")[3]}`
    }
  }

  for (let i = 0; i < content.querySelectorAll("*").length; i++) {
    const el = content.querySelectorAll("*")[i];
    const fontSize = parseFloat(el.style.fontSize)

    if (fontSize && !isNaN(fontSize)) {
      const newSize = Math.round(fontSize / 14) * 14;
      console.log(newSize)
      el.style.fontSize = newSize + "px";
    }
  }

  document.querySelector('.content').innerHTML = content.innerHTML

  Loaded()
});